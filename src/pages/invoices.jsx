// Invoicing & payments (Epic 7): draft review/adjust, finalize, record
// full/partial payments (derived status), void, outstanding balances.
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { Modal, Field, money, fmtDate, fullName, Avatar, StatusPill, EmptyState } from '../components.jsx';
import { invoiceRepo, patientRepo } from '../lib/repos.js';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';

const InvoiceModal = ({ invoiceId, currency, onClose }) => {
  const { localUser } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [adj, setAdj] = useState(null); // {type, description, amount}
  const [pay, setPay] = useState(null); // {amount, method, notes}
  const [voidReason, setVoidReason] = useState(null);

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

  return (
    <Modal wide title={<span>Invoice <span style={{ marginLeft: 8 }}><StatusPill status={invoice.status}/></span></span>} onClose={onClose}
      footer={<>
        {isDraft && <button className="btn-ghost" onClick={() => setAdj({ type: 'discount', description: '', amount: '' })}>Add discount</button>}
        {isDraft && <button className="btn-ghost" onClick={() => setAdj({ type: 'surcharge', description: '', amount: '' })}>Add surcharge</button>}
        {isDraft && <button className="btn-primary" onClick={async () => { await invoiceRepo.finalize(invoice.id); load(); }}><Icon name="check" size={13}/>Finalize</button>}
        {payable && <button className="btn-primary" onClick={() => setPay({ amount: due.toFixed(2), method: 'cash', notes: '' })}><Icon name="dollar" size={13}/>Record payment</button>}
        {!isVoid && invoice.status !== 'paid' && <button className="btn-danger" onClick={() => setVoidReason('')}>Void</button>}
        <button className="btn-ghost" onClick={onClose}>Close</button>
      </>}>
      <div className="dl-grid">
        <div><label>Total</label><div className="v">{money(invoice.total_amount, currency)}</div></div>
        <div><label>Paid</label><div className="v" style={{ color: paid > 0 ? 'var(--mint-700)' : undefined }}>{money(paid, currency)}</div></div>
        <div><label>Due</label><div className="v" style={{ color: due > 0.001 ? 'var(--coral-700)' : undefined }}>{money(Math.max(due, 0), currency)}</div></div>
      </div>

      <div className="card table-card">
        <div className="card-head"><span className="card-title">Line items</span></div>
        <table className="dtable">
          <thead><tr><th>Description</th><th>Tooth</th><th>Qty</th><th style={{ textAlign: 'right' }}>Amount</th>{isDraft && <th/>}</tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td style={{ fontWeight: 600, color: 'var(--ink-900)' }}>
                  {it.description}
                  {it.adjustment_type && <span className={`tag ${it.adjustment_type === 'discount' ? 'mint' : 'amber'}`} style={{ marginLeft: 8 }}>{it.adjustment_type}</span>}
                </td>
                <td className="num">{it.tooth_number || '—'}</td>
                <td className="num">{it.quantity}</td>
                <td className="num" style={{ textAlign: 'right', color: it.total_price < 0 ? 'var(--mint-700)' : undefined }}>{money(it.total_price, currency)}</td>
                {isDraft && (
                  <td style={{ textAlign: 'right' }}>
                    {it.adjustment_type && <button className="btn-ghost" onClick={async () => { await invoiceRepo.removeItem(invoice.id, it.id); load(); }}><Icon name="x" size={12}/></button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-card">
        <div className="card-head"><span className="card-title">Payments</span></div>
        <table className="dtable">
          <thead><tr><th>Date</th><th>Method</th><th>Notes</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.payment_date)}</td>
                <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                <td style={{ color: 'var(--ink-500)' }}>{p.notes || '—'}</td>
                <td className="num" style={{ textAlign: 'right' }}>{money(p.amount, currency)}</td>
              </tr>
            ))}
            {!payments.length && <tr><td colSpan={4} className="empty-pad">No payments recorded</td></tr>}
          </tbody>
        </table>
      </div>

      {adj && (
        <Modal title={adj.type === 'discount' ? 'Add discount' : 'Add surcharge'} onClose={() => setAdj(null)}
          footer={<>
            <button className="btn-ghost" onClick={() => setAdj(null)}>Cancel</button>
            <button className="btn-primary" disabled={!adj.amount} onClick={async () => {
              await invoiceRepo.addAdjustment(invoice.id, adj.type, adj.description || adj.type, Number(adj.amount));
              setAdj(null); load();
            }}><Icon name="check" size={13}/>Add</button>
          </>}>
          <Field label="Description"><input value={adj.description} onChange={(e) => setAdj({ ...adj, description: e.target.value })} placeholder={adj.type === 'discount' ? 'e.g. Loyalty discount' : 'e.g. After-hours surcharge'}/></Field>
          <Field label={`Amount (${currency})`}><input type="number" min="0" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })}/></Field>
        </Modal>
      )}

      {pay && (
        <Modal title="Record payment" onClose={() => setPay(null)}
          footer={<>
            <button className="btn-ghost" onClick={() => setPay(null)}>Cancel</button>
            <button className="btn-primary" disabled={!Number(pay.amount)} onClick={async () => {
              await invoiceRepo.recordPayment(invoice.id, Number(pay.amount), pay.method, pay.notes, localUser.id);
              setPay(null); load();
            }}><Icon name="check" size={13}/>Record</button>
          </>}>
          <div className="form-row">
            <Field label={`Amount (${currency})`}><input type="number" min="0" step="0.5" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })}/></Field>
            <Field label="Method">
              <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="cheque">Cheque</option>
                <option value="transfer">Transfer</option>
              </select>
            </Field>
          </div>
          <Field label="Notes"><input value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} placeholder="e.g. Partial — rest next visit"/></Field>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>Due: {money(Math.max(due, 0), currency)} — a lower amount records a partial payment.</div>
        </Modal>
      )}

      {voidReason !== null && (
        <Modal title="Void invoice" onClose={() => setVoidReason(null)}
          footer={<>
            <button className="btn-ghost" onClick={() => setVoidReason(null)}>Keep</button>
            <button className="btn-danger" disabled={!voidReason} onClick={async () => {
              await invoiceRepo.void(invoice.id, voidReason, localUser.id);
              setVoidReason(null); load();
            }}>Void invoice</button>
          </>}>
          <Field label="Reason (required)"><input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. Billing error — reissued"/></Field>
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
        <Topbar title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>Invoices</span>}
          subtitle={`${invoices.length} invoices · ${owed.length} patients with balance`}/>
        <div className="content">
          <div className="toolbar">
            {['all', 'draft', 'unpaid', 'partially_paid', 'paid', 'void'].map((s) => (
              <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="grid-main-side">
            <div className="card table-card">
              <div className="card-head"><span className="card-title"><Icon name="dollar" size={14}/>Invoices</span></div>
              <table className="dtable">
                <thead><tr><th>Patient</th><th>Date</th><th>Status</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Paid</th></tr></thead>
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
                      <td className="num" style={{ textAlign: 'right', fontWeight: 600 }}>{money(i.total_amount, currency)}</td>
                      <td className="num" style={{ textAlign: 'right', color: i.paid_amount > 0 ? 'var(--mint-700)' : 'var(--ink-400)' }}>{money(i.paid_amount, currency)}</td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={5}><EmptyState icon="dollar" title="No invoices" hint="Complete a visit to auto-generate a draft invoice."/></td></tr>}
                </tbody>
              </table>
            </div>
            <div className="card">
              <div className="card-head"><span className="card-title">Outstanding balances</span></div>
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
              {!owed.length && <div className="empty-pad">No outstanding balances</div>}
            </div>
          </div>
        </div>
      </main>
      {open && <InvoiceModal invoiceId={open} currency={currency} onClose={() => { setOpen(null); load(); }}/>}
    </div>
  );
};
