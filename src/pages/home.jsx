// Home — the assistant/dentist "opens the day" dashboard (UJ-1, UJ-5).
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { DayTimeline } from '../timeline.jsx';
import { money, fmtTime, fullName, Avatar } from '../components.jsx';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';
import { appointmentRepo, visitRepo, inventoryRepo, patientRepo, userRepo, statsRepo } from '../lib/repos.js';

export const HomePage = ({ onNavigate, badges }) => {
  const { localUser, clinic } = useAuth();
  const [stats, setStats] = useState(null);
  const [appts, setAppts] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [low, setLow] = useState([]);
  const [owed, setOwed] = useState([]);
  const [providers, setProviders] = useState([]);

  const load = async () => {
    setStats(await statsRepo.today());
    setAppts(await appointmentRepo.forDay(new Date()));
    const visits = await visitRepo.openToday(new Date());
    setWaiting(visits.filter((v) => v.status !== 'completed'));
    setLow(await inventoryRepo.lowStock());
    setOwed((await patientRepo.outstanding()).slice(0, 5));
    setProviders(await userRepo.list());
  };
  useEffect(() => { load(); return onDataChanged(load); }, []);

  const currency = clinic?.currency || 'TND';
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greeting = (
    <div className="greeting">
      <h1>{hello}, <em>{localUser ? `Dr. ${localUser.last_name || localUser.first_name}` : ''}</em></h1>
      <span className="greeting-meta">
        {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        {stats ? ` · ${stats.appts} appointments` : ''}
      </span>
    </div>
  );

  const kpi = (label, value, foot, color) => (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={color ? { color } : undefined}>{value}</div>
      <div className="kpi-foot">{foot}</div>
    </div>
  );

  return (
    <div className="app">
      <Sidebar active="home" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar greeting={greeting} actions={
          <button className="btn-primary" onClick={() => onNavigate('calendar', { new: true })}>
            <Icon name="plus" size={14}/>New appointment
          </button>
        }/>
        <div className="page">
          <div className="kpis">
            {kpi('Appointments', stats ? stats.appts : '—', stats ? `${stats.done} completed` : '')}
            {kpi('Patients', stats ? stats.patients : '—', 'active records')}
            {kpi('Cash today', stats ? money(stats.cash, currency) : '—', 'payments received')}
            {kpi('Outstanding', stats ? money(stats.owed, currency) : '—', 'across all patients', stats && stats.owed > 0 ? 'var(--coral-700)' : undefined)}
            {kpi('Low stock', stats ? stats.low : '—', 'items at / below threshold', stats && stats.low > 0 ? 'var(--amber-700)' : undefined)}
          </div>

          <div className="card" style={{ minWidth: 0 }}>
            <div className="card-head">
              <span className="card-title"><Icon name="calendar" size={14}/>Today's schedule</span>
              <span className="card-sub">{appts.length} appointments</span>
              <div className="card-actions">
                <span className="tab active">Day</span>
                <a className="tab" onClick={() => onNavigate('calendar')}>Week</a>
                <a className="tab" onClick={() => onNavigate('calendar')}>Month</a>
              </div>
            </div>
            <DayTimeline appointments={appts} providers={providers} onPick={() => onNavigate('calendar')}/>
          </div>

          <div className="right-col">
            <div className="card">
              <div className="card-head"><span className="card-title"><Icon name="clock" size={14}/>Waiting room</span>
                <span className="card-sub" style={{ marginLeft: 'auto' }}>{waiting.length} in clinic</span></div>
              <div className="waiting-list">
                {waiting.map((v) => (
                  <div key={v.id} className="wait-row" onClick={() => onNavigate('patients', { patientId: v.patient_id })}>
                    <Avatar id={v.patient_id} first={v.first_name} last={v.last_name} size={30}/>
                    <div>
                      <div className="wait-name">{fullName(v)}</div>
                      <div className="wait-sub">since {fmtTime(v.started_at)}</div>
                    </div>
                    <span className={`wait-status ${v.status === 'in_progress' ? 's-prep' : 's-checkedin'}`}>
                      {v.status === 'in_progress' ? 'In chair' : 'Checked in'}
                    </span>
                  </div>
                ))}
                {!waiting.length && <div className="empty-pad">No one waiting</div>}
              </div>
            </div>

            <div className={`card ${low.length ? 'alerts-card' : ''}`}>
              <div className="card-head"><span className="card-title"><Icon name="alert-tri" size={14}/>Low stock</span>
                <a className="card-sub" style={{ marginLeft: 'auto' }} onClick={() => onNavigate('inventory')}>All →</a></div>
              {low.slice(0, 5).map((it) => (
                <div key={it.id} className="alert clickable" onClick={() => onNavigate('inventory')}>
                  <div className={`alert-icon ${it.on_hand_quantity === 0 ? 'crit' : 'warn'}`}><Icon name="package" size={14}/></div>
                  <div>
                    <div className="alert-title">{it.name}</div>
                    <div className="alert-sub">{it.on_hand_quantity} {it.unit} left · threshold {it.low_stock_threshold}</div>
                  </div>
                </div>
              ))}
              {!low.length && <div className="empty-pad">Stock levels are healthy</div>}
            </div>

            <div className="card">
              <div className="card-head"><span className="card-title"><Icon name="dollar" size={14}/>Outstanding balances</span>
                <a className="card-sub" style={{ marginLeft: 'auto' }} onClick={() => onNavigate('invoices')}>All →</a></div>
              {owed.map((p) => (
                <div key={p.id} className="wait-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}
                     onClick={() => onNavigate('patients', { patientId: p.id })}>
                  <Avatar id={p.id} first={p.first_name} last={p.last_name} size={30}/>
                  <div>
                    <div className="wait-name">{fullName(p)}</div>
                    <div className="wait-sub">{p.phone}</div>
                  </div>
                  <div className="wait-time"><strong style={{ color: 'var(--coral-700)' }}>{money(p.balance, currency)}</strong></div>
                </div>
              ))}
              {!owed.length && <div className="empty-pad">Everyone is paid up</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
