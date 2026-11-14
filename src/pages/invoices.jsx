// Invoicing & payments (Epic 7): draft review/adjust, finalize, record
// full/partial payments (derived status), void, outstanding balances.
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { Modal, Field, useDirtyGuard, money, fmtDate, fullName, Avatar, StatusPill, EmptyState, statusLabel } from '../components.jsx';
import { invoiceRepo, patientRepo } from '../lib/repos.js';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';
import { t } from '../lib/i18n.jsx';
const adjLabel = (type) => (type === 'discount' ? t('Add discount') : t('Add surcharge'));
const adjKind = (type) => (type === 'discount' ? t('discount') : type === 'surcharge' ? t('surcharge') : type);
const methodLabel = (m) => ({ cash: t('Cash'), card: t('Card'), cheque: t('Cheque'), transfer: t('Transfer') })[m] || m;


const InvoiceModal = ({ invoiceId, currency, onClose }) => {
  const { localUser } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [adj, setAdj] = useState(null); // {type, description, amount}
  const [pay, setPay] = useState(null); // {amount, method, notes}
  const [voidReason, setVoidReason] = useState(null);
  const [error, setError] = useState(null);
  // Sub-forms remember how they looked when opened, for the discard prompt.
  const [opened, setOpened] = useState({});
  const openAdj = (v) => { setError(null); setAdj(v); setOpened((o) => ({ ...o, adj: v })); };
  const openPay = (v) => { setError(null); setPay(v); setOpened((o) => ({ ...o, pay: v })); };
  const adjGuard = useDirtyGuard(opened.adj ?? null, adj, () => setAdj(null));
  const payGuard = useDirtyGuard(opened.pay ?? null, pay, () => setPay(null));
  const voidGuard = useDirtyGuard('', voidReason ?? '', () => setVoidReason(null));
  // Run a repository action; surface validation errors inside the sub-modal.
  const attempt = async (fn) => {
    setError(null);
    try { await fn(); return true; } catch (e) { setError(e.message || String(e)); return false; }
  };

  const load = async () => {
    setInvoice(await invoiceRepo.byId(invoiceId));
    setItems(await invoiceRepo.items(invoiceId));
    setPayments(await invoiceRepo.payments(invoiceId));
  };
  useEffect(() => { load(); }, [invoiceId]);

  if (!invoice) return null;
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const due = invoice.total_amount - paid;
  const isDraft = invoice.status === 'draft';
  const isVoid = invoice.status === 'void';
  const payable = ['unpaid', 'partially_paid'].includes(invoice.status);
  const payTooBig = pay && Number(pay.amount) > due + 0.001;
  const adjTooBig = adj && adj.type === 'discount' && Number(adj.amount) > invoice.total_amount + 0.001;

  return (
    <Modal wide title={<span>{t('Invoice')} <span style={{ marginInlineStart: 8 }}><StatusPill status={invoice.status}/></span></span>} onClose={onClose}
      footer={<>
        {isDraft && <button className="btn-ghost" onClick={() => openAdj({ type: 'discount', description: '', amount: '' })}>{t('Add discount')}</button>}
        {isDraft && <button className="btn-ghost" onClick={() => openAdj({ type: 'surcharge', description: '', amount: '' })}>{t('Add surcharge')}</button>}
        {isDraft && <button className="btn-primary" onClick={async () => { await invoiceRepo.finalize(invoice.id); load(); }}><Icon name="check" size={13}/>{t('Finalize')}</button>}
        {payable && <button className="btn-primary" onClick={() => openPay({ amount: due.toFixed(2), method: 'cash', notes: '' })}><Icon name="dollar" size={13}/>{t('Record payment')}</button>}
        {!isVoid && invoice.status !== 'paid' && <button className="btn-danger" onClick={() => setVoidReason('')}>{t('Void')}</button>}
        <button className="btn-ghost" onClick={onClose}>{t('Close')}</button>
      </>}>
      <div className="dl-grid">
        <div><label>{t('Total')}</label><div className="v">{money(invoice.total_amount, currency)}</div></div>
        <div><label>{t('Paid')}</label><div className="v" style={{ color: paid > 0 ? 'var(--mint-700)' : undefined }}>{money(paid, currency)}</div></div>
        <div><label>{t('Due')}</label><div className="v" style={{ color: due > 0.001 ? 'var(--coral-700)' : undefined }}>{money(Math.max(due, 0), currency)}</div></div>
      </div>

      <div className="card table-card">
        <div className="card-head"><span className="card-title">{t('Line items')}</span></div>
        <table className="dtable">
          <thead><tr><th>{t('Description')}</th><th>{t('Tooth')}</th><th>{t('Qty')}</th><th style={{ textAlign: 'end' }}>{t('Amount')}</th>{isDraft && <th/>}</tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td style={{ fontWeight: 600, color: 'var(--ink-900)' }}>
                  {it.description}
                  {it.adjustment_type && <span className={`tag ${it.adjustment_type === 'discount' ? 'mint' : 'amber'}`} style={{ marginInlineStart: 8 }}>{adjKind(it.adjustment_type)}</span>}
                </td>
                <td className="num">{it.tooth_number || '—'}</td>
                <td className="num">{it.quantity}</td>
                <td className="num" style={{ textAlign: 'end', color: it.total_price < 0 ? 'var(--mint-700)' : undefined }}>{money(it.total_price, currency)}</td>
                {isDraft && (
                  <td style={{ textAlign: 'end' }}>
                    {it.adjustment_type && <button className="btn-ghost" onClick={async () => { await invoiceRepo.removeItem(invoice.id, it.id); load(); }}><Icon name="x" size={12}/></button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-card">
        <div className="card-head"><span className="card-title">{t('Payments')}</span></div>
        <table className="dtable">
          <thead><tr><th>{t('Date')}</th><th>{t('Method')}</th><th>{t('Notes')}</th><th style={{ textAlign: 'end' }}>{t('Amount')}</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.payment_date)}</td>
                <td>{methodLabel(p.method)}</td>
                <td style={{ color: 'var(--ink-500)' }}>{p.notes || '—'}</td>
                <td className="num" style={{ textAlign: 'end' }}>{money(p.amount, currency)}</td>
              </tr>
            ))}
            {!payments.length && <tr><td colSpan={4} className="empty-pad">{t('No payments recorded')}</td></tr>}
          </tbody>
        </table>
      </div>

      {adj && (
        <Modal title={adjLabel(adj.type)} onClose={adjGuard.requestClose}
          footer={<>
            <button className="btn-ghost" onClick={adjGuard.requestClose}>{t('Cancel')}</button>
            <button className="btn-primary" disabled={!(Number(adj.amount) > 0) || adjTooBig} onClick={async () => {
              const ok = await attempt(() => invoiceRepo.addAdjustment(invoice.id, adj.type, adj.description || adjKind(adj.type), Number(adj.amount)));
              if (ok) { setAdj(null); load(); }
            }}><Icon name="check" size={13}/>{t('Add')}</button>
          </>}>
          {adjTooBig && <div className="auth-error">{t('A discount cannot exceed the invoice total ({amount}).', { amount: money(invoice.total_amount, currency) })}</div>}
          {error && <div className="auth-error">{error}</div>}
          <Field label={t('Description')}><input value={adj.description} onChange={(e) => setAdj({ ...adj, description: e.target.value })} placeholder={adj.type === 'discount' ? t('e.g. Loyalty discount') : t('e.g. After-hours surcharge')}/></Field>
          <Field label={t('Amount ({currency})', { currency })}><input type="number" min="0" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })}/></Field>
          {adjGuard.prompt}
        </Modal>
      )}

      {pay && (
        <Modal title={t('Record payment')} onClose={payGuard.requestClose}
          footer={<>
            <button className="btn-ghost" onClick={payGuard.requestClose}>{t('Cancel')}</button>
            <button className="btn-primary" disabled={!(Number(pay.amount) > 0) || payTooBig} onClick={async () => {
              const ok = await attempt(() => invoiceRepo.recordPayment(invoice.id, Number(pay.amount), pay.method, pay.notes, localUser.id));
              if (ok) { setPay(null); load(); }
            }}><Icon name="check" size={13}/>{t('Record')}</button>
          </>}>
          {payTooBig && <div className="auth-error">{t('Amount exceeds what is due ({amount}).', { amount: money(Math.max(due, 0), currency) })}</div>}
          {error && <div className="auth-error">{error}</div>}
          <div className="form-row">
            <Field label={t('Amount ({currency})', { currency })}><input type="number" min="0" step="0.5" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })}/></Field>
            <Field label={t('Method')}>
              <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                <option value="cash">{t('Cash')}</option>
                <option value="card">{t('Card')}</option>
                <option value="cheque">{t('Cheque')}</option>
                <option value="transfer">{t('Transfer')}</option>
              </select>
            </Field>
          </div>
          <Field label={t('Notes')}><input value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} placeholder={t('e.g. Partial — rest next visit')}/></Field>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>{t('Due: {amount} — a lower amount records a partial payment.', { amount: money(Math.max(due, 0), currency) })}</div>
          {payGuard.prompt}
        </Modal>
      )}

      {voidReason !== null && (
        <Modal title={t('Void invoice')} onClose={voidGuard.requestClose}
          footer={<>
            <button className="btn-ghost" onClick={voidGuard.requestClose}>{t('Keep')}</button>
            <button className="btn-danger" disabled={!voidReason} onClick={async () => {
              await invoiceRepo.void(invoice.id, voidReason, localUser.id);
              setVoidReason(null); load();
            }}>{t('Void invoice')}</button>
          </>}>
          <Field label={t('Reason (required)')}><input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder={t('e.g. Billing error — reissued')}/></Field>
          {voidGuard.prompt}
        </Modal>
      )}
    </Modal>
  );
};

