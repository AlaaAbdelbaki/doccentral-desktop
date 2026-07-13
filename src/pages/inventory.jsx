// Inventory (Epic 8): items, restock events, manual adjustments, low-stock alerts.
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { Modal, Field, EmptyState } from '../components.jsx';
import { inventoryRepo } from '../lib/repos.js';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';

const levelOf = (it) => it.on_hand_quantity === 0 ? 'crit'
  : it.on_hand_quantity <= it.low_stock_threshold ? 'low' : 'ok';

const ItemFormModal = ({ item, onClose }) => {
  const [form, setForm] = useState({
    name: item?.name || '', category: item?.category || 'Consumables',
    unit: item?.unit || 'pcs',
    on_hand_quantity: item?.on_hand_quantity ?? 0,
    low_stock_threshold: item?.low_stock_threshold ?? 5,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    const fields = {
      ...form,
      on_hand_quantity: Number(form.on_hand_quantity) || 0,
      low_stock_threshold: Number(form.low_stock_threshold) || 0,
    };
    if (item) await inventoryRepo.update(item.id, fields);
    else await inventoryRepo.create(fields);
    onClose();
  };
  return (
    <Modal title={item ? 'Edit item' : 'New inventory item'} onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!form.name} onClick={save}><Icon name="check" size={13}/>Save</button>
      </>}>
      <Field label="Name"><input value={form.name} onChange={set('name')} placeholder="e.g. Cotton rolls"/></Field>
      <div className="form-row">
        <Field label="Category"><input value={form.category} onChange={set('category')}/></Field>
        <Field label="Unit"><input value={form.unit} onChange={set('unit')} placeholder="pcs / box / carpule"/></Field>
      </div>
      <div className="form-row">
        <Field label="On hand"><input type="number" min="0" value={form.on_hand_quantity} onChange={set('on_hand_quantity')}/></Field>
        <Field label="Low-stock threshold"><input type="number" min="0" value={form.low_stock_threshold} onChange={set('low_stock_threshold')}/></Field>
      </div>
    </Modal>
  );
};

