// Patients page — searchable roster with tabbed detail (incl. charting)
import { useState } from 'react';
import { Icon } from './icons.jsx';
import { Sidebar, Topbar } from './shell.jsx';
import { DC_DATA } from './data.js';

const fmtDT = (n) => `${n.toLocaleString()} DT`;

const statusPill = (s) => {
  if (s === 'overdue') return <span className="pill coral"><span className="pdot"></span>Overdue</span>;
  if (s === 'recall') return <span className="pill amber"><span className="pdot"></span>Recall due</span>;
  return <span className="pill mint"><span className="pdot"></span>Active</span>;
};

const colorBg = { blue:'var(--blue-100)', mint:'var(--mint-100)', plum:'var(--plum-100)', amber:'var(--amber-100)', coral:'var(--coral-100)' };
const colorFg = { blue:'var(--blue-700)', mint:'var(--mint-700)', plum:'#6A3FA0', amber:'var(--amber-700)', coral:'var(--coral-700)' };

// Odontogram --------------------------------------------------------
const TOOTH_STATE = {
  1:'missing', 3:'filling', 5:'watch', 8:'crown', 12:'filling', 14:'crown',
  16:'missing', 17:'missing', 18:'implant', 19:'filling', 30:'watch', 31:'filling', 32:'missing',
};
const toothLabel = (s) => s==='watch'?'Occlusal wear — watch' : s==='filling'?'Existing restoration'
  : s==='crown'?'Full crown' : s==='implant'?'Implant + crown' : s==='missing'?'Missing / extracted' : 'Sound';

const BigTooth = ({ n, sel, onClick }) => {
  const state = TOOTH_STATE[n] || '';
  return (
    <div className={`big-tooth ${state} ${sel===n?'selected':''}`} onClick={()=>onClick(n)}>
      <div className="tglyph"><Icon name="tooth" size={13}/></div>
      <div className="tn">{n}</div>
    </div>
  );
};

