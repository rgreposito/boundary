"""Policy is deterministic. Execution authority never comes from model output.

This reference is single-process. The lock protects approval consumption and
reservation; a production implementation needs a transactional shared store.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import math
import secrets
import threading
import time
from dataclasses import asdict, dataclass
from typing import Callable

VERSION = "2026.10.1"
TOOLS = frozenset({"knowledge.search", "incident.read", "incident.contain"})
LIMIT = 0.50


def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


@dataclass(frozen=True)
class Action:
    request_id: str
    agent: str
    tenant: str
    resource_tenant: str
    tool: str
    target: str
    estimated_cost: float
    sensitive: bool = False

    def fingerprint(self) -> str:
        return hashlib.sha256(canonical({"action": asdict(self), "policy": VERSION})).hexdigest()


@dataclass(frozen=True)
class Decision:
    verdict: str
    rule: str


def evaluate(action: Action) -> Decision:
    if action.tenant != action.resource_tenant:
        return Decision("deny", "tenant.isolation")
    if not math.isfinite(action.estimated_cost) or action.estimated_cost < 0:
        return Decision("deny", "input.cost")
    if action.estimated_cost > LIMIT:
        return Decision("deny", "budget.per_action")
    if action.tool not in TOOLS:
        return Decision("deny", "tool.allowlist")
    if action.sensitive or action.tool == "incident.contain":
        return Decision("review", "human.approval")
    return Decision("allow", "capability.read")


class Audit:
    """Hash-linked metadata, NOT a trusted external ledger.

    A stored external anchor is required to detect suffix truncation. No prompt,
    target or response body is recorded. Caller owns durable persistence.
    """
    def __init__(self) -> None:
        self.entries: list[dict] = []

    def append(self, request_id: str, event: str, rule: str) -> None:
        previous = self.entries[-1]["hash"] if self.entries else "0" * 64
        row = {"sequence": len(self.entries), "request_id": request_id,
               "event": event, "rule": rule, "previous": previous}
        row["hash"] = hashlib.sha256(canonical(row)).hexdigest()
        self.entries.append(row)

    def verify(self, anchor: str | None = None) -> bool:
        previous = "0" * 64
        for index, row in enumerate(self.entries):
            body = {key: value for key, value in row.items() if key != "hash"}
            try:
                digest = hashlib.sha256(canonical(body)).hexdigest()
            except (ValueError, TypeError):
                return False
            if row.get("sequence") != index or row.get("previous") != previous or row.get("hash") != digest:
                return False
            previous = digest
        return anchor is None or hmac.compare_digest(previous, anchor)


@dataclass(frozen=True)
class Approval:
    fingerprint: str
    expires_at: float


class Gate:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self.clock = clock
        self.audit = Audit()
        self._approvals: dict[str, Approval] = {}
        self._started: set[str] = set()
        self._lock = threading.Lock()

    def approve(self, action: Action, *, approver: str, approver_tenant: str,
                role: str, ttl: float = 60) -> str:
        # Approver identity and role MUST come from trusted authentication.
        # These arguments are intentionally explicit adapter inputs, not auth.
        if role != "operator" or approver_tenant != action.tenant or approver == action.agent:
            raise PermissionError("Independent same-tenant operator required")
        if evaluate(action).verdict != "review":
            raise PermissionError("Only reviewable actions can be approved")
        if not math.isfinite(ttl) or not 0 < ttl <= 300:
            raise ValueError("Approval TTL must be in (0, 300] seconds")
        with self._lock:
            token = secrets.token_urlsafe(32)
            self._approvals[token] = Approval(action.fingerprint(), self.clock() + ttl)
            self.audit.append(action.request_id, "approved", "human.approval")
            return token

    def execute(self, action: Action, executor: Callable[[Action], object],
                approval: str | None = None) -> object:
        with self._lock:
            decision = evaluate(action)
            if decision.verdict == "deny":
                self.audit.append(action.request_id, "denied", decision.rule)
                raise PermissionError(decision.rule)
            if decision.verdict == "review":
                grant = self._approvals.get(approval or "")
                if grant is None or self.clock() >= grant.expires_at or not hmac.compare_digest(grant.fingerprint, action.fingerprint()):
                    self.audit.append(action.request_id, "denied", "approval.invalid")
                    raise PermissionError("Missing, expired or action-mismatched approval")
            if action.request_id in self._started:
                raise PermissionError("Request already reserved; reconcile instead of retrying")
            if decision.verdict == "review":
                self._approvals.pop(approval or "")
            # Reserve BEFORE calling a side-effecting tool. Failures are not retried
            # because the remote side effect may already have happened.
            self._started.add(action.request_id)
            self.audit.append(action.request_id, "reserved", decision.rule)
        try:
            result = executor(action)
        except Exception:
            with self._lock:
                self.audit.append(action.request_id, "failed", "executor.failure")
            raise
        with self._lock:
            self.audit.append(action.request_id, "completed", decision.rule)
        return result
