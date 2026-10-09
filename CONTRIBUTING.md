# Contributing

Start with a failing test and a concrete boundary violation. Small changes to an
explicit rule are easier to review than a new abstraction layer.

Run `python -m unittest discover -s tests -v` from `reference`, and `bun run test`
from the repository root. If evaluation behavior changes, update both language
implementations and tests and increment the policy version.

For security-sensitive changes, describe trusted inputs, the forbidden outcome,
and what happens during partial failure. Avoid real tenant data and credentials
in fixtures. Performance claims need a reproducible harness and raw results.
