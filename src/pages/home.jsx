// Home — the assistant/dentist "opens the day" dashboard (UJ-1, UJ-5).
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { DayTimeline } from '../timeline.jsx';
import { money, fmtTime, fullName, Avatar } from '../components.jsx';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';
import { appointmentRepo, visitRepo, inventoryRepo, patientRepo, userRepo, statsRepo } from '../lib/repos.js';
import { t, locale } from '../lib/i18n.jsx';

const countAppointments = (n) => (n === 1 ? t('1 appointment') : t('{n} appointments', { n }));

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
  const hello = hour < 12 ? t('Good morning') : hour < 18 ? t('Good afternoon') : t('Good evening');
  const greeting = (
    <div className="greeting">
      <h1>{t('{greeting},', { greeting: hello })} <em>{localUser ? t('Dr. {name}', { name: localUser.last_name || localUser.first_name }) : ''}</em></h1>
      <span className="greeting-meta">
        {new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        {stats ? ` · ${countAppointments(stats.appts)}` : ''}
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
            <Icon name="plus" size={14}/>{t('New appointment')}
          </button>
        }/>
        <div className="page">
          <div className="kpis">
            {kpi(t('Appointments'), stats ? stats.appts : '—', stats ? t('{n} completed', { n: stats.done }) : '')}
            {kpi(t('Patients'), stats ? stats.patients : '—', t('active records'))}
            {kpi(t('Cash today'), stats ? money(stats.cash, currency) : '—', t('payments received'))}
            {kpi(t('Outstanding'), stats ? money(stats.owed, currency) : '—', t('across all patients'), stats && stats.owed > 0 ? 'var(--coral-700)' : undefined)}
            {kpi(t('Low stock'), stats ? stats.low : '—', t('items at / below threshold'), stats && stats.low > 0 ? 'var(--amber-700)' : undefined)}
          </div>

          <div className="card" style={{ minWidth: 0 }}>
            <div className="card-head">
              <span className="card-title"><Icon name="calendar" size={14}/>{t('Today\'s schedule')}</span>
              <span className="card-sub">{countAppointments(appts.length)}</span>
              <div className="card-actions">
                <span className="tab active">{t('Day')}</span>
                <a className="tab" onClick={() => onNavigate('calendar')}>{t('Week')}</a>
                <a className="tab" onClick={() => onNavigate('calendar')}>{t('Month')}</a>
              </div>
            </div>
            <DayTimeline appointments={appts} providers={providers} onPick={() => onNavigate('calendar')}/>
          </div>

          <div className="right-col">
            <div className="card">
              <div className="card-head"><span className="card-title"><Icon name="clock" size={14}/>{t('Waiting room')}</span>
                <span className="card-sub" style={{ marginInlineStart: 'auto' }}>{t('{n} in clinic', { n: waiting.length })}</span></div>
              <div className="waiting-list">
                {waiting.map((v) => (
                  <div key={v.id} className="wait-row" onClick={() => onNavigate('patients', { patientId: v.patient_id })}>
                    <Avatar id={v.patient_id} first={v.first_name} last={v.last_name} size={30}/>
                    <div>
                      <div className="wait-name">{fullName(v)}</div>
                      <div className="wait-sub">{t('since {time}', { time: fmtTime(v.started_at) })}</div>
                    </div>
                    <span className={`wait-status ${v.status === 'in_progress' ? 's-prep' : 's-checkedin'}`}>
                      {v.status === 'in_progress' ? t('In chair') : t('Checked in')}
                    </span>
                  </div>
                ))}
                {!waiting.length && <div className="empty-pad">{t('No one waiting')}</div>}
              </div>
            </div>

            <div className={`card ${low.length ? 'alerts-card' : ''}`}>
              <div className="card-head"><span className="card-title"><Icon name="alert-tri" size={14}/>{t('Low stock')}</span>
                <a className="card-sub" style={{ marginInlineStart: 'auto' }} onClick={() => onNavigate('inventory')}>{t('All →')}</a></div>
              {low.slice(0, 5).map((it) => (
                <div key={it.id} className="alert clickable" onClick={() => onNavigate('inventory')}>
                  <div className={`alert-icon ${it.on_hand_quantity === 0 ? 'crit' : 'warn'}`}><Icon name="package" size={14}/></div>
                  <div>
                    <div className="alert-title">{it.name}</div>
                    <div className="alert-sub">{t('{qty} {unit} left · threshold {threshold}', { qty: it.on_hand_quantity, unit: it.unit, threshold: it.low_stock_threshold })}</div>
                  </div>
                </div>
              ))}
              {!low.length && <div className="empty-pad">{t('Stock levels are healthy')}</div>}
            </div>

            <div className="card">
              <div className="card-head"><span className="card-title"><Icon name="dollar" size={14}/>{t('Outstanding balances')}</span>
                <a className="card-sub" style={{ marginInlineStart: 'auto' }} onClick={() => onNavigate('invoices')}>{t('All →')}</a></div>
              {owed.map((p) => (
                <div key={p.id} className="wait-row" style={{ gridTemplateColumns: 'auto 1fr auto' }}
                     onClick={() => onNavigate('patients', { patientId: p.id })}>
                  <Avatar id={p.id} first={p.first_name} last={p.last_name} size={30}/>
                  <div>
                    <div className="wait-name">{fullName(p)}</div>
                    <div className="wait-sub"><bdi className="ltr">{p.phone}</bdi></div>
                  </div>
                  <div className="wait-time"><strong style={{ color: 'var(--coral-700)' }}>{money(p.balance, currency)}</strong></div>
                </div>
              ))}
              {!owed.length && <div className="empty-pad">{t('Everyone is paid up')}</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
