// Shared app shell — sidebar + topbar.
// Nav reflects the DocCentral PRD modules; only Patients is implemented in this prototype.
import { Icon } from './icons.jsx';
import { DC_DATA } from './data.js';

const DC_NAV = {
  clinical: [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'calendar', icon: 'calendar', label: 'Calendar' },
    { id: 'patients', icon: 'users', label: 'Patients', badge: 12 },
    { id: 'invoices', icon: 'dollar', label: 'Invoices', badge: 3 },
    { id: 'docs', icon: 'file-text', label: 'Documents' },
  ],
  ops: [
    { id: 'inv', icon: 'package', label: 'Inventory', badge: 2 },
    { id: 'closeout', icon: 'clock', label: 'Day closeout' },
    { id: 'reports', icon: 'chart', label: 'Reports' },
    { id: 'settings', icon: 'settings', label: 'Settings' },
  ],
};

export const Sidebar = ({ active }) => {
  const data = DC_DATA;
  const NavLink = (n) => (
    <a key={n.id} href="#" onClick={(e) => e.preventDefault()} className={`nav-item ${active === n.id ? 'active' : ''}`}>
      <Icon name={n.icon} size={16}/>
      <span>{n.label}</span>
      {n.badge && <span className="nav-badge">{n.badge}</span>}
    </a>
  );
  return (
    <aside className="side">
      <a href="#" onClick={(e) => e.preventDefault()} className="side-brand" style={{ textDecoration: 'none' }}>
        <div className="side-brand-mark">D</div>
        <div>
          <div className="side-brand-name">DocCentral</div>
          <div className="side-brand-sub">{DC_DATA.clinic.name.split(' — ')[0]}</div>
        </div>
      </a>
      <div className="side-section-label">Clinical</div>
      {DC_NAV.clinical.map(NavLink)}
      <div className="side-section-label">Operations</div>
      {DC_NAV.ops.map(NavLink)}
      <div className="side-footer">
        <div className="avatar online">{data.user.initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="side-user-name">{data.user.name}</div>
          <div className="side-user-role">{data.user.role}</div>
        </div>
        <button className="icon-btn" style={{ width: 28, height: 28, marginLeft: 'auto' }}>
          <Icon name="chevron-down" size={14}/>
        </button>
      </div>
    </aside>
  );
};

// Topbar: pass either `greeting` node OR title/subtitle, plus optional actions
export const Topbar = ({ title, subtitle, greeting, actions, searchPlaceholder = 'Search patients, visits, invoices…' }) => (
  <div className="topbar">
    {greeting ? greeting : (
      <div className="greeting">
        <h1>{title}</h1>
        {subtitle && <span className="greeting-meta">{subtitle}</span>}
      </div>
    )}
    <div className="search">
      <Icon name="search" size={14}/>
      <span>{searchPlaceholder}</span>
      <kbd>Ctrl K</kbd>
    </div>
    <button className="icon-btn"><Icon name="bell" size={15}/><span className="dot"/></button>
    <button className="icon-btn"><Icon name="message" size={15}/></button>
    {actions ? actions : (
      <button className="btn-primary"><Icon name="plus" size={14}/>New appointment</button>
    )}
  </div>
);

// Full page shell: <Shell active="patients" topbar={<Topbar .../>}> ...content... </Shell>
export const Shell = ({ active, topbar, children, contentClass = 'content' }) => (
  <div className="app">
    <Sidebar active={active}/>
    <main className="main">
      {topbar}
      <div className={contentClass}>
        {children}
      </div>
    </main>
  </div>
);
