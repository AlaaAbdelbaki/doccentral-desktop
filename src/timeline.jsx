// Day timeline (DentaCore schedule component) driven by real appointments.
// Columns are the clinic's staff users (solo practice → dentist + assistant).
import { Icon } from './icons.jsx';
import { fmtTime } from './components.jsx';

const HOUR_PX = 60;
const START_HOUR = 8;
const END_HOUR = 18;

const typeClass = (appt) => {
  const r = (appt.reason || '').toLowerCase();
  if (appt.status === 'cancelled' || appt.status === 'no_show') return 't-consult';
  if (r.includes('emergency') || r.includes('urgen')) return 't-emerg';
  if (r.includes('extraction') || r.includes('surgery') || r.includes('root canal') || r.includes('implant')) return 't-surgery';
  if (r.includes('scaling') || r.includes('polish') || r.includes('cleaning') || r.includes('prophy')) return 't-cleaning';
  if (r.includes('ortho') || r.includes('align')) return 't-ortho';
  if (r.includes('consult')) return 't-consult';
  return 't-checkup';
};

const hourOf = (iso) => {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
};

export const DayTimeline = ({ appointments, providers, onPick, showNowLine = true }) => {
  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);
  const fmtH = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`;

  const now = new Date();
  const nowHour = now.getHours() + now.getMinutes() / 60;
  const showNow = showNowLine && nowHour >= START_HOUR && nowHour <= END_HOUR;
  const cols = providers.length ? providers : [{ id: '_', first_name: 'Clinic', last_name: '' }];

  return (
    <div className="schedule-wrap">
      <div className="schedule-toolbar">
        <div className="date-pill"><span>{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
        <div className="legend">
          <span><i style={{ background: 'var(--blue-200)' }}/>Exam</span>
          <span><i style={{ background: 'var(--mint-200)' }}/>Hygiene</span>
          <span><i style={{ background: 'var(--coral-200)' }}/>Surgery</span>
          <span><i style={{ background: 'var(--amber-200)' }}/>Emergency</span>
        </div>
      </div>
      <div className="schedule" style={{ gridTemplateColumns: `56px repeat(${cols.length}, 1fr)` }}>
        <div className="sch-head" style={{ background: 'var(--white)' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-500)', fontWeight: 500 }}>Time</span>
        </div>
        {cols.map((u) => (
          <div key={u.id} className="sch-head">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="sch-head-status busy"/>
              {u.first_name} {u.last_name}
            </div>
            <div className="sch-head-meta">{u.is_clinic_owner ? 'Dentist' : 'Staff'}</div>
          </div>
        ))}
        <div className="sch-time-col">
          {hours.map((h) => <div key={h} className="sch-hour">{fmtH(h)}</div>)}
        </div>
        {cols.map((u, ci) => (
          <div key={u.id} className="sch-chair-col" style={{ height: hours.length * HOUR_PX }}>
            {appointments
              // Unknown/empty provider ids fall back to the first column so an
              // appointment can never be silently invisible in day view.
              .filter((a) => (u.id === '_' ? true
                : a.assigned_user_id === u.id || (ci === 0 && !cols.some((c) => c.id === a.assigned_user_id))))
              .map((a) => {
                const start = hourOf(a.start_time);
                const end = hourOf(a.end_time);
                const top = (start - START_HOUR) * HOUR_PX;
                const h = Math.max((end - start) * HOUR_PX - 4, 26);
                const stateCls = a.status === 'completed' ? ' done'
                  : a.status === 'checked_in' ? ' in-progress' : '';
                return (
                  <div key={a.id} className={`appt ${typeClass(a)}${stateCls}`}
                       style={{ top, height: h, opacity: ['cancelled', 'no_show', 'rescheduled'].includes(a.status) ? 0.45 : undefined }}
                       onClick={() => onPick && onPick(a)}
                       title={`${a.first_name} ${a.last_name} — ${a.reason || ''}`}>
                    <div className="appt-time">{fmtTime(a.start_time)}–{fmtTime(a.end_time)}</div>
                    <div className="appt-name">{a.first_name} {a.last_name}</div>
                    <div className="appt-meta">
                      {['cancelled', 'no_show'].includes(a.status) && <Icon name="x" size={10}/>}
                      <span>{a.reason || '—'}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
        {showNow && <div className="now-line" style={{ top: 41 + (nowHour - START_HOUR) * HOUR_PX }}/>}
      </div>
    </div>
  );
};
