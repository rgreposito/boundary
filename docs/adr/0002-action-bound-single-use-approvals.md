# ADR 0002 — Approvals bind to the whole action and are single-use

Status: accepted

## Context

"Approve containment for host X" is a common approval prompt. If the approval
is keyed only by request ID, an agent (or a compromised caller) can approve a
harmless action and then mutate target, estimate or tool before execution.

## Decision

An approval stores a fingerprint of the canonical, immutable action plus the
policy version. It expires after a short TTL, requires an approver who is not
the requester and belongs to the same tenant, and is consumed in the same
locked critical section that reserves execution.

## Consequences

- Any mutation after approval invalidates it; tests cover target, estimate and
  request-ID changes, replay and expiry.
- Approvals are in-memory in the reference. A real deployment needs a durable,
  transactional store; this is called out in the threat model rather than faked.