export const InvoicesPage = ({ onNavigate, badges }) => {
  const { clinic } = useAuth();
  const currency = clinic?.currency || 'TND';
  const [invoices, setInvoices] = useState([]);
  const [owed, setOwed] = useState([]);
  const [filter, setFilter] = useState('all');
  const [open, setOpen] = useState(null);

  const load = async () => {
    setInvoices(await invoiceRepo.list());
    setOwed(await patientRepo.outstanding());
  };
  useEffect(() => { load(); return onDataChanged(load); }, []);

  const filtered = invoices.filter((i) => filter === 'all' ? true : i.status === filter);

  return (
    <div className="app">
      <Sidebar active="invoices" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>{t('Invoices')}</span>}
          subtitle={t('{n} invoices · {owed} patients with balance', { n: invoices.length, owed: owed.length })}/>
        <div className="content">
          <div className="toolbar">
            {['all', 'draft', 'unpaid', 'partially_paid', 'paid', 'void'].map((s) => (
              <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {statusLabel(s)}
              </button>
            ))}
          </div>
          <div className="grid-main-side">
            <div className="card table-card">
              <div className="card-head"><span className="card-title"><Icon name="dollar" size={14}/>{t('Invoices')}</span></div>
              <table className="dtable">
                <thead><tr><th>{t('Patient')}</th><th>{t('Date')}</th><th>{t('Status')}</th><th style={{ textAlign: 'end' }}>{t('Total')}</th><th style={{ textAlign: 'end' }}>{t('Paid')}</th></tr></thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.id} onClick={() => setOpen(i.id)}>
                      <td>
                        <div className="cell-name">
                          <Avatar id={i.patient_id} first={i.first_name} last={i.last_name} size={28}/>
                          <div><div className="cn-title">{fullName(i)}</div></div>
                        </div>
                      </td>
                      <td>{fmtDate(i.created_at)}</td>
                      <td><StatusPill status={i.status}/></td>
                      <td className="num" style={{ textAlign: 'end', fontWeight: 600 }}>{money(i.total_amount, currency)}</td>
                      <td className="num" style={{ textAlign: 'end', color: i.paid_amount > 0 ? 'var(--mint-700)' : 'var(--ink-400)' }}>{money(i.paid_amount, currency)}</td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={5}><EmptyState icon="dollar" title={t('No invoices')} hint={t('Complete a visit to auto-generate a draft invoice.')}/></td></tr>}
                </tbody>
              </table>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">{t('Outstanding balances')}</span></div>
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
              {!owed.length && <div className="empty-pad">{t('No outstanding balances')}</div>}
            </div>
          </div>
        </div>
      </main>
      {open && <InvoiceModal invoiceId={open} currency={currency} onClose={() => { setOpen(null); load(); }}/>}
    </div>
  );
};
