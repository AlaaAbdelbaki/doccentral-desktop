// Settings: clinic profile, language switch (FR/AR/EN), team & roles
// (add staff user), sync status, demo data, sign out.
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar, SyncPill } from '../shell.jsx';
import { Modal, Field, initialsOf } from '../components.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useLang } from '../lib/i18n.jsx';
import { userRepo, clinicRepo } from '../lib/repos.js';
import { seedDemoData } from '../lib/seed.js';
import { syncNow } from '../lib/sync.js';

const AddStaffModal = ({ onClose }) => {
  const { addStaff } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', roleName: 'Assistant' });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    try { await addStaff(form); onClose(); } catch (e) { setError(e.message || String(e)); }
  };
  return (
    <Modal title="Add staff user" onClose={onClose}
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn-primary" disabled={!form.firstName || !form.email || form.password.length < 6} onClick={save}>
          <Icon name="check" size={13}/>Create user
        </button>
      </>}>
      {error && <div className="auth-error">{error}</div>}
      <div className="form-row">
        <Field label="First name"><input value={form.firstName} onChange={set('firstName')}/></Field>
        <Field label="Last name"><input value={form.lastName} onChange={set('lastName')}/></Field>
      </div>
      <div className="form-row">
        <Field label="Email"><input type="email" value={form.email} onChange={set('email')}/></Field>
        <Field label="Role">
          <select value={form.roleName} onChange={set('roleName')}>
            <option>Assistant</option><option>Nurse</option><option>Dentist</option>
          </select>
        </Field>
      </div>
      <Field label="Initial password"><input type="password" value={form.password} onChange={set('password')} minLength={6}/></Field>
    </Modal>
  );
};

