import { describe, expect, it } from 'vitest';
import { evaluate, fixtures } from './policy';
const first = fixtures[0];
if (!first) throw new Error('Missing read fixture');
const action = first;
describe('Boundary policy mirror', () => {
  it('denies cross-tenant reads before all other checks', () => expect(evaluate({ ...action, resourceTenant: 'globex' }).rule).toBe('tenant.isolation'));
  it('denies unregistered tools', () => expect(evaluate({ ...action, tool: 'shell.exec' }).verdict).toBe('deny'));
  it('permits the exact per-action cost limit', () => expect(evaluate({ ...action, cost: 0.5 }).verdict).toBe('allow'));
  it('denies estimates above the cost limit', () => expect(evaluate({ ...action, cost: 0.501 }).verdict).toBe('deny'));
  it.each([NaN, Infinity, -1])('denies invalid cost %s', cost => expect(evaluate({ ...action, cost }).verdict).toBe('deny'));
  it('requires approval for containment', () => expect(evaluate({ ...action, tool: 'incident.contain' }).verdict).toBe('review'));
  it('requires approval for sensitive reads', () => expect(evaluate({ ...action, sensitive: true }).verdict).toBe('review'));
});
