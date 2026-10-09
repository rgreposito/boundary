import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowRight, Bell, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, ExternalLink, GitBranch, Layers, LockKeyhole, MoreHorizontal, Play, Search, Shield, ShieldCheck, ShieldX, SlidersHorizontal, Terminal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { evaluate, fixtures, POLICY_VERSION, type Action, type Verdict } from '@/lib/boundary/policy';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'Boundary — Agent security control plane' },
    { name: 'description', content: 'A reference operator console for tenant-isolated AI tool execution, approval gates and deterministic policy decisions.' },
    { property: 'og:title', content: 'Boundary — Agent security control plane' },
    { property: 'og:description', content: 'Explore a secure-by-design AI execution reference with explicit boundaries, policy decisions and operator approvals.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: BoundaryConsole,
});
type Row = Action & { outcome?: 'approved' | 'rejected' };
type View = 'Overview' | 'Policies' | 'Audit log';
function Status({ verdict }: { verdict: Verdict | 'approved' | 'rejected' }) {
  const kind = verdict === 'approved' ? 'allow' : verdict === 'rejected' ? 'deny' : verdict;
  const Icon = kind === 'allow' ? Check : kind === 'deny' ? X : LockKeyhole;
  return <span className={`pill pill-${kind}`}><Icon size={10}/>{verdict === 'allow' ? 'Allowed' : verdict === 'deny' ? 'Blocked' : verdict === 'review' ? 'Needs approval' : verdict === 'approved' ? 'Approved' : 'Rejected'}</span>;
}
function Topology() {
 return <div className="topology"><svg viewBox="0 0 500 170" role="img" aria-label="Three agents route through the Boundary policy gate before accessing tenant-scoped tools">
  <path className="topo-line" d="M124 30 H157 V85 H193 M124 85 H193 M124 140 H157 V85 M307 85 H366 V45 H392 M366 85 V125 H392"/>
  {[['Triage agent', 12], ['Research agent', 67], ['Response agent', 122]].map(([name,y]) => <g key={name}><rect className="topo-node" x="8" y={Number(y)} width="116" height="36" rx="5"/><circle className="topo-dot" cx="23" cy={Number(y)+18} r="3"/><text className="topo-label" x="34" y={Number(y)+21}>{name}</text></g>)}
  <rect className="topo-gate" x="193" y="57" width="114" height="56" rx="5"/><text className="topo-label" x="217" y="80">BOUNDARY</text><text className="topo-sub" x="212" y="98">policy enforcement</text>
  <rect className="topo-node" x="392" y="27" width="100" height="36" rx="5"/><text className="topo-label" x="406" y="49">Knowledge</text>
  <rect className="topo-node" x="392" y="107" width="100" height="36" rx="5"/><text className="topo-label" x="408" y="129">Incidents</text>
  <text className="topo-sub" x="323" y="75">scoped</text>
 </svg><div className="topology-legend"><span><span className="status-dot"/> 3 registered agents</span><span className="mono">tenant: acme</span><span>Default deny <LockKeyhole size={10} className="inline"/></span></div></div>;
}
function BoundaryConsole() {
 const [view,setView] = useState<View>('Overview');
 const [rows,setRows] = useState<Row[]>(fixtures);
 const [filter,setFilter] = useState<'all' | Verdict>('all');
 const [query,setQuery] = useState('');
 const [selected,setSelected] = useState<string | null>(null);
 const [scenario,setScenario] = useState(0);
 const [notice,setNotice] = useState('');
 const decisions = useMemo(() => rows.map(row => ({ row, decision: evaluate(row) })), [rows]);
 const pending = rows.find(row => evaluate(row).verdict === 'review' && !row.outcome);
 const blocked = decisions.filter(({row,decision}) => row.outcome === 'rejected' || decision.verdict === 'deny').length;
 const reviews = decisions.filter(({row,decision}) => decision.verdict === 'review' && !row.outcome).length;
 const cost = rows.filter(row => row.outcome === 'approved' || evaluate(row).verdict === 'allow').reduce((sum,row) => sum+row.cost,0);
 const visible = decisions.filter(({row,decision}) => (filter === 'all' || decision.verdict === filter) && `${row.id} ${row.agent} ${row.tool} ${row.target}`.toLowerCase().includes(query.toLowerCase()));
 const chosen = rows.find(row => row.id === selected);
 function replay() {
   const base = fixtures[scenario % fixtures.length];
   if (!base) return;
   const row = { ...base, id: `run_demo_${scenario+1}` };
   setRows(previous => [row,...previous]); setScenario(n => n+1);setSelected(row.id);
   setNotice(`Scenario ${scenario+1} evaluated: ${evaluate(row).rule}. No external tools were executed.`);
 }
 function resolve(outcome: 'approved' | 'rejected') {
   if (!pending) return;
   setRows(previous => previous.map(row => row.id === pending.id ? { ...row,outcome } : row));
   setNotice(`${pending.id} ${outcome} in this simulation. No endpoint was changed.`);
 }
 function exportAudit() {
   const data = rows.map(row => ({ request_id:row.id, agent:row.agent, tenant:row.tenant, tool:row.tool, decision:evaluate(row), outcome:row.outcome ?? null, policy:POLICY_VERSION }));
   const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
   const anchor = document.createElement('a');anchor.href=url;anchor.download='boundary-simulation-audit.json';anchor.click();URL.revokeObjectURL(url);
   setNotice('Simulation decision log exported. This is not the Python engine’s hash-linked ledger.');
 }
 return <div className="app-shell">
  <aside className="side"><a className="brand" href="/" aria-label="Boundary home"><span className="brand-icon"><Shield size={21}/></span>boundary<span className="small">/</span></a>
   <div className="workspace"><span className="workspace-mark">AC</span><div>Acme workspace<div className="small">Local environment</div></div><ChevronDown size={12} className="ml-auto"/></div>
   <div className="nav-label">Control plane</div><nav aria-label="Main navigation">{([{name:'Overview',icon:Layers},{name:'Policies',icon:ShieldCheck},{name:'Audit log',icon:Activity}] as const).map(({name,icon:Icon}) => <Button key={name} variant="ghost" className="side-nav" data-active={view === name} onClick={() => {setView(name);setSelected(null);}}><Icon/>{name}{name==='Policies' && <span className="nav-count">5</span>}{name==='Audit log' && <span className="nav-count">{rows.length}</span>}</Button>)}</nav>
   <div className="side-bottom"><a href="https://github.com/rgreposito/boundary/tree/main/docs" target="_blank" rel="noreferrer"><Button variant="ghost" className="side-nav"><BookOpen/>Documentation<ExternalLink size={12} className="ml-auto"/></Button></a><a href="https://github.com/rgreposito/boundary" target="_blank" rel="noreferrer"><Button variant="ghost" className="side-nav"><GitBranch/>Source code<ExternalLink size={12} className="ml-auto"/></Button></a><div className="side-divider"/><div className="profile"><span className="avatar">RG</span><div>Raffaele Giove<div className="small">Reference project</div></div><MoreHorizontal size={15} className="ml-auto"/></div></div>
  </aside>
  <main className="main"><header className="topbar"><div className="breadcrumb"><span className="text-muted-foreground">Workspace</span><ChevronRight size={12}/><span>{view}</span></div><div className="top-actions"><span className="environment"><span className="status-dot"/> LOCAL SIMULATION</span><Button variant="ghost" size="icon" title="Project scope" aria-label="Project scope" onClick={() => setNotice('Local simulation only. The Python reference is runnable from the GitHub repository; no live agent infrastructure is connected.')}><CircleHelp/></Button></div></header>
   <div className="content"><div className="page-heading"><div><div className="eyebrow mb-2">Agent security / control plane</div><h1>{view === 'Overview' ? 'Execution overview' : view === 'Policies' ? 'Policy registry' : 'Decision audit log'}</h1><p className="subtitle">{view === 'Overview' ? 'Every action has a boundary. Every decision leaves a trace.' : view === 'Policies' ? 'Explicit capabilities. Fail-closed evaluation. No implicit trust.' : 'A complete view of this session’s simulated policy decisions.'}</p></div><div className="heading-actions"><Button variant="outline" size="sm" onClick={exportAudit}><ArrowDownToLine/>Export log</Button><Button size="sm" onClick={replay}><Play/>Run scenario</Button></div></div>
   {view === 'Policies' ? <div className="panel"><div className="panel-heading"><h2><ShieldCheck size={15}/>Active policy bundle</h2><span className="pill pill-neutral">v{POLICY_VERSION}</span></div><div className="rule-list">{[['tenant.isolation','Resource tenant must match the requesting agent’s tenant.','Deny'],['input.cost','Cost estimates must be finite and non-negative.','Deny'],['budget.per_action','Estimated spend cannot exceed $0.50 per action.','Deny'],['tool.allowlist','Only knowledge.search, incident.read and incident.contain are registered.','Deny'],['human.approval','Sensitive reads and containment actions require an independent operator.','Review']].map(([rule,description,effect]) => <div className="rule-row" key={rule}><div><h3>{rule}</h3><p>{description}</p></div><span className={`pill pill-${effect === 'Deny' ? 'deny' : 'review'}`}>{effect}</span></div>)}</div><div className="panel-heading"><span className="small">Evaluation order is significant. A denial cannot be overridden by approval.</span><LockKeyhole size={14}/></div></div> : <>
   {view === 'Overview' && <><div className="metric-grid">{[{label:'Evaluated actions',value:rows.length,icon:Activity,foot:<><strong>All requests</strong> policy evaluated</>},{label:'Blocked actions',value:blocked,icon:ShieldX,foot:<><strong>Enforced</strong> before execution</>},{label:'Awaiting approval',value:reviews,icon:LockKeyhole,foot:<>Human review required</>},{label:'Estimated permitted cost',value:`$${cost.toFixed(3)}`,icon:SlidersHorizontal,foot:<>$0.50 per-action ceiling</>}].map(({label,value,icon:Icon,foot}) => <div className="metric" key={label}><div className="metric-label">{label}<Icon size={14}/></div><div className="metric-value">{value}</div><div className="metric-footer">{foot}</div></div>)}</div>
   <div className="operations"><section className="panel"><div className="panel-heading"><h2><GitBranch size={15}/>Execution topology</h2><span className="pill pill-allow"><span className="status-dot"/>Policy active</span></div><Topology/></section><section className="panel"><div className="panel-heading"><h2><LockKeyhole size={14}/>Approval queue</h2><span className="pill pill-review">{reviews} pending</span></div><div className="approval-body">{pending ? <><div className="approval-title"><span className="icon-tile"><Shield size={16}/></span><div>{pending.tool}<div className="small mt-1">{pending.agent}</div></div></div><p>{pending.target}</p><div className="approval-details"><span>{pending.id}</span><span>tenant: {pending.tenant}</span><span>${pending.cost.toFixed(3)} est.</span></div><div className="approval-actions"><Button size="sm" onClick={() => resolve('approved')}><Check/>Approve</Button><Button variant="outline" size="sm" onClick={() => resolve('rejected')}><X/>Reject</Button><span className="pill pill-neutral ml-auto">Simulation</span></div></> : <div className="py-8 flex items-center gap-3 text-success"><ShieldCheck size={24}/><div>No pending approvals<div className="small mt-1">All reviewable actions have a decision.</div></div></div>}</div></section></div></>}
   <div className="activity-bar"><div className="activity-title">{view === 'Audit log' ? 'Session decisions' : 'Recent activity'}<span className="pill pill-neutral">{rows.length}</span></div><div className="filters">{(['all','allow','deny','review'] as const).map(item => <Button key={item} variant="ghost" size="sm" className="filter" data-active={filter===item} onClick={() => setFilter(item)}>{item==='all' ? 'All events' : item==='allow' ? 'Allowed' : item==='deny' ? 'Blocked' : 'Review'}</Button>)}<label className="search"><Search size={13} className="text-muted-foreground"/><input aria-label="Search activity" placeholder="Search events…" value={query} onChange={event => setQuery(event.target.value)}/></label></div></div>
   <div className="table-wrap"><table><thead><tr><th>Request</th><th>Agent / tool</th><th>Tenant</th><th>Decision</th><th>Policy rule</th><th>Est. cost</th><th/></tr></thead><tbody>{visible.map(({row,decision}) => <tr key={row.id} data-selected={selected===row.id} onClick={() => setSelected(selected===row.id ? null : row.id)}><td className="mono text-muted-foreground">{row.id}</td><td><div className="agent-cell"><Terminal size={13} className="text-muted-foreground"/>{row.agent}</div><div className="mono text-muted-foreground mt-1 ml-5">{row.tool}</div></td><td className="mono">{row.tenant}</td><td><Status verdict={row.outcome ?? decision.verdict}/></td><td className="mono text-muted-foreground">{decision.rule}</td><td className="mono">${row.cost.toFixed(3)}</td><td><Button variant="ghost" size="icon" aria-label={`Inspect ${row.id}`} title="Inspect decision" onClick={event => { event.stopPropagation();setSelected(selected===row.id ? null : row.id);}}><ChevronRight/></Button></td></tr>)}</tbody></table>{visible.length===0 && <p className="p-8 text-center text-muted-foreground">No matching events.</p>}<div className="table-footer"><span>Showing {visible.length} of {rows.length} events</span><span className="mono">policy v{POLICY_VERSION}</span></div></div>
   {chosen && <section className="detail"><Shield size={18} className="text-primary"/><div><h3>{chosen.id} · {chosen.target}</h3><p>{evaluate(chosen).reason}</p><div className="mono text-muted-foreground mt-3">Request tenant: {chosen.tenant} → resource tenant: {chosen.resourceTenant}{chosen.outcome ? ` · Operator decision: ${chosen.outcome}` : ''}</div></div><Button variant="ghost" size="icon" aria-label="Close decision details" onClick={() => setSelected(null)} className="ml-auto"><X/></Button></section>}</>}
   {notice && <p className="notice" role="status">{notice}</p>}<footer className="page-footer"><span className="flex items-center gap-2"><ShieldCheck size={12}/>BOUNDARY / REFERENCE IMPLEMENTATION</span><a href="https://github.com/rgreposito/boundary" target="_blank" rel="noreferrer" className="flex items-center gap-2">Built with intent. Open by design.<ArrowRight size={12}/></a></footer>
   </div></main></div>;
}
