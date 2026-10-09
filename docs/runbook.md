# Runbook: remote outcome unknown

**Trigger:** the gate reserved a request, but the tool call timed out or raised.
A remote containment effect might already exist.

1. Stop automatic retry for that request ID. The reference does this locally;
   production schedulers must respect the durable reservation too.
2. Correlate the request ID with the provider’s idempotency key and audit trail.
   Look up remote status using a read-only, same-tenant credential.
3. If the effect exists, append reconciliation evidence and mark it complete.
   Do not execute it again to manufacture a successful local response.
4. If absence is authoritative, request a new reviewed action with a new ID.
   A timeout alone is not evidence that the first action had no effect.
5. If status remains ambiguous, escalate to the workflow owner. Keep dispatch
   blocked. Record the investigation without copying sensitive payloads.

## Audit verification failure

Preserve the ledger and external anchor. Disable writes, compare independent
provider events, and investigate storage access. Recomputing the chain is not
recovery: it discards the evidence of mutation.

## Gate/store outage

Fail closed. Surface an explicit unavailable result rather than silently
bypassing evaluation. Resume through the normal gate after recovery and reconcile
reserved requests before enabling scheduler retries.

These procedures describe the intended production adapter. The local reference
has no provider-status or durable-reconciliation implementation.
