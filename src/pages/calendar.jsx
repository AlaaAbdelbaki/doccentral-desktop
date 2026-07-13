// Calendar & appointments (Epic 4): day/week/month views, create/edit,
// cancel/reschedule with reason, check-in, status filters.
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { DayTimeline } from '../timeline.jsx';
import { Modal, Field, StatusPill, fmtTime, fullName, toDateInput, toTimeInput, combineDateTime, Avatar } from '../components.jsx';
import { appointmentRepo, patientRepo, userRepo, visitRepo } from '../lib/repos.js';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';
import { VisitModal } from '../visit-modal.jsx';

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); x.setHours(0, 0, 0, 0); return x; };

const AppointmentModal = ({ appt, defaults, patients, providers, onClose }) => {
  const [form, setForm] = useState({
    patient_id: appt?.patient_id || defaults?.patientId || patients[0]?.id || '',
    assigned_user_id: appt?.assigned_user_id || providers[0]?.id || '',
    date: toDateInput(appt?.start_time || defaults?.date),
    start: toTimeInput(appt?.start_time || null),
    end: appt ? toTimeInput(appt.end_time) : null,
    reason: appt?.reason || '',
    notes: appt?.notes || '',
  });
  if (form.end === null) {
    const d = new Date(); d.setHours(d.getHours() + 1);
    form.end = toTimeInput(d.toISOString());
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const fields = {
      patient_id: form.patient_id, assigned_user_id: form.assigned_user_id,
      start_time: combineDateTime(form.date, form.start),
      end_time: combineDateTime(form.date, form.end),
      reason: form.reason || null, notes: form.notes || null,
    };
    if (appt) await appointmentRepo.update(appt.id, fields);
    else await appointmentRepo.create(fields);
    onClose();
  };

  return (
    <Modal title={appt ? 'Edit appointment' : 'New appointment'} onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={save} disabled={!form.patient_id}><Icon name="check" size={13}/>Save</button>
      </>}>
      <Field label="Patient">
        <select value={form.patient_id} onChange={set('patient_id')}>
          {patients.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
        </select>
      </Field>
      <Field label="Provider">
        <select value={form.assigned_user_id} onChange={set('assigned_user_id')}>
          {providers.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
        </select>
      </Field>
      <div className="form-row">
        <Field label="Date"><input type="date" value={form.date} onChange={set('date')}/></Field>
        <div className="form-row">
          <Field label="Start"><input type="time" value={form.start} onChange={set('start')}/></Field>
          <Field label="End"><input type="time" value={form.end} onChange={set('end')}/></Field>
        </div>
      </div>
      <Field label="Reason / planned treatment"><input value={form.reason} onChange={set('reason')} placeholder="e.g. Root canal #30 — session 2"/></Field>
      <Field label="Notes"><textarea value={form.notes} onChange={set('notes')}/></Field>
    </Modal>
  );
};

const CancelModal = ({ appt, onClose }) => {
  const { localUser } = useAuth();
  const [reason, setReason] = useState('patient_cancelled');
  const [notes, setNotes] = useState('');
  const [reDate, setReDate] = useState(toDateInput(addDays(new Date(), 1).toISOString()));
  const [reStart, setReStart] = useState(toTimeInput(appt.start_time));
  const [reEnd, setReEnd] = useState(toTimeInput(appt.end_time));

  const confirm = async () => {
    const replacement = reason === 'rescheduled' ? {
      patient_id: appt.patient_id, assigned_user_id: appt.assigned_user_id,
      start_time: combineDateTime(reDate, reStart), end_time: combineDateTime(reDate, reEnd),
      reason: appt.reason, notes: appt.notes,
    } : null;
    await appointmentRepo.cancel(appt.id, reason, notes, localUser.id, replacement);
    onClose();
  };

  return (
    <Modal title={`Cancel — ${appt.first_name} ${appt.last_name}`} onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Keep appointment</button>
        <button className="btn-danger" onClick={confirm}><Icon name="x" size={13}/>Confirm cancellation</button>
      </>}>
      <Field label="Reason">
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="patient_cancelled">Patient cancelled</option>
          <option value="no_show">No-show</option>
          <option value="clinic_cancelled">Clinic cancelled</option>
          <option value="rescheduled">Rescheduled</option>
        </select>
      </Field>
      {reason === 'rescheduled' && (
        <div className="form-row">
          <Field label="New date"><input type="date" value={reDate} onChange={(e) => setReDate(e.target.value)}/></Field>
          <div className="form-row">
            <Field label="Start"><input type="time" value={reStart} onChange={(e) => setReStart(e.target.value)}/></Field>
            <Field label="End"><input type="time" value={reEnd} onChange={(e) => setReEnd(e.target.value)}/></Field>
          </div>
        </div>
      )}
      <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional context…"/></Field>
    </Modal>
  );
};

