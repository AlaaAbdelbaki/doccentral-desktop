// Shared app shell — sidebar + topbar (DentaCore design, DocCentral modules).
import { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';
import { useLang } from './lib/i18n.jsx';
import { useAuth } from './lib/auth.jsx';
import { onSyncState } from './lib/sync.js';
import { requestNavigate } from './lib/nav.js';
import { initialsOf } from './components.jsx';

export const NAV = {
  clinical: [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'calendar', icon: 'calendar', label: 'Calendar' },
    { id: 'patients', icon: 'users', label: 'Patients' },
    { id: 'invoices', icon: 'dollar', label: 'Invoices' },
    { id: 'docs', icon: 'file-text', label: 'Documents' },
  ],
  ops: [
    { id: 'inventory', icon: 'package', label: 'Inventory' },
    { id: 'closeout', icon: 'clock', label: 'Day closeout' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
  ],
};

export const Sidebar = ({ active, onNavigate, badges = {} }) => {
  const { t } = useLang();
  const { localUser, clinic } = useAuth();
  const NavLink = (n) => (
    <a key={n.id} href="#" onClick={(e) => { e.preventDefault(); onNavigate(n.id); }}
       className={`nav-item ${active === n.id ? 'active' : ''}`}>
      <Icon name={n.icon} size={16}/>
      <span>{t(n.label)}</span>
      {badges[n.id] > 0 && <span className="nav-badge">{badges[n.id]}</span>}
    </a>
  );
  return (
    <aside className="side">
      <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('home'); }} className="side-brand" style={{ textDecoration: 'none' }}>
        <div className="side-brand-mark">D</div>
        <div>
          <div className="side-brand-name">DocCentral</div>
          <div className="side-brand-sub">{clinic ? clinic.name : ''}</div>
        </div>
      </a>
      <div className="side-section-label">{t('Clinical')}</div>
      {NAV.clinical.map(NavLink)}
      <div className="side-section-label">{t('Operations')}</div>
      {NAV.ops.map(NavLink)}
      <div className="side-footer">
        <div className="avatar online">{localUser ? initialsOf(localUser.first_name, localUser.last_name) : '·'}</div>
        <div style={{ minWidth: 0 }}>
          <div className="side-user-name">{localUser ? `${localUser.first_name} ${localUser.last_name}` : ''}</div>
          <div className="side-user-role">{localUser?.is_clinic_owner ? 'Dentist · Clinic owner' : 'Staff'}</div>
        </div>
      </div>
    </aside>
  );
};

export const SyncPill = () => {
  const [s, setS] = useState({ status: 'idle', pending: 0 });
  useEffect(() => onSyncState(setS), []);
  const open = () => requestNavigate('settings', { section: 'data' });
  const pill = (cls, label) => (
    <span className={`sync-pill ${cls} clickable`} title={s.error || 'Open sync settings'} onClick={open}>
      <span className="pdot"/>{label}
    </span>
  );
  if (s.status === 'syncing') return pill('', 'Syncing…');
  if (s.status === 'synced' && !s.pending) return pill('ok', 'Synced');
  if (s.pending > 0) return pill('pending', `${s.pending} pending`);
  if (s.status === 'offline') return pill('off', 'Offline');
  return pill('off', 'Local');
};

export const Topbar = ({ title, subtitle, greeting, actions, onSearch, searchPlaceholder }) => {
  const { t } = useLang();
  return (
    <div className="topbar">
      {greeting ? greeting : (
        <div className="greeting">
          <h1>{title}</h1>
          {subtitle && <span className="greeting-meta">{subtitle}</span>}
        </div>
      )}
      {onSearch ? (
        <div className="search" style={{ padding: 0, overflow: 'hidden' }}>
          <span style={{ paddingLeft: 10, display: 'grid', placeItems: 'center' }}><Icon name="search" size={14}/></span>
          <input
            placeholder={searchPlaceholder || t('Search')}
            onChange={(e) => onSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', flex: 1, padding: '7px 10px 7px 0', fontSize: 13, color: 'var(--ink-900)' }}
          />
        </div>
      ) : <div style={{ marginLeft: 'auto' }}/>}
      <SyncPill/>
      {actions}
    </div>
  );
};
