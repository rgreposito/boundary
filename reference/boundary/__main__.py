"""Run a contained exercise: no credentials, network calls or real containment."""
from .engine import Action, Gate, evaluate


def main() -> None:
    gate = Gate()
    cases = [
        Action("r-001", "triage-agent", "acme", "acme", "incident.read", "INC-2048", .018),
        Action("r-002", "research-agent", "acme", "globex", "knowledge.search", "finance", .024),
        Action("r-003", "response-agent", "acme", "acme", "incident.contain", "ws-fin-042", .046, True),
    ]
    for action in cases:
        decision = evaluate(action)
        print(f"{action.request_id}  {decision.verdict:6}  {decision.rule}")
        token = None
        if decision.verdict == "review":
            token = gate.approve(action, approver="on-call", approver_tenant="acme", role="operator")
        try:
            gate.execute(action, lambda a: {"simulated": a.tool}, token)
        except PermissionError:
            pass
    print(f"Audit: {len(gate.audit.entries)} events; chain valid={gate.audit.verify()}")


if __name__ == "__main__":
    main()
