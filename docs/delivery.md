# Delivery and operating model

A useful first deployment protects one incident-response workflow. It does not
begin by installing a universal platform across every engineering team.

## Stage 1 — Observe a read-only pilot

One platform engineer owns the trusted adapter and policy integration. One
security engineer reviews tenant ownership and attack cases. The workflow owner
supplies realistic actions, failure modes and operator expectations.

Exit criteria: all calls pass through the gate; no unauthorized route around it;
fixtures match actual resources; audit can be correlated with tool outcomes.
Observe decisions, but do not claim enforcement until bypass tests pass.

## Stage 2 — Enforce reads, keep writes disabled

Introduce durable decisions and reservations. Test restart, store outage and
cross-replica races. Make adapter ownership explicit in code review. Document
exception requests; never add a model-controlled “skip policy” flag.

Exit criteria: denied actions produce zero remote calls; store unavailability
blocks dispatch; policy rollout has a tested previous-version rollback path.

## Stage 3 — Enable one approval-bound write

Add authenticated operator approval, provider idempotency and the reconciliation
runbook. Run failure drills with the on-call team before permitting containment.

Exit criteria: action mutation and replay are rejected across replicas; ambiguous
outcomes enter reconciliation; operator authorization is checked at approval.

## Measures worth collecting

- Unauthorized dispatch count: target zero; page immediately on any occurrence.
- Gate availability: proposed 99.9% monthly, with fail-closed outages measured
  separately from agent/provider failures.
- Policy latency: proposed p95 under 20 ms excluding remote calls, to be measured
  against the chosen durable store. This is a design target, not a benchmark.
- Approval wait: monitor distribution and queue age; avoid hiding human delay
  inside a single “AI latency” metric.
- Cost per resolved incident: include model, tool and operator effort. Estimated
  per-action limits in this reference are insufficient for FinOps accounting.

## Ownership and change discipline

Platform owns availability and adapter contracts. Security owns control intent
and adversarial acceptance criteria. Workflow owners own business-side effects.
Approval operators need neither permission to edit policy nor platform-admin
access. Policy changes require two-party review, versioning and recorded rollout.

Do not split this into five microservices until a scaling or ownership boundary
justifies it. The first durable service can retain the same explicit modules.
