// Visit workflow modal (Epic 5): checked_in → in_progress → completed,
// performed treatments, clinical notes, auto-generated draft invoice on completion.
import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { Modal, Field, useDirtyGuard, money, fmtDateTime, StatusPill, statusLabel, AsyncButton } from './components.jsx';
import { visitRepo, planRepo, invoiceRepo } from './lib/repos.js';
import { useAuth } from './lib/auth.jsx';
import { t } from './lib/i18n.jsx';

export const VisitModal = ({ visit: initial, patientName, currency, onClose, onInvoice }) => {
  const { localUser } = useAuth();
  const [visit, setVisit] = useState(initial);
  const [treatments, setTreatments] = useState([]);
  const [planned, setPlanned] = useState([]);
  const [invoice, setInvoice] = useState(null);
  const [diag, setDiag] = useState(initial.diagnosis || '');
  const [notes, setNotes] = useState(initial.clinical_notes || '');
  const EMPTY_ROW = { tooth: '', name: '', price: '', qty: 1 };
  const [row, setRow] = useState(EMPTY_ROW);

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
    setRow(EMPTY_ROW);
    reload();
  };

  // Autosave diagnosis + notes 800 ms after typing stops, and on close, so
  // clinical notes are never lost. Saves run one after another (queue).
  const [saveState, setSaveState] = useState(null); // null | 'saving' | 'saved'
  const latest = useRef({ diag, notes });
  latest.current = { diag, notes };
  const saved = useRef({ diag, notes });
  const queue = useRef(Promise.resolve());
  const saveNotes = () => {
    queue.current = queue.current.then(async () => {
      const cur = latest.current;
      if (cur.diag === saved.current.diag && cur.notes === saved.current.notes) return;
      setSaveState('saving');
      await visitRepo.saveNotes(initial.id, cur.diag, cur.notes);
      saved.current = cur;
      setSaveState('saved');
    });
    return queue.current;
  };
  useEffect(() => {
    const timer = setTimeout(saveNotes, 800);
    return () => clearTimeout(timer);
  }, [diag, notes]);
  // Leaving the page with the modal open still saves.
  useEffect(() => () => { saveNotes(); }, []);

  // A half-typed treatment row is not saved by autosave: ask before dropping it.
  const guard = useDirtyGuard(EMPTY_ROW, row, onClose);
  const close = async () => { await saveNotes(); guard.requestClose(); };

  const complete = async () => {
    await saveNotes();
    const inv = await visitRepo.complete(visit, localUser.id);
    await reload();
    if (onInvoice) onInvoice(inv);
  };

  return (
    <Modal wide title={<span>{t('Visit — {name}', { name: patientName })} <span style={{ marginInlineStart: 8 }}><StatusPill status={visit.status}/></span></span>} onClose={close}
      footer={
        <>
          {visit.status === 'checked_in' && (
            <AsyncButton className="btn-primary" onClick={async () => { await visitRepo.start(visit.id); reload(); }}>
              <Icon name="arrow-right" size={13}/>{t('Start treatment')}
            </AsyncButton>
          )}
          {visit.status === 'in_progress' && (
            <AsyncButton className="btn-primary" onClick={complete}><Icon name="check" size={13}/>{t('Complete visit')}</AsyncButton>
          )}
          {locked && (
            <AsyncButton className="btn-ghost" onClick={async () => { await visitRepo.unlock(visit.id); reload(); }}>
             {t('Unlock visit')}
            </AsyncButton>
          )}
          {!locked && <AsyncButton className="btn-ghost" onClick={close}>{t('Save & close')}</AsyncButton>}
          {locked && <button className="btn-ghost" onClick={onClose}>{t('Close')}</button>}
        </>
      }>
      <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
        {t('Checked in {time}', { time: fmtDateTime(visit.started_at) })}
        {visit.ended_at ? ` · ${t('completed {time}', { time: fmtDateTime(visit.ended_at) })}` : ''}
        {invoice ? ` · ${t('invoice: {status}', { status: statusLabel(invoice.status) })}` : ''}
      </div>

      <div className="form-row">
        <Field label={t('Diagnosis')}><input disabled={locked} value={diag} onChange={(e) => setDiag(e.target.value)} placeholder={t('e.g. Irreversible pulpitis #30')}/></Field>
        <Field label={t('Clinical notes')}><input disabled={locked} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('Dictated note…')}/></Field>
      </div>
      {!locked && saveState && (
        <div className="autosave-state" role="status" style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: -6 }}>
          {saveState === 'saving' ? t('Saving…') : <><Icon name="check" size={11}/> {t('Saved')}</>}
        </div>
      )}

      <div className="card table-card">
        <div className="card-head"><span className="card-title">{t('Performed treatments')}</span>
          <span className="card-sub" style={{ marginInlineStart: 'auto' }}>{t('Total {amount}', { amount: money(total, currency) })}</span></div>
        <table className="dtable">
          <thead><tr><th>{t('Tooth')}</th><th>{t('Procedure')}</th><th>{t('Unit')}</th><th>{t('Qty')}</th><th style={{ textAlign: 'end' }}>{t('Total')}</th><th/></tr></thead>
          <tbody>
            {treatments.map((t) => (
              <tr key={t.id}>
                <td className="num">{t.tooth_number}</td>
                <td style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{t.procedure_name}</td>
                <td className="num">{money(t.unit_price, currency)}</td>
                <td className="num">{t.quantity}</td>
                <td className="num" style={{ textAlign: 'end' }}>{money(t.unit_price * t.quantity, currency)}</td>
                <td style={{ textAlign: 'end' }}>
                  {!locked && <AsyncButton className="btn-ghost" onClick={async () => { await visitRepo.removeTreatment(t.id); reload(); }}><Icon name="x" size={12}/></AsyncButton>}
                </td>
              </tr>
            ))}
            {!treatments.length && <tr><td colSpan={6} className="empty-pad">{t('No treatments recorded yet')}</td></tr>}
          </tbody>
        </table>
        {!locked && (
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 100px 60px auto', gap: 8, padding: 12, borderTop: '1px solid var(--ink-150)' }}>
            <input className="input-text" placeholder={t('Tooth')} value={row.tooth} onChange={(e) => setRow({ ...row, tooth: e.target.value })}/>
            <input className="input-text" placeholder={t('Procedure (free text)')} value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })}/>
            <input className="input-text" placeholder={t('Price')} type="number" min="0" value={row.price} onChange={(e) => setRow({ ...row, price: e.target.value })}/>
            <input className="input-text" type="number" min="1" value={row.qty} onChange={(e) => setRow({ ...row, qty: e.target.value })}/>
            <AsyncButton className="btn-ghost" onClick={addRow}><Icon name="plus" size={12}/>{t('Add')}</AsyncButton>
          </div>
        )}
      </div>

      {!locked && planned.length > 0 && (
        <div className="card">
          <div className="card-head"><span className="card-title">{t('From treatment plan')}</span></div>
          {planned.map((p) => (
            <div key={p.id} className="wait-row" style={{ gridTemplateColumns: '1fr auto auto' }}>
              <div>
                <div className="wait-name">#{p.tooth_number} · {p.procedure_name}</div>
                <div className="wait-sub">{t('est. {amount} · session {n}', { amount: money(p.estimated_unit_price, currency), n: p.sequence_number })}</div>
              </div>
              <StatusPill status={p.status}/>
              <AsyncButton className="btn-ghost" onClick={async () => { await planRepo.markPerformed(p, visit, localUser.id); reload(); }}>
                <Icon name="check" size={12}/>{t('Mark performed')}
              </AsyncButton>
            </div>
          ))}
        </div>
      )}
      {guard.prompt}
    </Modal>
  );
};