export const SettingsPage = ({ onNavigate, badges }) => {
  const { clinic, localUser, session, signOut, refreshClinic } = useAuth();
  const { lang, setLang } = useLang();
  const [section, setSection] = useState('clinic');
  const [team, setTeam] = useState([]);
  const [modal, setModal] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => { userRepo.list().then(setTeam); }, [modal]);
  useEffect(() => {
    if (clinic) setForm({
      name: clinic.name || '', address: clinic.address || '', phone: clinic.phone || '',
      email: clinic.email || '', currency: clinic.currency || 'TND', invoice_footer: clinic.invoice_footer || '',
    });
  }, [clinic]);
  const set = (k) => (e) => { setSaved(false); setForm((f) => ({ ...f, [k]: e.target.value })); };

  const saveClinic = async () => {
    await clinicRepo.update(clinic.id, {
      ...form,
      address: form.address || null, phone: form.phone || null,
      email: form.email || null, invoice_footer: form.invoice_footer || null,
    });
    await refreshClinic();
    setSaved(true);
  };

  const nav = [['clinic', 'Clinic profile'], ['language', 'Language'], ['team', 'Team & roles'], ['data', 'Data & sync']];

  return (
    <div className="app">
      <Sidebar active="settings" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>Settings</span>}
          subtitle={clinic?.name}
          actions={section === 'clinic'
            ? <button className="btn-primary" onClick={saveClinic}><Icon name="check" size={14}/>{saved ? 'Saved' : 'Save changes'}</button>
            : null}/>
        <div className="content">
          <div className="settings-layout">
            <div className="settings-nav">
              {nav.map(([k, l]) => <a key={k} className={section === k ? 'active' : ''} onClick={() => setSection(k)}>{l}</a>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {section === 'clinic' && form && (
                <div className="card">
                  <div className="card-head"><span className="card-title">Clinic profile</span></div>
                  <div className="card-body">
                    <div className="dl-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div><label>Clinic name</label><input className="input-text" style={{ width: '100%' }} value={form.name} onChange={set('name')}/></div>
                      <div><label>Phone</label><input className="input-text" style={{ width: '100%' }} value={form.phone} onChange={set('phone')}/></div>
                      <div><label>Address</label><input className="input-text" style={{ width: '100%' }} value={form.address} onChange={set('address')}/></div>
                      <div><label>Email</label><input className="input-text" style={{ width: '100%' }} value={form.email} onChange={set('email')}/></div>
                      <div><label>Currency</label>
                        <select className="input-text" style={{ width: '100%' }} value={form.currency} onChange={set('currency')}>
                          <option value="TND">TND (Tunisian dinar)</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                      <div><label>Invoice footer</label><input className="input-text" style={{ width: '100%' }} value={form.invoice_footer} onChange={set('invoice_footer')}/></div>
                    </div>
                  </div>
                </div>
              )}

              {section === 'language' && (
                <div className="card">
                  <div className="card-head"><span className="card-title">Language & formats</span></div>
                  <div className="card-body tight" style={{ padding: '0 16px' }}>
                    {[['en', 'English'], ['fr', 'Français'], ['ar', 'العربية (RTL)']].map(([code, label]) => (
                      <div key={code} className="setting-row">
                        <div><div className="sr-label">{label}</div>
                          <div className="sr-desc">{code === 'fr' ? 'Primary clinic language' : code === 'ar' ? 'Right-to-left layout' : 'Default'}</div></div>
                        <div className="sr-control">
                          {lang === code
                            ? <span className="pill blue">Active</span>
                            : <button className="btn-ghost" onClick={() => setLang(code)}>Switch</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === 'team' && (
                <div className="card">
                  <div className="card-head">
                    <span className="card-title">Team & roles</span>
                    <button className="btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => setModal('staff')}><Icon name="plus" size={12}/>Add staff</button>
                  </div>
                  <div className="card-body tight">
                    {team.map((u) => (
                      <div key={u.id} className="setting-row" style={{ padding: '12px 16px' }}>
                        <div className="avatar" style={{ width: 32, height: 32 }}>{initialsOf(u.first_name, u.last_name)}</div>
                        <div style={{ marginLeft: 12 }}>
                          <div className="sr-label">{u.first_name} {u.last_name}</div>
                          <div className="sr-desc">{u.email}</div>
                        </div>
                        <div className="sr-control">
                          <span className={`pill ${u.is_clinic_owner ? 'blue' : 'gray'}`}>
                            {u.is_clinic_owner ? 'Owner · Dentist' : u.role_name || 'Staff'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === 'data' && (
                <>
                  <div className="card">
                    <div className="card-head"><span className="card-title">Sync</span><span style={{ marginLeft: 'auto' }}><SyncPill/></span></div>
                    <div className="card-body tight" style={{ padding: '0 16px' }}>
                      <div className="setting-row">
                        <div><div className="sr-label">Supabase account</div>
                          <div className="sr-desc">{session?.user?.email || 'Not signed in'}</div></div>
                        <div className="sr-control"><button className="btn-ghost" onClick={() => syncNow(session)}>Sync now</button></div>
                      </div>
                      <div className="setting-row">
                        <div><div className="sr-label">Offline-first storage</div>
                          <div className="sr-desc">All records saved locally (SQLite) with sync metadata; pending rows push when online.</div></div>
                        <div className="sr-control"><span className="pill mint">Enabled</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-head"><span className="card-title">Data</span></div>
                    <div className="card-body tight" style={{ padding: '0 16px' }}>
                      <div className="setting-row">
                        <div><div className="sr-label">Demo data</div>
                          <div className="sr-desc">Seed sample patients, appointments, inventory (only if the database is empty).</div></div>
                        <div className="sr-control">
                          <button className="btn-ghost" onClick={async () => {
                            const ok = await seedDemoData(localUser.id);
                            alert(ok ? 'Demo data loaded.' : 'Database not empty — skipped.');
                          }}>Load demo data</button>
                        </div>
                      </div>
                      <div className="setting-row">
                        <div><div className="sr-label">Session</div>
                          <div className="sr-desc">Signed in as {localUser ? `${localUser.first_name} ${localUser.last_name}` : '—'}</div></div>
                        <div className="sr-control"><button className="btn-danger" onClick={signOut}>Sign out</button></div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      {modal === 'staff' && <AddStaffModal onClose={() => setModal(null)}/>}
    </div>
  );
};
