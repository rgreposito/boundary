# Architecture notes

## ADR-001: Policy before orchestration

**Decision:** the engine accepts a typed action, not arbitrary agent code.
Orchestration libraries can call it through an adapter; none is required here.

**Why:** a policy boundary should remain understandable when the agent framework
changes. A framework-specific callback is too easy to bypass accidentally.

**Cost:** adapters must authenticate the principal, resolve the resource tenant,
and estimate cost. An adapter mistake can defeat otherwise correct evaluation.

## ADR-002: Deny beats approval

Evaluation order is tenant → cost shape → cost ceiling → tool registration →
sensitivity. Operators cannot approve a cross-tenant request or unregistered tool.
Approval grants authority for one fingerprint, not a blanket agent exemption.

**Rejected:** risk scores with a single threshold. A high-confidence model output
cannot compensate for missing authorization. The rules are deterministic and
independently testable.

## ADR-003: Reservation before dispatch

The gate serializes validation, approval consumption, request reservation and
audit append under one lock; the tool itself runs outside that lock.

This provides at-most-once dispatch for a request ID within the life of one
process. It does not provide exactly-once remote effects. If a remote call fails
without a trustworthy response, the request remains reserved for reconciliation.

**Production change:** transactional database reservation and durable outbox.
The tool adapter also needs an idempotency key accepted by the remote provider.
A lease without remote idempotency can still duplicate an effect after expiry.

## ADR-004: Python core, TypeScript mirror

Python keeps the enforcement reference small and easy to integrate with agent
workloads. TypeScript drives the operator experience without a cloud dependency.
The mirror covers evaluation only, not approval tokens or execution authority.
Both share the version identifier and concrete tests; they are not a generated
single source of truth. Cross-language fixture conformance is a next step.

## ADR-005: Metadata-only audit

Request identifiers, events, policy rules and sequence are recorded. Prompts,
responses, targets and credentials are not. This reduces audit-store exposure
and avoids turning observability into a second sensitive data lake.

A hash chain detects edits given a trusted head. An attacker who owns the store
can rewrite the chain or remove its suffix. Production needs external anchoring,
restricted append permissions, retention policy and durable storage.

## Non-goals

The gate is not an IAM system, an LLM, a Linux sandbox, or a universal DLP engine.
It does not infer tenant ownership from untrusted resource names. The trusted
adapter must fetch ownership from an authoritative store before constructing
an immutable `Action`.
