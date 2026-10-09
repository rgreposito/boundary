export type Verdict = 'allow' | 'deny' | 'review';
export type Action = { id: string; agent: string; tenant: string; resourceTenant: string; tool: string; target: string; cost: number; sensitive: boolean };
export type Decision = { verdict: Verdict; rule: string; reason: string };
export const POLICY_VERSION = '2026.10.1';
export const COST_LIMIT = 0.5;
export function evaluate(action: Action): Decision {
  if (action.tenant !== action.resourceTenant) return { verdict: 'deny', rule: 'tenant.isolation', reason: 'Resource belongs to a different tenant. No cross-tenant access.' };
  if (!Number.isFinite(action.cost) || action.cost < 0) return { verdict: 'deny', rule: 'input.cost', reason: 'Cost must be finite and non-negative.' };
  if (action.cost > COST_LIMIT) return { verdict: 'deny', rule: 'budget.per_action', reason: 'Estimated cost exceeds the $0.50 per-action ceiling.' };
  if (!['knowledge.search', 'incident.read', 'incident.contain'].includes(action.tool)) return { verdict: 'deny', rule: 'tool.allowlist', reason: 'Tool is not in the explicit capability allowlist.' };
  if (action.sensitive || action.tool === 'incident.contain') return { verdict: 'review', rule: 'human.approval', reason: 'Sensitive or state-changing actions require an independent approver.' };
  return { verdict: 'allow', rule: 'capability.read', reason: 'Read-only capability, tenant boundary and cost checks passed.' };
}
export const fixtures: Action[] = [
  { id: 'run_8f2a', agent: 'triage-agent', tenant: 'acme', resourceTenant: 'acme', tool: 'incident.read', target: 'INC-2048 · anomalous sign-in', cost: 0.018, sensitive: false },
  { id: 'run_8f2b', agent: 'research-agent', tenant: 'acme', resourceTenant: 'acme', tool: 'knowledge.search', target: 'Internal response playbooks', cost: 0.032, sensitive: false },
  { id: 'run_8f2c', agent: 'response-agent', tenant: 'acme', resourceTenant: 'acme', tool: 'incident.contain', target: 'Isolate endpoint ws-fin-042', cost: 0.046, sensitive: true },
  { id: 'run_8f2d', agent: 'research-agent', tenant: 'acme', resourceTenant: 'globex', tool: 'knowledge.search', target: 'globex / confidential-finance', cost: 0.024, sensitive: false },
  { id: 'run_8f2e', agent: 'triage-agent', tenant: 'acme', resourceTenant: 'acme', tool: 'incident.read', target: 'INC-2051 · suspicious DNS', cost: 0.012, sensitive: false },
  { id: 'run_8f2f', agent: 'response-agent', tenant: 'acme', resourceTenant: 'acme', tool: 'shell.exec', target: 'Unregistered tool invocation', cost: 0.01, sensitive: true },
];
