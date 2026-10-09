# ADR 0001 — Fail-closed, ordered policy evaluation

Status: accepted · Policy version: 0.1

## Context

An agent proposes actions; some are reads, some change production state. A
policy that evaluates rules in an unspecified order, or that treats a missing
field as "probably fine", turns every new rule into a possible bypass.

## Decision

Rules run in a fixed order and the first non-allow result wins:

1. tenant isolation
2. cost estimate validation (missing, negative or non-finite → deny)
3. per-action cost ceiling
4. explicit tool allowlist
5. human approval for state-changing tools

Any exception during evaluation is a deny, never an allow. The Python engine is
the reference; the TypeScript console mirrors the same order and version, and
both test suites assert concrete outcomes so drift fails CI.

## Consequences

- Denials are explainable: every decision names exactly one rule.
- Adding a rule is a policy-version change, not a silent edit.
- Ordering costs some flexibility (no weighted scoring). That is deliberate:
  scoring is hard to audit and easy to game.
