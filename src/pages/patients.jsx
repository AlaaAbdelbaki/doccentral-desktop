// Patient management (Epic 3) + treatment plans (Epic 6) + patient attachments.
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { Modal, Field, money, fmtDate, fmtDateTime, age, fullName, Avatar, StatusPill, EmptyState, toDateInput } from '../components.jsx';
import { patientRepo, planRepo, visitRepo, invoiceRepo, attachmentRepo, appointmentRepo } from '../lib/repos.js';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';
import { VisitModal } from '../visit-modal.jsx';

const PatientFormModal = ({ patient, onClose }) => {
  const [form, setForm] = useState({
    first_name: patient?.first_name || '', last_name: patient?.last_name || '',
    date_of_birth: patient ? toDateInput(patient.date_of_birth) : '',
    phone: patient?.phone || '', email: patient?.email || '',
    history_notes: patient?.history_notes || '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    const fields = { ...form, email: form.email || null, history_notes: form.history_notes || null };
    if (patient) await patientRepo.update(patient.id, fields);
    else await patientRepo.create(fields);
    onClose();
  };
  const valid = form.first_name && form.last_name && form.date_of_birth && form.phone;
  return (
    <Modal title={patient ? 'Edit patient' : 'Add patient'} onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!valid} onClick={save}><Icon name="check" size={13}/>Save</button>
      </>}>
      <div className="form-row">
        <Field label="First name"><input required value={form.first_name} onChange={set('first_name')}/></Field>
        <Field label="Last name"><input required value={form.last_name} onChange={set('last_name')}/></Field>
      </div>
      <div className="form-row">
        <Field label="Date of birth"><input type="date" value={form.date_of_birth} onChange={set('date_of_birth')}/></Field>
        <Field label="Phone"><input value={form.phone} onChange={set('phone')} placeholder="+216 …"/></Field>
      </div>
      <Field label="Email (optional)"><input type="email" value={form.email} onChange={set('email')}/></Field>
      <Field label="History notes (paper-file backfill)">
        <textarea value={form.history_notes} onChange={set('history_notes')}
          placeholder="Allergies, prior treatments, paper folder summary…"/>
      </Field>
    </Modal>
  );
};

const PlanTab = ({ patient, currency }) => {
  const [plan, setPlan] = useState([]);
  const [adding, setAdding] = useState(false);
  const [row, setRow] = useState({ name: '', tooth: '', price: '', date: '' });
  const load = () => planRepo.forPatient(patient.id).then(setPlan);
  useEffect(() => { load(); }, [patient.id]);

  const add = async () => {
    await planRepo.create({
      patient_id: patient.id, procedure_name: row.name, tooth_number: row.tooth || '—',
      estimated_unit_price: Number(row.price) || 0, target_date: row.date ? new Date(row.date).toISOString() : null,
    });
    setRow({ name: '', tooth: '', price: '', date: '' }); setAdding(false); load();
  };

  const remaining = plan.filter((p) => !['done', 'cancelled'].includes(p.status))
    .reduce((s, p) => s + p.estimated_unit_price, 0);

  return (
    <div className="card table-card">
      <div className="card-head">
        <span className="card-title">Treatment plan</span>
        <span className="card-sub" style={{ marginLeft: 'auto' }}>est. {money(remaining, currency)} remaining</span>
        <button className="btn-ghost" onClick={() => setAdding(true)}><Icon name="plus" size={12}/>Add</button>
      </div>
      <table className="dtable">
        <thead><tr><th>#</th><th>Tooth</th><th>Procedure</th><th>Target</th><th>Status</th><th style={{ textAlign: 'right' }}>Est. fee</th><th/></tr></thead>
        <tbody>
          {plan.map((p) => (
            <tr key={p.id}>
              <td className="num">{p.sequence_number}</td>
              <td className="num" style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{p.tooth_number}</td>
              <td style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{p.procedure_name}</td>
              <td>{p.target_date ? fmtDate(p.target_date) : 'Next available'}</td>
              <td><StatusPill status={p.status}/></td>
              <td className="num" style={{ textAlign: 'right' }}>{money(p.estimated_unit_price, currency)}</td>
              <td style={{ textAlign: 'right' }}>
                {p.status === 'planned' && (
                  <button className="btn-ghost" onClick={async () => { await planRepo.cancel(p.id); load(); }}><Icon name="x" size={12}/></button>
                )}
              </td>
            </tr>
          ))}
          {!plan.length && <tr><td colSpan={7}><EmptyState icon="tooth" title="No treatment plan yet" hint="Plan multi-session treatments and schedule them as appointments."/></td></tr>}
        </tbody>
      </table>
      {adding && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 140px auto', gap: 8, padding: 12, borderTop: '1px solid var(--ink-150)' }}>
          <input className="input-text" placeholder="Procedure" value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })}/>
          <input className="input-text" placeholder="Tooth" value={row.tooth} onChange={(e) => setRow({ ...row, tooth: e.target.value })}/>
          <input className="input-text" placeholder="Est. price" type="number" value={row.price} onChange={(e) => setRow({ ...row, price: e.target.value })}/>
          <input className="input-text" type="date" value={row.date} onChange={(e) => setRow({ ...row, date: e.target.value })}/>
          <button className="btn-ghost" disabled={!row.name} onClick={add}><Icon name="check" size={12}/>Add</button>
        </div>
      )}
    </div>
  );
};

