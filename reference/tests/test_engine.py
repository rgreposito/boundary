import unittest
from dataclasses import replace
from concurrent.futures import ThreadPoolExecutor
from boundary.engine import Action, Audit, Gate, evaluate


class GateTests(unittest.TestCase):
    def setUp(self):
        self.now = 100.0
        self.gate = Gate(clock=lambda: self.now)
        self.read = Action("r1", "agent", "acme", "acme", "incident.read", "INC-1", .01)
        self.write = replace(self.read, tool="incident.contain", sensitive=True)
        self.calls = []

    def executor(self, action):
        self.calls.append(action.request_id)
        return "ok"

    def approve(self, action=None, **kwargs):
        return self.gate.approve(action or self.write, approver="operator-1", approver_tenant="acme", role="operator", **kwargs)

    def test_cross_tenant_never_reaches_executor(self):
        with self.assertRaises(PermissionError):
            self.gate.execute(replace(self.read, resource_tenant="globex"), self.executor)
        self.assertEqual(self.calls, [])

    def test_unknown_tool_denied(self):
        self.assertEqual(evaluate(replace(self.read, tool="shell.exec")).verdict, "deny")

    def test_exact_cost_ceiling_allowed(self):
        self.assertEqual(evaluate(replace(self.read, estimated_cost=.50)).verdict, "allow")

    def test_cost_above_ceiling_denied(self):
        self.assertEqual(evaluate(replace(self.read, estimated_cost=.5001)).verdict, "deny")

    def test_nonfinite_and_negative_cost_denied(self):
        for cost in [float("nan"), float("inf"), -.01]:
            with self.subTest(cost=cost):
                self.assertEqual(evaluate(replace(self.read, estimated_cost=cost)).rule, "input.cost")

    def test_sensitive_read_requires_review(self):
        self.assertEqual(evaluate(replace(self.read, sensitive=True)).verdict, "review")

    def test_write_requires_approval(self):
        with self.assertRaises(PermissionError):
            self.gate.execute(self.write, self.executor)
        self.assertEqual(self.calls, [])

    def test_cannot_self_approve(self):
        with self.assertRaises(PermissionError):
            self.gate.approve(self.write, approver="agent", approver_tenant="acme", role="operator")

    def test_wrong_tenant_cannot_approve(self):
        with self.assertRaises(PermissionError):
            self.gate.approve(self.write, approver="operator-1", approver_tenant="globex", role="operator")

    def test_agent_role_cannot_approve(self):
        with self.assertRaises(PermissionError):
            self.gate.approve(self.write, approver="someone", approver_tenant="acme", role="agent")

    def test_approval_binds_entire_action(self):
        token = self.approve()
        for field in [dict(target="other"), dict(estimated_cost=.02), dict(request_id="r2")]:
            with self.subTest(field=field), self.assertRaises(PermissionError):
                self.gate.execute(replace(self.write, **field), self.executor, token)
        self.assertEqual(self.calls, [])

    def test_approval_expires_at_deadline(self):
        token = self.approve(ttl=60)
        self.now = 160
        with self.assertRaises(PermissionError):
            self.gate.execute(self.write, self.executor, token)

    def test_invalid_ttl(self):
        for ttl in [0, -1, 301, float("inf"), float("nan")]:
            with self.subTest(ttl=ttl), self.assertRaises(ValueError):
                self.approve(ttl=ttl)

    def test_approval_is_single_use(self):
        token = self.approve()
        self.assertEqual(self.gate.execute(self.write, self.executor, token), "ok")
        with self.assertRaises(PermissionError):
            self.gate.execute(self.write, self.executor, token)
        self.assertEqual(self.calls, ["r1"])

    def test_failed_execution_is_not_retried(self):
        def fail(action):
            raise RuntimeError("remote status unknown")
        with self.assertRaises(RuntimeError):
            self.gate.execute(self.read, fail)
        with self.assertRaises(PermissionError):
            self.gate.execute(self.read, self.executor)
        self.assertEqual(self.calls, [])
        self.assertEqual(self.gate.audit.entries[-1]["event"], "failed")

    def test_concurrent_duplicate_executes_once(self):
        def attempt(_):
            try:
                return self.gate.execute(self.read, self.executor)
            except PermissionError:
                return "denied"
        with ThreadPoolExecutor(max_workers=8) as pool:
            results = list(pool.map(attempt, range(32)))
        self.assertEqual(results.count("ok"), 1)
        self.assertEqual(len(self.calls), 1)

    def test_audit_detects_mutation(self):
        self.gate.execute(self.read, self.executor)
        self.assertTrue(self.gate.audit.verify())
        self.gate.audit.entries[0]["event"] = "fake"
        self.assertFalse(self.gate.audit.verify())

    def test_external_anchor_detects_truncation(self):
        self.gate.execute(self.read, self.executor)
        anchor = self.gate.audit.entries[-1]["hash"]
        self.gate.audit.entries.pop()
        self.assertTrue(self.gate.audit.verify())  # valid prefix is not full history
        self.assertFalse(self.gate.audit.verify(anchor))

    def test_audit_does_not_record_target(self):
        self.gate.execute(self.read, self.executor)
        self.assertNotIn("target", self.gate.audit.entries[0])


if __name__ == "__main__":
    unittest.main()