const ApptActions = ({ appt, onClose, onEdit, onCancel, onVisit }) => {
  const { localUser } = useAuth();
  const [visit, setVisit] = useState(null);
  useEffect(() => { visitRepo.byAppointment(appt.id).then(setVisit); }, [appt.id]);
  const active = ['scheduled'].includes(appt.status);
  return (
    <Modal title={`${appt.first_name} ${appt.last_name}`} onClose={onClose}
      footer={<>
        {active && <button className="btn-ghost" onClick={() => onEdit(appt)}><Icon name="calendar" size={13}/>Edit</button>}
        {active && <button className="btn-danger" onClick={() => onCancel(appt)}>Cancel / reschedule</button>}
        {active && (
          <button className="btn-primary" onClick={async () => {
            const v = await appointmentRepo.checkIn(appt, localUser.id);
            onVisit(v, `${appt.first_name} ${appt.last_name}`);
          }}><Icon name="check" size={13}/>Check in</button>
        )}
        {visit && (
          <button className="btn-primary" onClick={() => onVisit(visit, `${appt.first_name} ${appt.last_name}`)}>
            <Icon name="arrow-right" size={13}/>Open visit
          </button>
        )}
      </>}>
      <div className="dl-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div><label>When</label><div className="v">{new Date(appt.start_time).toLocaleDateString()} · {fmtTime(appt.start_time)}–{fmtTime(appt.end_time)}</div></div>
        <div><label>Status</label><div className="v"><StatusPill status={appt.status}/></div></div>
        <div><label>Reason</label><div className="v">{appt.reason || '—'}</div></div>
        <div><label>Notes</label><div className="v">{appt.notes || '—'}</div></div>
      </div>
    </Modal>
  );
};