const VisitsTab = ({ patient, currency, onOpenVisit }) => {
  const [visits, setVisits] = useState([]);
  useEffect(() => { visitRepo.forPatient(patient.id).then(setVisits); }, [patient.id]);
  return (
    <div className="card">
      <div className="card-head"><span className="card-title">Visits</span>
        <span className="card-sub" style={{ marginLeft: 'auto' }}>{visits.length} total</span></div>
      <div className="card-body">
        <div className="timeline-v">
          {visits.map((v) => (
            <div key={v.id} className={`tl-item ${v.status === 'completed' ? 'done' : ''} clickable`} onClick={() => onOpenVisit(v)}>
              <div className="tl-date">{fmtDateTime(v.started_at)}</div>
              <div className="tl-title">{v.diagnosis || 'Visit'} <StatusPill status={v.status}/></div>
              <div className="tl-sub">{v.clinical_notes || 'Open to record treatments and notes'}</div>
            </div>
          ))}
          {!visits.length && <EmptyState icon="clock" title="No visits yet" hint="Check the patient in from the calendar to start a visit."/>}
        </div>
      </div>
    </div>
  );
};

const ChartTab = ({ patient }) => {
  const [sel, setSel] = useState(null);
  const [states, setStates] = useState({});
  useEffect(() => {
    (async () => {
      const visits = await visitRepo.forPatient(patient.id);
      const map = {};
      for (const v of visits) {
        for (const t of await visitRepo.treatments(v.id)) {
          const n = parseInt(t.tooth_number, 10);
          if (!Number.isNaN(n) && n >= 1 && n <= 32) {
            map[n] = /extract/i.test(t.procedure_name) ? 'missing'
              : /crown/i.test(t.procedure_name) ? 'crown' : 'filling';
          }
        }
      }
      for (const p of await planRepo.forPatient(patient.id)) {
        const n = parseInt(p.tooth_number, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 32 && !map[n] && p.status !== 'cancelled') map[n] = 'watch';
      }
      setStates(map);
    })();
  }, [patient.id]);

  const label = (s) => s === 'watch' ? 'Planned treatment' : s === 'filling' ? 'Treated (restoration)'
    : s === 'crown' ? 'Crown' : s === 'missing' ? 'Missing / extracted' : 'Sound';
  const Tooth = ({ n }) => (
    <div className={`big-tooth ${states[n] || ''} ${sel === n ? 'selected' : ''}`} onClick={() => setSel(n)}>
      <div className="tglyph"><Icon name="tooth" size={13}/></div>
      <div className="tn">{n}</div>
    </div>
  );
  return (
    <div className="grid-main-side">
      <div className="odontogram">
        <div className="arch">
          <div className="arch-label">Upper arch · Maxillary (1–16)</div>
          <div className="tooth-row">{Array.from({ length: 16 }, (_, i) => i + 1).map((n) => <Tooth key={n} n={n}/>)}</div>
        </div>
        <div className="arch">
          <div className="arch-label">Lower arch · Mandibular (17–32)</div>
          <div className="tooth-row">{Array.from({ length: 16 }, (_, i) => 32 - i).map((n) => <Tooth key={n} n={n}/>)}</div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--ink-100)' }}>
          {[['Sound', 'var(--white)', 'var(--ink-200)'], ['Treated', 'var(--blue-50)', 'var(--blue-300)'], ['Crown', 'var(--amber-50)', 'var(--amber-200)'], ['Planned', 'var(--coral-50)', 'var(--coral-200)'], ['Missing', 'var(--ink-50)', 'var(--ink-300)']].map(([l, bg, bc]) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-600)' }}>
              <i style={{ width: 14, height: 14, borderRadius: 4, background: bg, border: `1.5px solid ${bc}` }}></i>{l}
            </span>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><span className="card-title">Tooth {sel ? `#${sel}` : ''}</span></div>
        <div className="card-body">
          {sel
            ? <div className="dl-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div><label>Condition</label><div className="v">{label(states[sel])}</div></div>
              </div>
            : <div className="empty-pad">Select a tooth</div>}
        </div>
      </div>
    </div>
  );
};

