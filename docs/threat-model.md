# Threat model

## Assets

Tenant data, tool execution authority, operator identity, approval capability,
and decision history. The agent and any model-generated arguments are untrusted.
The Python process, identity adapter and tool adapter are trusted.

| Threat | Reference control | Residual risk |
| --- | --- | --- |
| Cross-tenant retrieval | Deny mismatched tenant identifiers | Identifiers must be derived from trusted identity/resource stores |
| Agent requests shell execution | Explicit tool allowlist | A registered adapter can still be overprivileged |
| Sensitive read or destructive action | Independent same-tenant operator approval | Reference role strings are adapter inputs, not authentication |
| Approval reused for another target | Whole-action fingerprint and policy version | Token theft allows the originally approved action before expiry |
| Approval replay | One-time consumption under lock | State is lost on restart; not safe across replicas |
| Concurrent duplicate dispatch | Request reservation under lock | Remote side effects are not exactly-once |
| Expired approval | Monotonic deadline, rejected at equality | No distributed clock or persistence implementation |
| Audit edit or truncation | Hash linkage and optional external head | No external anchor storage or signed attestations provided |
| Cost overflow or NaN | Finite non-negative per-action estimate | No cumulative budget or actual usage accounting |
| Tool hangs | None | Adapter must supply timeouts and cancellation |
| Prompt injection | Limits tool authority regardless of prompt | Does not detect injection or sanitize model output |

## Deployment conditions before any real usage

1. Authenticate both agents and operators; bind roles and tenant membership on
   the server. Never accept them from a browser or an LLM tool argument.
2. Resolve resource ownership from authoritative data. Recheck at the resource
   boundary to avoid stale authorization and TOCTOU.
3. Use a durable transactional store for reservations and approval consumption.
4. Scope tool credentials independently. Use OS/container isolation and egress
   enforcement for untrusted code; Python hooks are not a security boundary.
5. Persist audit before effects, fail closed on persistence failure, anchor
   independently, and implement safe retention and identifiers.
6. Add timeouts, remote idempotency, backpressure, revocation and reconciliation.
7. Enforce actual and cumulative spend in the provider/billing adapter.

This repository makes no NIST, ISO, GDPR or defense-grade compliance claim.
It illustrates controls that can be mapped to a broader assurance program.
