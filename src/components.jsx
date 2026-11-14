// Shared DocCentral UI atoms/molecules built on the design system.
import { Icon } from './icons.jsx';
import { t, locale } from './lib/i18n.jsx';

export const Modal = ({ title, onClose, children, footer, wide }) => (
  <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={`modal ${wide ? 'wide' : ''}`}>
      <div className="modal-head">
        <span className="modal-title">{title}</span>
        <button className="drawer-close" style={{ marginInlineStart: 'auto' }} onClick={onClose}><Icon name="x" size={18}/></button>
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
  const unit = currency === 'TND' ? t('DT') : currency;
  return `${v.toLocaleString(locale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${unit}`;
};

export const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' }) : '—';
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

// Display text for a stored status value (appointments, visits, invoices, plans).
export const statusLabel = (status) => ({
  all: t('All'),
  scheduled: t('Scheduled'), checked_in: t('Checked in'), completed: t('Completed'),
  cancelled: t('Cancelled'), no_show: t('No-show'), rescheduled: t('Rescheduled'),
  in_progress: t('In progress'),
  draft: t('Draft'), unpaid: t('Unpaid'), partially_paid: t('Partially paid'), paid: t('Paid'), void: t('Void'),
  planned: t('Planned'), done: t('Done'), monitor: t('Monitor'),
})[status] || status;

const STATUS_COLOR = {
  scheduled: 'blue', checked_in: 'amber', completed: 'mint', cancelled: 'gray', no_show: 'coral',
  rescheduled: 'plum', in_progress: 'blue', draft: 'gray', unpaid: 'coral', partially_paid: 'amber',
  paid: 'mint', void: 'gray', planned: 'blue', done: 'mint', monitor: 'amber',
};

export const StatusPill = ({ status }) => (
  <span className={`pill ${STATUS_COLOR[status] || 'gray'}`}><span className="pdot"/>{statusLabel(status)}</span>
);

// Role names are stored in English in the database (shared with the Flutter app).
export const roleName = (name) => ({
  Dentist: t('Dentist'), Assistant: t('Assistant'), Nurse: t('Nurse'),
})[name] || name || t('Staff');

// "Dentist · Clinic owner" for the owner, otherwise the user's role.
export const roleLabel = (user) => (user?.is_clinic_owner ? t('Dentist · Clinic owner') : roleName(user?.role_name));

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