const OverviewTab = ({ patient, currency, onEdit, onDelete }) => {
  const { localUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [attachments, setAttachments] = useState([]);
  const [nextAppt, setNextAppt] = useState(null);
  const [lastVisit, setLastVisit] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = async () => {
    setBalance(await patientRepo.balanceOf(patient.id));
    setAttachments(await attachmentRepo.forPatient(patient.id));
    const appts = await appointmentRepo.forPatient(patient.id);
    setNextAppt(appts.find((a) => a.status === 'scheduled' && new Date(a.start_time) > new Date()) || null);
    const visits = await visitRepo.forPatient(patient.id);
    setLastVisit(visits[0] || null);
  };
  useEffect(() => { load(); }, [patient.id]);

  const upload = async () => {
    const picked = await window.dc.files.pick();
    if (!picked) return;
    const imported = await window.dc.files.import(picked.path);
    await attachmentRepo.create({
      target_type: 'patient', target_id: patient.id, file_name: imported.name,
      storage_path: imported.storagePath, file_size_bytes: imported.size,
      uploaded_by_user_id: localUser.id,
    });
    load();
  };

  const openAttachment = async (a) => {
    const dataUrl = await window.dc.files.dataUrl(a.storage_path);
    if (dataUrl) setPreview({ ...a, dataUrl });
    else window.dc.files.open(a.storage_path);
  };

  return (
    <div className="grid-main-side">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-head"><span className="card-title">Overview</span>
            <div className="card-actions">
              <button className="btn-ghost" onClick={onEdit}><Icon name="settings" size={12}/>Edit</button>
              <button className="btn-danger" onClick={onDelete}><Icon name="x" size={12}/>Delete</button>
            </div>
          </div>
          <div className="card-body">
            <div className="dl-grid">
              <div><label>Date of birth</label><div className="v">{fmtDate(patient.date_of_birth)} · {age(patient.date_of_birth)} yrs</div></div>
              <div><label>Phone</label><div className="v">{patient.phone}</div></div>
              <div><label>Email</label><div className="v">{patient.email || '—'}</div></div>
              <div><label>Next appointment</label><div className="v">{nextAppt ? fmtDateTime(nextAppt.start_time) : '—'}</div></div>
              <div><label>Last visit</label><div className="v">{lastVisit ? fmtDate(lastVisit.started_at) : '—'}</div></div>
              <div><label>Balance</label><div className="v" style={{ color: balance > 0 ? 'var(--coral-700)' : undefined }}>{money(balance, currency)}</div></div>
            </div>
          </div>
        </div>
        {patient.history_notes && (
          <div className="card">
            <div className="card-head"><span className="card-title">History notes</span><span className="card-sub" style={{ marginLeft: 'auto' }}>paper-file backfill</span></div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--ink-800)', whiteSpace: 'pre-wrap' }}>{patient.history_notes}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card">
          <div className="card-head"><span className="card-title">Balance</span></div>
          <div className="card-body">
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 500, color: balance > 0 ? 'var(--coral-700)' : 'var(--ink-900)' }}>{money(balance, currency)}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 4 }}>{balance > 0 ? 'Outstanding balance' : 'Paid in full'}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><span className="card-title">Attachments</span>
            <button className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={upload}><Icon name="plus" size={12}/>Upload</button></div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attachments.map((a) => (
              <div key={a.id} className="row-flex clickable" style={{ fontSize: 13 }} onClick={() => openAttachment(a)}>
                <Icon name="file-text" size={14} style={{ color: 'var(--ink-400)' }}/>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.file_name}</span>
                <span style={{ color: 'var(--ink-400)', fontSize: 11.5 }}>{fmtDate(a.created_at)}</span>
              </div>
            ))}
            {!attachments.length && <div className="empty-pad" style={{ padding: '10px 0' }}>No files yet</div>}
          </div>
        </div>
      </div>
      {preview && (
        <Modal wide title={preview.file_name} onClose={() => setPreview(null)}
          footer={<button className="btn-ghost" onClick={() => window.dc.files.open(preview.storage_path)}>Open in system viewer</button>}>
          <img className="attach-preview" src={preview.dataUrl} alt={preview.file_name}/>
        </Modal>
      )}
    </div>
  );
};