const DentalChart = () => {
  const [sel, setSel] = useState(30);
  const upper = Array.from({length:16}, (_,i)=>i+1);
  const lower = Array.from({length:16}, (_,i)=>32-i);
  const legend = [
    ['Healthy','var(--white)','var(--ink-200)'],
    ['Filling','var(--blue-50)','var(--blue-300)'],
    ['Crown','var(--amber-50)','var(--amber-200)'],
    ['Implant','var(--plum-100)','var(--plum-100)'],
    ['Watch','var(--coral-50)','var(--coral-200)'],
    ['Missing','var(--ink-50)','var(--ink-300)'],
  ];
  return (
    <div className="grid-main-side">
      <div className="odontogram">
        <div className="arch">
          <div className="arch-label">Upper arch · Maxillary (1–16)</div>
          <div className="tooth-row">{upper.map(n => <BigTooth key={n} n={n} sel={sel} onClick={setSel}/>)}</div>
        </div>
        <div className="arch">
          <div className="arch-label">Lower arch · Mandibular (17–32)</div>
          <div className="tooth-row">{lower.map(n => <BigTooth key={n} n={n} sel={sel} onClick={setSel}/>)}</div>
        </div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginTop:18, paddingTop:16, borderTop:'1px solid var(--ink-100)' }}>
          {legend.map(([l,bg,bc]) => (
            <span key={l} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'var(--ink-600)' }}>
              <i style={{ width:14, height:14, borderRadius:4, background:bg, border:`1.5px solid ${bc}` }}></i>{l}
            </span>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">Tooth #{sel}</span></div>
        <div className="card-body">
          <div className="dl-grid" style={{ gridTemplateColumns:'1fr 1fr' }}>
            <div><label>Condition</label><div className="v">{toothLabel(TOOTH_STATE[sel])}</div></div>
            <div><label>Surfaces</label><div className="v">{TOOTH_STATE[sel]==='watch'?'O':'—'}</div></div>
            <div><label>Mobility</label><div className="v">0</div></div>
            <div><label>Last noted</label><div className="v">Nov 12, 2025</div></div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            <button className="btn-ghost"><Icon name="plus" size={12}/>Add finding</button>
            <button className="btn-ghost">Add to plan</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TreatmentPlan = () => {
  const plan = [
    { tooth: '#30', proc: 'Root canal — session 1 of 3', status: 'complete', fee: 120, prov: 'Dr. Ben Ammar', note: 'Irreversible pulpitis' },
    { tooth: '#30', proc: 'Root canal — session 2 of 3', status: 'planned', fee: 120, prov: 'Dr. Ben Ammar' },
    { tooth: '#30', proc: 'Root canal — session 3 of 3 + obturation', status: 'planned', fee: 140, prov: 'Dr. Ben Ammar' },
    { tooth: '#14', proc: 'Composite filling — MO', status: 'complete', fee: 90, prov: 'Dr. Ben Ammar' },
    { tooth: '#5', proc: 'Watch — occlusal wear', status: 'monitor', fee: 0, prov: 'Dr. Ben Ammar' },
    { tooth: 'Full mouth', proc: 'Scaling & polishing', status: 'planned', fee: 80, prov: 'Dr. Ben Ammar' },
  ];
  const statusMap = {
    planned: <span className="pill blue">Planned</span>,
    monitor: <span className="pill amber">Monitor</span>,
    complete: <span className="pill mint">Complete</span>,
  };
  return (
    <div className="card table-card">
      <div className="card-head"><span className="card-title">Treatment plan</span><span className="card-sub" style={{marginLeft:'auto'}}>Phase 1 · est. 340 DT remaining</span></div>
      <table className="dtable">
        <thead><tr><th>Tooth</th><th>Procedure</th><th>Provider</th><th>Status</th><th style={{textAlign:'right'}}>Fee</th></tr></thead>
        <tbody>
          {plan.map((r,i) => (
            <tr key={i}>
              <td className="num" style={{fontWeight:600,color:'var(--ink-900)'}}>{r.tooth}</td>
              <td><div style={{fontWeight:600,color:'var(--ink-900)'}}>{r.proc}</div>{r.note && <div style={{fontSize:11.5,color:'var(--ink-500)'}}>{r.note}</div>}</td>
              <td style={{color:'var(--ink-600)'}}>{r.prov}</td>
              <td>{statusMap[r.status]}</td>
              <td className="num" style={{textAlign:'right'}}>{r.fee?fmtDT(r.fee):'—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Overview = ({ p }) => (
  <div className="grid-main-side">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-head"><span className="card-title">Overview</span></div>
        <div className="card-body">
          <div className="dl-grid">
            <div><label>Primary provider</label><div className="v">{p.provider}</div></div>
            <div><label>Last visit</label><div className="v">{p.last}</div></div>
            <div><label>Next appointment</label><div className="v">{p.next}</div></div>
            <div><label>Phone</label><div className="v">{p.phone}</div></div>
            <div><label>Coverage</label><div className="v">{p.ins}</div></div>
            <div><label>Balance</label><div className="v" style={{ color: p.balance>0?'var(--coral-700)':'var(--ink-900)' }}>{fmtDT(p.balance)}</div></div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">Treatment history</span><span className="card-sub" style={{marginLeft:'auto'}}>Last 4 visits</span></div>
        <div className="card-body">
          <div className="timeline-v">
            <div className="tl-item done"><div className="tl-date">{p.last}</div><div className="tl-title">Comprehensive exam + 4 BWX</div><div className="tl-sub">{p.provider} · findings recorded</div></div>
            <div className="tl-item done"><div className="tl-date">Nov 18, 2025</div><div className="tl-title">Composite filling #14 MO</div><div className="tl-sub">Dr. Ben Ammar · shade A2</div></div>
            <div className="tl-item done"><div className="tl-date">May 03, 2025</div><div className="tl-title">Scaling & polishing</div><div className="tl-sub">Dr. Ben Ammar</div></div>
            <div className="tl-item done"><div className="tl-date">Nov 12, 2024</div><div className="tl-title">Recall exam</div><div className="tl-sub">{p.provider}</div></div>
          </div>
        </div>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card">
        <div className="card-head"><span className="card-title">Balance</span></div>
        <div className="card-body">
          <div style={{ fontFamily:'var(--font-serif)', fontSize: 30, fontWeight: 500, color: p.balance>0?'var(--coral-700)':'var(--ink-900)' }}>{fmtDT(p.balance)}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 4 }}>{p.balance>0 ? 'Outstanding balance' : 'Paid in full'} · {p.ins}</div>
          {p.balance>0 && <button className="btn-ghost" style={{ marginTop: 12 }}><Icon name="dollar" size={13}/>Record payment</button>}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">Attachments</span><a className="card-sub" href="#" onClick={(e)=>e.preventDefault()} style={{marginLeft:'auto'}}>All →</a></div>
        <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div className="row-flex" style={{ fontSize:13 }}><Icon name="tooth" size={14} style={{color:'var(--ink-400)'}}/>Bitewings (4) · today</div>
          <div className="row-flex" style={{ fontSize:13 }}><Icon name="file-text" size={14} style={{color:'var(--ink-400)'}}/>Consent (RCT) · today</div>
          <div className="row-flex" style={{ fontSize:13 }}><Icon name="file-text" size={14} style={{color:'var(--ink-400)'}}/>Health history · today</div>
        </div>
      </div>
    </div>
  </div>
);

const PatientDetail = ({ p }) => {
  const [tab, setTab] = useState('overview');
  if (!p) return <div className="empty-pad" style={{marginTop:80}}>Select a patient</div>;
  const initials = p.name.split(' ').map(s=>s[0]).slice(0,2).join('');
  const tabs = [['overview','Overview'], ['chart','Dental chart'], ['plan','Treatment plan']];
  return (
    <div style={{ padding: 22 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, padding: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="drawer-avatar" style={{ background: colorBg[p.color], color: colorFg[p.color], width: 56, height: 56, fontSize: 22 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink-900)' }}>{p.name}</div>
            <div className="drawer-meta">{p.sex} · {p.age} yrs · Pt #{p.id} · {p.ins}</div>
          </div>
          {statusPill(p.status)}
          <button className="btn-primary"><Icon name="calendar" size={14}/>Book visit</button>
          <button className="btn-ghost"><Icon name="phone" size={13}/></button>
          <button className="btn-ghost"><Icon name="message" size={13}/></button>
        </div>
        {p.alerts.length > 0 && (
          <div style={{ padding: '0 20px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {p.alerts.map((a,i) => <span key={i} className="med-alert" style={{ display: 'inline-flex' }}><Icon name="alert-tri" size={13}/>{a}</span>)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, padding: '0 16px', borderTop: '1px solid var(--ink-100)' }}>
          {tabs.map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k)} style={{
              border: 'none', background: 'transparent', padding: '12px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              color: tab===k ? 'var(--blue-700)' : 'var(--ink-500)',
              boxShadow: tab===k ? 'inset 0 -2px 0 var(--blue-500)' : 'none',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {tab==='overview' && <Overview p={p}/>}
      {tab==='chart' && <DentalChart/>}
      {tab==='plan' && <TreatmentPlan/>}
    </div>
  );
};

export const PatientsPage = () => {
  const data = DC_DATA;
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [sel, setSel] = useState(data.patients[0]);

  const filtered = data.patients.filter(p => {
    const mq = p.name.toLowerCase().includes(q.toLowerCase()) || p.id.includes(q);
    const mf = filter==='all' ? true : filter==='alerts' ? p.alerts.length>0 : p.status===filter;
    return mq && mf;
  });

  const topbar = <Topbar title={<span style={{fontFamily:'var(--font-serif)',fontWeight:500}}>Patients</span>} subtitle={`${data.patients.length} active records`} actions={<button className="btn-primary"><Icon name="plus" size={14}/>Add patient</button>}/>;

  return (
    <div className="app">
      <Sidebar active="patients"/>
      <main className="main">
        {topbar}
        <div className="content pad-0">
          <div className="split">
            <div className="split-list">
              <div style={{ padding: 12, borderBottom: '1px solid var(--ink-150)' }}>
                <div className="search-inline" style={{ minWidth: 0 }}>
                  <Icon name="search" size={14}/>
                  <input placeholder="Search name or ID…" value={q} onChange={e=>setQ(e.target.value)}/>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {[['all','All'],['active','Active'],['recall','Recall'],['overdue','Overdue'],['alerts','Alerts']].map(([k,l]) => (
                    <button key={k} className={`chip ${filter===k?'active':''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={()=>setFilter(k)}>{l}</button>
                  ))}
                </div>
              </div>
              {filtered.map(p => {
                const initials = p.name.split(' ').map(s=>s[0]).slice(0,2).join('');
                return (
                  <div key={p.id} className={`list-row ${sel && sel.id===p.id?'active':''}`} onClick={()=>setSel(p)}>
                    <div className="avatar" style={{ width: 34, height: 34, background: colorBg[p.color], color: colorFg[p.color] }}>{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="lr-title">{p.name}</div>
                      <div className="lr-sub">#{p.id} · {p.next !== '—' ? p.next : 'no upcoming'}</div>
                    </div>
                    {p.alerts.length>0 && <Icon name="alert-tri" size={14} style={{ color: 'var(--coral-500)', marginLeft: 'auto' }}/>}
                  </div>
                );
              })}
              {filtered.length===0 && <div className="empty-pad">No patients match</div>}
            </div>
            <div className="split-detail">
              <PatientDetail p={sel} key={sel ? sel.id : 'none'}/>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
