# Boundary

**A policy gate between an AI agent’s intent and a tool’s side effects.**

An agent can suggest isolating an endpoint. It should not be able to grant itself
that authority. Boundary explores this distinction with a small executable
reference, rather than a framework with a security promise attached.

The project pairs a dependency-free Python gate with a TypeScript operator
console. The console is a **local simulation**, not a deployed security service.
No model keys, cloud account or customer data are required.

## Try it in two minutes

```sh
cd reference
python -m boundary
python -m unittest discover -s tests -v
```

Python 3.11+ is sufficient. The exercise evaluates a permitted read, a denied
cross-tenant request, and a containment action approved by an independent
operator. The tool adapter is a stub: it never changes a real endpoint.

For the console, from the repository root:

```sh
bun install --frozen-lockfile
bun run dev
```

Use the local URL printed by Vite. Replay scenarios, inspect decisions, approve
or reject containment, filter events, and export the session log. State is kept
in memory and resets on reload. Console approval is visual only; it does not
issue a Python capability token.

## What is actually implemented

- Ordered, fail-closed policy: tenant isolation, cost validation, per-action
  ceiling, explicit tools, then human approval.
- Short-lived, single-use approval bound to the entire immutable action and
  policy version. A changed target, estimate or request ID invalidates it.
- Independent same-tenant approver checks at the trusted adapter boundary.
- Locked reservation before tool dispatch. Concurrent duplicates dispatch once
  within one process; ambiguous failures do not auto-retry.
- Hash-linked audit metadata. External anchors detect suffix truncation; a
  chain without an anchor only proves internal consistency.
- 19 Python tests and 9 policy-mirror tests, including replay, expiry, action
  mutation, concurrent requests and failure handling.
- CI for Python 3.11–3.13 and the TypeScript console.

## One request, one authority boundary

```text
agent intent → trusted identity adapter → ordered policy evaluation
                                             │
                         ┌───────────────────┼───────────────────┐
                         deny               allow              review
                         │                   │                   │
                         audit               │        independent operator
                                             │         action-bound approval
                                             └───────────────┬───┘
                                                  atomic reservation
                                                         │
                                                 trusted tool adapter
                                                         │
                                                completion / failure
```

The model is not the identity provider, policy author, approver, or executor.
In the reference, callers supply these trusted inputs explicitly. Turning this
into a service means implementing that trust boundary, not exposing `Gate` as
an unauthenticated endpoint.

## Read the decisions, not just the code

- [Architecture and trade-offs](docs/architecture.md)
- [Threat model and limitations](docs/threat-model.md)
- [Delivery plan and operating model](docs/delivery.md)
- [Failure reconciliation runbook](docs/runbook.md)
- [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

## Deliberate omissions

No AST “sandbox,” prompt-injection detector, Kubernetes theatre, model-provider
abstraction, compliance certification or made-up latency benchmark. A tool
allowlist is not an OS sandbox. Tenant comparisons are not a substitute for
resource-level authorization. Estimated cost is not billing enforcement.

The in-memory ledger, approval store and reservation set are intentionally
bounded to a local reference. They are not crash-safe or multi-replica safe.
See the threat model before adapting this code.

## Project status

Experimental reference, version 0.1.0. This is a new side project, not evidence
of a production deployment or employer-owned work. No employer systems, secrets
or proprietary materials are included. AI assistance was used in implementation;
there is no fabricated development history or benchmark evidence.