export const PatientsPage = ({ onNavigate, badges, params }) => {
  const { clinic } = useAuth();
  const currency = clinic?.currency || 'TND';
  const [patients, setPatients] = useState([]);
  const [owedIds, setOwedIds] = useState(new Set());
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [selId, setSelId] = useState(params?.patientId || null);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState(null);

  const load = async () => {
    const list = await patientRepo.list();
    setPatients(list);
    setOwedIds(new Set((await patientRepo.outstanding()).map((p) => p.id)));
    if (!selId && list.length) setSelId(list[0].id);
  };
  useEffect(() => { load(); return onDataChanged(load); }, []);

  const filtered = useMemo(() => patients.filter((p) => {
    const mq = fullName(p).toLowerCase().includes(q.toLowerCase()) || (p.phone || '').includes(q);
    const mf = filter === 'all' ? true : filter === 'balance' ? owedIds.has(p.id) : true;
    return mq && mf;
  }), [patients, q, filter, owedIds]);

  const sel = patients.find((p) => p.id === selId) || null;

  return (
    <div className="app">
      <Sidebar active="patients" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>Patients</span>}
          subtitle={`${patients.length} active records`}
          actions={<button className="btn-primary" onClick={() => setModal({ kind: 'add' })}><Icon name="plus" size={14}/>Add patient</button>}/>
        <div className="content pad-0">
          <div className="split">
            <div className="split-list">
              <div style={{ padding: 12, borderBottom: '1px solid var(--ink-150)' }}>
                <div className="search-inline" style={{ minWidth: 0 }}>
                  <Icon name="search" size={14}/>
                  <input placeholder="Search name or phone…" value={q} onChange={(e) => setQ(e.target.value)}/>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {[['all', 'All'], ['balance', 'With balance']].map(([k, l]) => (
                    <button key={k} className={`chip ${filter === k ? 'active' : ''}`} style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setFilter(k)}>{l}</button>
                  ))}
                </div>
              </div>
              {filtered.map((p) => (
                <div key={p.id} className={`list-row ${selId === p.id ? 'active' : ''}`} onClick={() => { setSelId(p.id); setTab('overview'); }}>
                  <Avatar id={p.id} first={p.first_name} last={p.last_name}/>
                  <div style={{ minWidth: 0 }}>
                    <div className="lr-title">{fullName(p)}</div>
                    <div className="lr-sub">{p.phone}</div>
                  </div>
                  {owedIds.has(p.id) && <Icon name="dollar" size={14} style={{ color: 'var(--coral-500)', marginLeft: 'auto' }}/>}
                </div>
              ))}
              {!filtered.length && <div className="empty-pad">No patients match</div>}
            </div>
            <div className="split-detail">
              {sel ? (
                <div style={{ padding: 22 }}>
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 16, padding: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Avatar id={sel.id} first={sel.first_name} last={sel.last_name} size={56}/>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, letterSpacing: '-0.015em', color: 'var(--ink-900)' }}>{fullName(sel)}</div>
                        <div className="drawer-meta">{age(sel.date_of_birth)} yrs · {sel.phone}</div>
                      </div>
                      {owedIds.has(sel.id)
                        ? <span className="pill coral"><span className="pdot"/>Balance due</span>
                        : <span className="pill mint"><span className="pdot"/>Active</span>}
                      <button className="btn-primary" onClick={() => onNavigate('calendar', { new: true })}><Icon name="calendar" size={14}/>Book visit</button>
                    </div>
                    <div style={{ display: 'flex', gap: 4, padding: '0 16px', borderTop: '1px solid var(--ink-100)' }}>
                      {[['overview', 'Overview'], ['plan', 'Treatment plan'], ['visits', 'Visits'], ['chart', 'Dental chart']].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k)} style={{
                          border: 'none', background: 'transparent', padding: '12px 14px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          color: tab === k ? 'var(--blue-700)' : 'var(--ink-500)',
                          boxShadow: tab === k ? 'inset 0 -2px 0 var(--blue-500)' : 'none',
                        }}>{l}</button>
                      ))}
                    </div>
                  </div>
                  {tab === 'overview' && (
                    <OverviewTab patient={sel} currency={currency}
                      onEdit={() => setModal({ kind: 'edit', patient: sel })}
                      onDelete={() => setModal({ kind: 'delete', patient: sel })}/>
                  )}
                  {tab === 'plan' && <PlanTab patient={sel} currency={currency}/>}
                  {tab === 'visits' && <VisitsTab patient={sel} currency={currency} onOpenVisit={(v) => setModal({ kind: 'visit', visit: v })}/>}
                  {tab === 'chart' && <ChartTab patient={sel}/>}
                </div>
              ) : <EmptyState icon="users" title="No patient selected" hint="Add your first patient to get started."/>}
            </div>
          </div>
        </div>
      </main>

      {modal?.kind === 'add' && <PatientFormModal onClose={() => setModal(null)}/>}
      {modal?.kind === 'edit' && <PatientFormModal patient={modal.patient} onClose={() => setModal(null)}/>}
      {modal?.kind === 'delete' && (
        <Modal title="Delete patient" onClose={() => setModal(null)}
          footer={<>
            <button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-danger" onClick={async () => {
              await patientRepo.remove(modal.patient.id);
              setSelId(null); setModal(null);
            }}><Icon name="x" size={13}/>Delete (soft)</button>
          </>}>
          <div style={{ fontSize: 13.5 }}>
            Remove <b>{fullName(modal.patient)}</b> from the roster? The record is soft-deleted
            and kept in the database for history and sync.
          </div>
        </Modal>
      )}
      {modal?.kind === 'visit' && sel && (
        <VisitModal visit={modal.visit} patientName={fullName(sel)} currency={currency} onClose={() => setModal(null)}/>
      )}
    </div>
  );
};
