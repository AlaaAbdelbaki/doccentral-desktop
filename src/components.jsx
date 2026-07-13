// Shared DocCentral UI atoms/molecules built on the design system.
import { Icon } from './icons.jsx';
import { useLang } from './lib/i18n.jsx';

export const Modal = ({ title, onClose, children, footer, wide }) => (
  <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'wide' : ''}`}>
      <div className="modal-head">
        <span className="modal-title">{title}</span>
        <button className="drawer-close" style={{ marginLeft: 'auto' }} onClick={onClose}><Icon name="x" size={18}/></button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </div>
);

export const Field = ({ label, children }) => (
  <div className="field"><label>{label}</label>{children}</div>
);

export const money = (n, currency = 'TND') => {
  const v = Number(n || 0);
  const unit = currency === 'TND' ? 'DT' : currency;
  return `${v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${unit}`;
};

export const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';
export const fmtDateTime = (iso) => iso ? `${fmtDate(iso)} ${fmtTime(iso)}` : '—';
export const age = (dobIso) => dobIso ? Math.floor((Date.now() - new Date(dobIso).getTime()) / 31557600000) : '—';
export const initialsOf = (first, last) => `${(first || '?')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
export const fullName = (r) => `${r.first_name || ''} ${r.last_name || ''}`.trim();

const AVATAR_COLORS = [
  ['var(--blue-100)', 'var(--blue-700)'],
  ['var(--mint-100)', 'var(--mint-700)'],
  ['var(--plum-100)', '#6A3FA0'],
  ['var(--amber-100)', 'var(--amber-700)'],
  ['var(--coral-100)', 'var(--coral-700)'],
];
export const avatarColor = (id) => {
  let h = 0;
  for (const ch of String(id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

export const Avatar = ({ id, first, last, size = 34 }) => {
  const [bg, fg] = avatarColor(id);
  return (
    <div className="avatar" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }}>
      {initialsOf(first, last)}
    </div>
  );
};

export const StatusPill = ({ status }) => {
  const { t } = useLang();
  const map = {
    scheduled: ['blue', 'Scheduled'], checked_in: ['amber', 'Checked in'],
    completed: ['mint', 'Completed'], cancelled: ['gray', 'Cancelled'],
    no_show: ['coral', 'No-show'], rescheduled: ['plum', 'Rescheduled'],
    in_progress: ['blue', 'In progress'],
    draft: ['gray', 'Draft'], unpaid: ['coral', 'Unpaid'],
    partially_paid: ['amber', 'Partially paid'], paid: ['mint', 'Paid'], void: ['gray', 'Void'],
    planned: ['blue', 'Planned'], done: ['mint', 'Done'], monitor: ['amber', 'Monitor'],
  };
  const [color, label] = map[status] || ['gray', status];
  return <span className={`pill ${color}`}><span className="pdot"/>{t(label)}</span>;
};

export const EmptyState = ({ icon = 'file-text', title, hint }) => (
  <div className="empty-pad" style={{ padding: '40px 20px' }}>
    <Icon name={icon} size={28} style={{ color: 'var(--ink-300)' }}/>
    <div style={{ marginTop: 10, fontWeight: 600, color: 'var(--ink-700)' }}>{title}</div>
    {hint && <div style={{ fontSize: 12.5, marginTop: 4 }}>{hint}</div>}
  </div>
);

export const toDateInput = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const toTimeInput = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const combineDateTime = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr || '09:00'}`).toISOString();
