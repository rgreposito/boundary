# ADR 0003 — Ambiguous tool failures are not retried automatically

Status: accepted

## Context

When an adapter times out, the side effect may or may not have happened.
Retrying "isolate endpoint" or "rotate credential" blindly can double-apply an
irreversible action, and a retry loop is exactly what an agent framework tends
to add by default.

## Decision

The gate reserves a request ID before dispatch. On failure the reservation is
kept and the action is marked for reconciliation; it is never re-dispatched
automatically. An operator follows the [runbook](../runbook.md) to confirm the
real state with the target system before closing or re-submitting.

## Consequences

- Duplicate concurrent requests dispatch once within a process (tested).
- Operators carry a small manual burden for rare failures. For high-impact
  actions that is cheaper than an incident caused by a duplicated side effect.