export const CalendarPage = ({ onNavigate, badges, params }) => {
  const { clinic } = useAuth();
  const [view, setView] = useState('day');
  const [date, setDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('all');
  const [appts, setAppts] = useState([]);
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [modal, setModal] = useState(params?.new ? { kind: 'new' } : null);

  const range = useMemo(() => {
    if (view === 'day') { const s = new Date(date); s.setHours(0, 0, 0, 0); return [s, addDays(s, 1)]; }
    if (view === 'week') { const s = startOfWeek(date); return [s, addDays(s, 7)]; }
    const s = new Date(date.getFullYear(), date.getMonth(), 1);
    return [s, new Date(date.getFullYear(), date.getMonth() + 1, 1)];
  }, [view, date]);

  const load = async () => {
    setAppts(await appointmentRepo.forRange(range[0].toISOString(), range[1].toISOString()));
    setPatients(await patientRepo.list());
    setProviders(await userRepo.list());
  };
  useEffect(() => { load(); return onDataChanged(load); }, [range]);

  const filtered = appts.filter((a) => statusFilter === 'all' ? true : a.status === statusFilter);
  const step = view === 'day' ? 1 : view === 'week' ? 7 : 30;

  const openVisit = (visit, name) => setModal({ kind: 'visit', visit, name });

  const weekDays = view === 'week' ? [...Array(6)].map((_, i) => addDays(startOfWeek(date), i)) : [];
  const monthCells = useMemo(() => {
    if (view !== 'month') return [];
    const first = new Date(date.getFullYear(), date.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const dim = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return [...Array(offset).fill(null), ...Array(dim)].map((v, i) => (i < offset ? null : i - offset + 1));
  }, [view, date]);

  return (
    <div className="app">
      <Sidebar active="calendar" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar
          title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>Calendar</span>}
          subtitle={date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          actions={<button className="btn-primary" onClick={() => setModal({ kind: 'new' })}><Icon name="plus" size={14}/>New appointment</button>}
        />
        <div className="content">
          <div className="toolbar">
            <div className="seg">
              {['day', 'week', 'month'].map((v) => (
                <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
              ))}
            </div>
            {['all', 'scheduled', 'checked_in', 'completed', 'cancelled', 'no_show'].map((s) => (
              <button key={s} className={`chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
            <div className="spacer" style={{ marginLeft: 'auto' }}/>
            <button className="btn-ghost" onClick={() => setDate(addDays(date, -step))}><Icon name="chevron-left" size={13}/></button>
            <button className="btn-ghost" onClick={() => setDate(new Date())}>Today</button>
            <button className="btn-ghost" onClick={() => setDate(addDays(date, step))}><Icon name="chevron-right" size={13}/></button>
          </div>

          <div className="card" style={{ minWidth: 0 }}>
            <div className="card-head">
              <span className="card-title"><Icon name="calendar" size={14}/>
                {view === 'day' ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
                  : view === 'week' ? `Week of ${startOfWeek(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  : date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <span className="card-sub">{filtered.length} appointments</span>
            </div>

            {view === 'day' && (
              <DayTimeline appointments={filtered} providers={providers}
                onPick={(a) => setModal({ kind: 'actions', appt: a })} showNowLine={new Date().toDateString() === date.toDateString()}/>
            )}

            {view === 'week' && (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(6, 1fr)`, fontSize: 12 }}>
                {weekDays.map((d) => (
                  <div key={d.toISOString()} className="sch-head clickable" onClick={() => { setDate(d); setView('day'); }}>
                    {d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
                  </div>
                ))}
                {weekDays.map((d) => {
                  const dayAppts = filtered.filter((a) => new Date(a.start_time).toDateString() === d.toDateString());
                  return (
                    <div key={d.toISOString()} style={{ minHeight: 340, borderRight: '1px solid var(--ink-150)', padding: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dayAppts.map((a) => (
                        <div key={a.id} className={`appt t-checkup ${a.status === 'completed' ? 'done' : ''}`}
                             style={{ position: 'static' }} onClick={() => setModal({ kind: 'actions', appt: a })}>
                          <div className="appt-time">{fmtTime(a.start_time)}</div>
                          <div className="appt-name">{a.first_name} {a.last_name}</div>
                          <div className="appt-meta">{a.reason || ''}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {view === 'month' && (
              <div style={{ padding: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: 4 }}>{d}</div>
                  ))}
                  {monthCells.map((d, i) => {
                    const cellDate = d ? new Date(date.getFullYear(), date.getMonth(), d) : null;
                    const n = d ? filtered.filter((a) => new Date(a.start_time).toDateString() === cellDate.toDateString()).length : 0;
                    const isToday = cellDate && cellDate.toDateString() === new Date().toDateString();
                    return (
                      <div key={i} className={d ? 'clickable' : ''}
                        onClick={() => { if (d) { setDate(cellDate); setView('day'); } }}
                        style={{
                          minHeight: 74, borderRadius: 8, padding: 8,
                          border: '1px solid var(--ink-150)',
                          background: isToday ? 'var(--blue-50)' : d ? 'var(--white)' : 'transparent',
                          borderColor: isToday ? 'var(--blue-200)' : 'var(--ink-150)',
                        }}>
                        {d && <>
                          <div style={{ fontSize: 12.5, fontWeight: isToday ? 700 : 600, color: isToday ? 'var(--blue-700)' : 'var(--ink-700)' }}>{d}</div>
                          {n > 0 && <div style={{ marginTop: 6 }}><span className="pill blue" style={{ padding: '1px 7px' }}>{n} appt{n > 1 ? 's' : ''}</span></div>}
                        </>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {modal?.kind === 'new' && <AppointmentModal defaults={{ date: date.toISOString() }} patients={patients} providers={providers} onClose={() => setModal(null)}/>}
      {modal?.kind === 'edit' && <AppointmentModal appt={modal.appt} patients={patients} providers={providers} onClose={() => setModal(null)}/>}
      {modal?.kind === 'actions' && (
        <ApptActions appt={modal.appt} onClose={() => setModal(null)}
          onEdit={(a) => setModal({ kind: 'edit', appt: a })}
          onCancel={(a) => setModal({ kind: 'cancel', appt: a })}
          onVisit={openVisit}/>
      )}
      {modal?.kind === 'cancel' && <CancelModal appt={modal.appt} onClose={() => setModal(null)}/>}
      {modal?.kind === 'visit' && (
        <VisitModal visit={modal.visit} patientName={modal.name} currency={clinic?.currency || 'TND'}
          onClose={() => setModal(null)} onInvoice={() => {}}/>
      )}
    </div>
  );
};