export const InventoryPage = ({ onNavigate, badges }) => {
  const { localUser } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);

  const load = () => inventoryRepo.list().then(setItems);
  useEffect(() => { load(); return onDataChanged(load); }, []);

  const filtered = items.filter((it) => {
    const lvl = levelOf(it);
    const mf = filter === 'all' ? true : filter === 'low' ? lvl !== 'ok' : lvl === 'ok';
    return mf && it.name.toLowerCase().includes(q.toLowerCase());
  });
  const crit = items.filter((it) => levelOf(it) === 'crit').length;
  const low = items.filter((it) => levelOf(it) === 'low').length;

  const pill = (l) => l === 'crit' ? <span className="pill coral"><span className="pdot"/>Out / critical</span>
    : l === 'low' ? <span className="pill amber"><span className="pdot"/>Low</span>
    : <span className="pill mint"><span className="pdot"/>In stock</span>;

  return (
    <div className="app">
      <Sidebar active="inventory" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>Inventory</span>}
          subtitle={`${crit} critical · ${low} low`}
          actions={<button className="btn-primary" onClick={() => setModal({ kind: 'new' })}><Icon name="plus" size={14}/>New item</button>}/>
        <div className="content">
          <div className="stat-grid">
            <div className="stat"><div className="stat-label">Tracked items</div><div className="stat-value">{items.length}</div><div className="stat-foot">{new Set(items.map((i) => i.category)).size} categories</div></div>
            <div className="stat"><div className="stat-label">Critical</div><div className="stat-value" style={{ color: crit ? 'var(--coral-700)' : undefined }}>{crit}</div><div className="stat-foot">out of stock</div></div>
            <div className="stat"><div className="stat-label">Low</div><div className="stat-value" style={{ color: low ? 'var(--amber-700)' : undefined }}>{low}</div><div className="stat-foot">at / below threshold</div></div>
            <div className="stat"><div className="stat-label">Healthy</div><div className="stat-value">{items.length - crit - low}</div><div className="stat-foot">above threshold</div></div>
          </div>

          <div className="toolbar">
            <div className="seg">
              <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All items</button>
              <button className={filter === 'low' ? 'active' : ''} onClick={() => setFilter('low')}>Needs reorder</button>
              <button className={filter === 'ok' ? 'active' : ''} onClick={() => setFilter('ok')}>In stock</button>
            </div>
            <div className="search-inline" style={{ marginLeft: 'auto' }}>
              <Icon name="search" size={14}/><input placeholder="Search supplies…" value={q} onChange={(e) => setQ(e.target.value)}/>
            </div>
          </div>

          <div className="card table-card">
            <table className="dtable">
              <thead><tr><th>Item</th><th style={{ width: 180 }}>Stock level</th><th>On hand</th><th>Category</th><th>Status</th><th/></tr></thead>
              <tbody>
                {filtered.map((it) => {
                  const lvl = levelOf(it);
                  const pct = Math.min(100, Math.round((it.on_hand_quantity / Math.max(it.low_stock_threshold * 3, 1)) * 100));
                  return (
                    <tr key={it.id}>
                      <td style={{ fontWeight: 600, color: 'var(--ink-900)' }} className="clickable" onClick={() => setModal({ kind: 'edit', item: it })}>{it.name}</td>
                      <td><div className={`mini-bar ${lvl === 'crit' ? 'coral' : lvl === 'low' ? 'amber' : 'mint'}`}><i style={{ width: `${pct}%` }}/></div></td>
                      <td className="num" style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{it.on_hand_quantity} <span style={{ color: 'var(--ink-400)', fontWeight: 500, fontSize: 11 }}>{it.unit}</span></td>
                      <td style={{ color: 'var(--ink-600)', fontSize: 12.5 }}>{it.category}</td>
                      <td>{pill(lvl)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn-ghost" onClick={() => setModal({ kind: 'restock', item: it })}><Icon name="plus" size={12}/>Restock</button>{' '}
                        <button className="btn-ghost" onClick={() => setModal({ kind: 'adjust', item: it })}>Adjust</button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && <tr><td colSpan={6}><EmptyState icon="package" title="No items" hint="Track consumables like cotton rolls, gloves, anesthetic."/></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {modal?.kind === 'new' && <ItemFormModal onClose={() => setModal(null)}/>}
      {modal?.kind === 'edit' && <ItemFormModal item={modal.item} onClose={() => setModal(null)}/>}
      {modal?.kind === 'restock' && (
        <RestockModal item={modal.item} userId={localUser.id} onClose={() => setModal(null)}/>
      )}
      {modal?.kind === 'adjust' && (
        <AdjustModal item={modal.item} userId={localUser.id} onClose={() => setModal(null)}/>
      )}
    </div>
  );
};

const RestockModal = ({ item, userId, onClose }) => {
  const [qty, setQty] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <Modal title={`Restock — ${item.name}`} onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!Number(qty)} onClick={async () => {
          await inventoryRepo.restock(item, Number(qty), supplier, notes, userId);
          onClose();
        }}><Icon name="check" size={13}/>Record restock</button>
      </>}>
      <div className="form-row">
        <Field label={`Quantity added (${item.unit})`}><input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}/></Field>
        <Field label="Supplier"><input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="optional"/></Field>
      </div>
      <Field label="Notes"><input value={notes} onChange={(e) => setNotes(e.target.value)}/></Field>
      <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>Current: {item.on_hand_quantity} {item.unit} → {item.on_hand_quantity + (Number(qty) || 0)} {item.unit}</div>
    </Modal>
  );
};

const AdjustModal = ({ item, userId, onClose }) => {
  const [qty, setQty] = useState(String(item.on_hand_quantity));
  const [reason, setReason] = useState('');
  return (
    <Modal title={`Adjust stock — ${item.name}`} onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!reason || qty === ''} onClick={async () => {
          await inventoryRepo.adjust(item, Number(qty), reason, userId);
          onClose();
        }}><Icon name="check" size={13}/>Apply adjustment</button>
      </>}>
      <Field label={`New on-hand quantity (${item.unit})`}><input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)}/></Field>
      <Field label="Reason (required)"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Physical count correction, expired batch"/></Field>
      <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>Delta: {(Number(qty) || 0) - item.on_hand_quantity}</div>
    </Modal>
  );
};
