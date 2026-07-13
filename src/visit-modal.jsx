// Visit workflow modal (Epic 5): checked_in → in_progress → completed,
// performed treatments, clinical notes, auto-generated draft invoice on completion.
import { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';
import { Modal, Field, money, fmtDateTime, StatusPill } from './components.jsx';
import { visitRepo, planRepo, invoiceRepo } from './lib/repos.js';
import { useAuth } from './lib/auth.jsx';

export const VisitModal = ({ visit: initial, patientName, currency, onClose, onInvoice }) => {
  const { localUser } = useAuth();
  const [visit, setVisit] = useState(initial);
  const [treatments, setTreatments] = useState([]);
  const [planned, setPlanned] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [diag, setDiag] = useState(initial.diagnosis || '');
  const [notes, setNotes] = useState(initial.clinical_notes || '');
  const [row, setRow] = useState({ tooth: '', name: '', price: '', qty: 1 });

  const reload = async () => {
    const v = await visitRepo.byId(initial.id);
    setVisit(v);
    setTreatments(await visitRepo.treatments(v.id));
    setPlanned((await planRepo.forPatient(v.patient_id)).filter((p) => ['planned', 'scheduled', 'in_progress'].includes(p.status)));
    setInvoice(await invoiceRepo.byVisit(v.id));
  };
  useEffect(() => { reload(); }, []);

  const locked = visit.status === 'completed';
  const total = treatments.reduce((s, t) => s + t.unit_price * t.quantity, 0);

  const addRow = async () => {
    if (!row.name || !row.price) return;
    await visitRepo.addTreatment({
      visit_id: visit.id, tooth_number: row.tooth || '—', procedure_name: row.name,
      unit_price: Number(row.price), quantity: Number(row.qty) || 1,
      recorded_by_user_id: localUser.id,
    });
    setRow({ tooth: '', name: '', price: '', qty: 1 });
    reload();
  };

  const saveNotes = () => visitRepo.saveNotes(visit.id, diag, notes);

  const complete = async () => {
    await saveNotes();
    const inv = await visitRepo.complete(visit, localUser.id);
    await reload();
    if (onInvoice) onInvoice(inv);
  };

  return (
    <Modal wide title={<span>Visit — {patientName} <span style={{ marginLeft: 8 }}><StatusPill status={visit.status}/></span></span>} onClose={onClose}
      footer={
        <>
          {visit.status === 'checked_in' && (
            <button className="btn-primary" onClick={async () => { await visitRepo.start(visit.id); reload(); }}>
              <Icon name="arrow-right" size={13}/>Start treatment
            </button>
          )}
          {visit.status === 'in_progress' && (
            <button className="btn-primary" onClick={complete}><Icon name="check" size={13}/>Complete visit</button>
          )}
          {locked && (
            <button className="btn-ghost" onClick={async () => { await visitRepo.unlock(visit.id); reload(); }}>
              Unlock visit
            </button>
          )}
          {!locked && <button className="btn-ghost" onClick={async () => { await saveNotes(); onClose(); }}>Save & close</button>}
          {locked && <button className="btn-ghost" onClick={onClose}>Close</button>}
        </>
      }>
      <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
        Checked in {fmtDateTime(visit.started_at)}
        {visit.ended_at ? ` · completed ${fmtDateTime(visit.ended_at)}` : ''}
        {invoice ? ` · invoice ${invoice.status}` : ''}
      </div>

      <div className="form-row">
        <Field label="Diagnosis"><input disabled={locked} value={diag} onChange={(e) => setDiag(e.target.value)} placeholder="e.g. Irreversible pulpitis #30"/></Field>
        <Field label="Clinical notes"><input disabled={locked} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dictated note…"/></Field>
      </div>

      <div className="card table-card">
        <div className="card-head"><span className="card-title">Performed treatments</span>
          <span className="card-sub" style={{ marginLeft: 'auto' }}>Total {money(total, currency)}</span></div>
        <table className="dtable">
          <thead><tr><th>Tooth</th><th>Procedure</th><th>Unit</th><th>Qty</th><th style={{ textAlign: 'right' }}>Total</th><th/></tr></thead>
          <tbody>
            {treatments.map((t) => (
              <tr key={t.id}>
                <td className="num">{t.tooth_number}</td>
                <td style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{t.procedure_name}</td>
                <td className="num">{money(t.unit_price, currency)}</td>
                <td className="num">{t.quantity}</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(t.unit_price * t.quantity, currency)}</td>
                <td style={{ textAlign: 'right' }}>
                  {!locked && <button className="btn-ghost" onClick={async () => { await visitRepo.removeTreatment(t.id); reload(); }}><Icon name="x" size={12}/></button>}
                </td>
              </tr>
            ))}
            {!treatments.length && <tr><td colSpan={6} className="empty-pad">No treatments recorded yet</td></tr>}
          </tbody>
        </table>
        {!locked && (
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 100px 60px auto', gap: 8, padding: 12, borderTop: '1px solid var(--ink-150)' }}>
            <input className="input-text" placeholder="Tooth" value={row.tooth} onChange={(e) => setRow({ ...row, tooth: e.target.value })}/>
            <input className="input-text" placeholder="Procedure (free text)" value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })}/>
            <input className="input-text" placeholder="Price" type="number" min="0" value={row.price} onChange={(e) => setRow({ ...row, price: e.target.value })}/>
            <input className="input-text" type="number" min="1" value={row.qty} onChange={(e) => setRow({ ...row, qty: e.target.value })}/>
            <button className="btn-ghost" onClick={addRow}><Icon name="plus" size={12}/>Add</button>
          </div>
        )}
      </div>

      {!locked && planned.length > 0 && (
        <div className="card">
          <div className="card-head"><span className="card-title">From treatment plan</span></div>
          {planned.map((p) => (
            <div key={p.id} className="wait-row" style={{ gridTemplateColumns: '1fr auto auto' }}>
              <div>
                <div className="wait-name">#{p.tooth_number} · {p.procedure_name}</div>
                <div className="wait-sub">est. {money(p.estimated_unit_price, currency)} · session {p.sequence_number}</div>
              </div>
              <StatusPill status={p.status}/>
              <button className="btn-ghost" onClick={async () => { await planRepo.markPerformed(p, visit, localUser.id); reload(); }}>
                <Icon name="check" size={12}/>Mark performed
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
