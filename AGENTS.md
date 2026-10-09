<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Keep the executable policy reference in `reference/boundary` dependency-free and separate from the console; its behavior is testable without a cloud account.
- Treat the TypeScript console as an explicitly labeled, in-memory simulation, never as an authorization boundary; real enforcement belongs at the trusted tool adapter.
- Match decision order and policy version in the Python engine and TypeScript mirror; concrete tests prevent rule drift.
- Keep the execution reservation and approval consumption in one locked critical section; ambiguous tool failures must not cause automatic re-execution.
- Store only metadata in audit events and explain external-anchor requirements; hash chains alone cannot prove completeness.
