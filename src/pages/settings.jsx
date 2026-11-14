// Settings: clinic profile, language switch (FR/AR/EN), team & roles
// (add staff user), sync status, demo data, sign out.
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar, SyncPill } from '../shell.jsx';
import { Modal, Field, useDirtyGuard, initialsOf, roleLabel, roleName, fmtTime, AsyncButton } from '../components.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useLang, t, systemLanguage } from '../lib/i18n.jsx';

// Each language in its own name (not translated).
const LANGUAGE_NAMES = { en: 'English', fr: 'Français', ar: 'العربية' };
import { userRepo, clinicRepo } from '../lib/repos.js';
import { seedDemoData } from '../lib/seed.js';
import { syncNow, onSyncState, MIGRATION_SQL } from '../lib/sync.js';
import { SUPABASE_URL } from '../lib/config.js';

const AddStaffModal = ({ onClose }) => {
  const { addStaff } = useAuth();
  const [init] = useState({ firstName: '', lastName: '', email: '', password: '', roleName: 'Assistant' });
  const [form, setForm] = useState(init);
  const guard = useDirtyGuard(init, form, onClose);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    try { await addStaff(form); onClose(); } catch (e) { setError(e.message || String(e)); }
  };
  return (
    <Modal title={t('Add staff user')} onClose={guard.requestClose}
      footer={<>
        <button className="btn-ghost" onClick={guard.requestClose}>{t('Cancel')}</button>
        <AsyncButton className="btn-primary" disabled={!form.firstName || !form.email || form.password.length < 6} onClick={save}>
          <Icon name="check" size={13}/>{t('Create user')}
        </AsyncButton>
      </>}>
      {error && <div className="auth-error">{error}</div>}
      <div className="form-row">
        <Field label={t('First name')}><input value={form.firstName} onChange={set('firstName')}/></Field>
        <Field label={t('Last name')}><input value={form.lastName} onChange={set('lastName')}/></Field>
      </div>
      <div className="form-row">
        <Field label={t('Email')}><input type="email" value={form.email} onChange={set('email')}/></Field>
        <Field label={t('Role')}>
          <select value={form.roleName} onChange={set('roleName')}>
            <option value="Assistant">{t('Assistant')}</option><option value="Nurse">{t('Nurse')}</option><option value="Dentist">{t('Dentist')}</option>
          </select>
        </Field>
      </div>
      <Field label={t('Initial password')}><input type="password" value={form.password} onChange={set('password')} minLength={6}/></Field>
      {guard.prompt}
    </Modal>
  );
};

const ProfileSection = () => {
  const { localUser, refreshUser } = useAuth();
  const [form, setForm] = useState({ first_name: localUser?.first_name || '', last_name: localUser?.last_name || '' });
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => { setSaved(false); setForm((f) => ({ ...f, [k]: e.target.value })); };
  const save = async () => {
    await userRepo.update(localUser.id, { first_name: form.first_name.trim(), last_name: form.last_name.trim() });
    await refreshUser();
    setSaved(true);
  };
  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">{t('My profile')}</span>
        <AsyncButton className="btn-primary" style={{ marginInlineStart: 'auto', height: 30 }} disabled={!form.first_name.trim()} onClick={save}>
          <Icon name="check" size={13}/>{saved ? t('Saved') : t('Save')}
        </AsyncButton>
      </div>
      <div className="card-body">
        <div className="dl-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div><label>{t('First name')}</label><input className="input-text" style={{ width: '100%' }} value={form.first_name} onChange={set('first_name')}/></div>
          <div><label>{t('Last name')}</label><input className="input-text" style={{ width: '100%' }} value={form.last_name} onChange={set('last_name')}/></div>
          <div><label>{t('Email (sign-in)')}</label><div className="v" style={{ padding: '8px 0', color: 'var(--ink-600)' }}><bdi className="ltr">{localUser?.email || '—'}</bdi></div></div>
          <div><label>{t('Role')}</label><div className="v" style={{ padding: '8px 0', color: 'var(--ink-600)' }}>{roleLabel(localUser)}</div></div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 12 }}>
         {t('Your name appears in the sidebar, on visits, and on recorded payments.')}
        </div>
      </div>
    </div>
  );
};

export const SettingsPage = ({ onNavigate, badges, params }) => {
  const { clinic, localUser, session, signOut, refreshClinic } = useAuth();
  const { lang, explicit, setLang } = useLang();
  const [section, setSection] = useState(params?.section || 'clinic');
  const [sync, setSync] = useState({ status: 'idle', pending: 0, errors: [] });
  const [copied, setCopied] = useState(false);
  useEffect(() => onSyncState(setSync), []);
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

  const nav = [['clinic', t('Clinic profile')], ['profile', t('My profile')], ['language', t('Language')], ['team', t('Team & roles')], ['data', t('Data & sync')]];

  return (
    <div className="app">
      <Sidebar active="settings" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>{t('Settings')}</span>}
          subtitle={clinic?.name}
          actions={section === 'clinic'
            ? <AsyncButton className="btn-primary" onClick={saveClinic}><Icon name="check" size={14}/>{saved ? t('Saved') : t('Save changes')}</AsyncButton>
            : null}/>
        <div className="content">
          <div className="settings-layout">
            <div className="settings-nav">
              {nav.map(([k, l]) => <a key={k} className={section === k ? 'active' : ''} onClick={() => setSection(k)}>{l}</a>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {section === 'clinic' && form && (
                <div className="card">
                  <div className="card-head"><span className="card-title">{t('Clinic profile')}</span></div>
                  <div className="card-body">
                    <div className="dl-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <div><label>{t('Clinic name')}</label><input className="input-text" style={{ width: '100%' }} value={form.name} onChange={set('name')}/></div>
                      <div><label>{t('Phone')}</label><input className="input-text" style={{ width: '100%' }} value={form.phone} onChange={set('phone')}/></div>
                      <div><label>{t('Address')}</label><input className="input-text" style={{ width: '100%' }} value={form.address} onChange={set('address')}/></div>
                      <div><label>{t('Email')}</label><input className="input-text" style={{ width: '100%' }} value={form.email} onChange={set('email')}/></div>
                      <div><label>{t('Currency')}</label>
                        <select className="input-text" style={{ width: '100%' }} value={form.currency} onChange={set('currency')}>
                          <option value="TND">{t('TND (Tunisian dinar)')}</option>
                          <option value="EUR">{t('EUR')}</option>
                          <option value="USD">{t('USD')}</option>
                        </select>
                      </div>
                      <div><label>{t('Invoice footer')}</label><input className="input-text" style={{ width: '100%' }} value={form.invoice_footer} onChange={set('invoice_footer')}/></div>
                    </div>
                  </div>
                </div>
              )}

              {section === 'profile' && <ProfileSection key={localUser?.id}/>}

              {section === 'language' && (
                <div className="card">
                  <div className="card-head"><span className="card-title">{t('Language & formats')}</span></div>
                  <div className="card-body tight" style={{ padding: '0 16px' }}>
                    <div className="setting-row">
                      <div><div className="sr-label">{t('Same as this computer')}</div>
                        <div className="sr-desc">{t('Follows the Windows language — currently {language}.', { language: LANGUAGE_NAMES[systemLanguage()] })}</div></div>
                      <div className="sr-control">
                        {!explicit
                          ? <span className="pill blue">{t('Active')}</span>
                          : <button className="btn-ghost" onClick={() => setLang(null)}>{t('Switch')}</button>}
                      </div>
                    </div>
                    {Object.entries(LANGUAGE_NAMES).map(([code, label]) => (
                      <div key={code} className="setting-row">
                        <div><div className="sr-label">{label}</div>
                          <div className="sr-desc">{code === 'fr' ? t('Primary clinic language') : code === 'ar' ? t('Right-to-left layout') : t("Used when the computer's language isn't supported")}</div></div>
                        <div className="sr-control">
                          {explicit && lang === code
                            ? <span className="pill blue">{t('Active')}</span>
                            : <button className="btn-ghost" onClick={() => setLang(code)}>{t('Switch')}</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {section === 'team' && (
                <div className="card">
                  <div className="card-head">
                    <span className="card-title">{t('Team & roles')}</span>
                    <button className="btn-ghost" style={{ marginInlineStart: 'auto' }} onClick={() => setModal('staff')}><Icon name="plus" size={12}/>{t('Add staff')}</button>
                  </div>
                  <div className="card-body tight">
                    {team.map((u) => (
                      <div key={u.id} className="setting-row" style={{ padding: '12px 16px' }}>
                        <div className="avatar" style={{ width: 32, height: 32 }}>{initialsOf(u.first_name, u.last_name)}</div>
                        <div style={{ marginInlineStart: 12 }}>
                          <div className="sr-label">{u.first_name} {u.last_name}</div>
                          <div className="sr-desc">{u.email}</div>
                        </div>
                        <div className="sr-control">
                          <span className={`pill ${u.is_clinic_owner ? 'blue' : 'gray'}`}>
                            {u.is_clinic_owner ? t('Owner · Dentist') : roleName(u.role_name)}
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
                    <div className="card-head"><span className="card-title">{t('Sync')}</span><span style={{ marginInlineStart: 'auto' }}><SyncPill/></span></div>
                    <div className="card-body tight" style={{ padding: '0 16px' }}>
                      <div className="setting-row">
                        <div><div className="sr-label">{t('Supabase account')}</div>
                          <div className="sr-desc">{session?.user?.email ? <bdi className="ltr">{session.user.email}</bdi> : t('Not signed in')}</div></div>
                        <div className="sr-control">
                          <button className="btn-ghost" disabled={sync.status === 'syncing'}
                                  onClick={() => syncNow(session?.dev ? null : session)}>
                            {sync.status === 'syncing' ? t('Syncing…') : t('Sync now')}
                          </button>
                        </div>
                      </div>
                      <div className="setting-row" style={{ display: 'block' }}>
                        {sync.status === 'synced' && !sync.pending && (
                          <div className="auth-notice">{sync.lastSync
                            ? t('All local changes synced · {time}.', { time: fmtTime(sync.lastSync.toISOString()) })
                            : t('All local changes synced.')}</div>
                        )}
                        {sync.pending > 0 && !sync.errors?.length && sync.status !== 'syncing' && (
                          <div className="warn-banner">{t('{n} record(s) pending — {reason}.', { n: sync.pending, reason: sync.error?.() || t('will retry automatically') })}</div>
                        )}
                        {sync.errors?.length > 0 && !sync.needsSetup && (
                          <div className="auth-error" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <b>{t('Sync failed for {tables} table(s) — {n} record(s) kept locally:', { tables: sync.errors.length, n: sync.pending })}</b>
                            {[...new Set(sync.errors.map((e) => e.message))].slice(0, 3).map((m) => <div key={m}>· {m}</div>)}
                            {sync.errors.length > 3 && <div>{t('· …and more (same cause for most tables)')}</div>}
                          </div>
                        )}
                        {sync.needsSetup && (
                          <div className="warn-banner">
                            <b>{t('Cloud setup missing or out of date.')}</b>
                            <div>
                             {t('The Supabase project is missing the tables or the latest access rules this version needs. They can\'t be changed through the app\'s API key — copy the setup SQL below and run it once in the Supabase SQL editor (safe to run again), then sync resumes automatically. Records are safe locally meanwhile.')}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                              <button className="btn-ghost" onClick={async () => {
                                await navigator.clipboard.writeText(MIGRATION_SQL);
                                setCopied(true); setTimeout(() => setCopied(false), 3000);
                              }}>{copied ? t('Copied ✓') : t('Copy migration SQL')}</button>
                              <button className="btn-ghost" onClick={() => {
                                const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
                                window.dc.app.openExternal(`https://supabase.com/dashboard/project/${ref}/sql/new`);
                              }}>{t('Open Supabase SQL editor')}</button>
                              <button className="btn-ghost" onClick={() => syncNow(session?.dev ? null : session)}>{t('Retry sync')}</button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="setting-row">
                        <div><div className="sr-label">{t('Offline-first storage')}</div>
                          <div className="sr-desc">{t('All records saved locally (SQLite) with sync metadata; pending rows push when online.')}</div></div>
                        <div className="sr-control"><span className="pill mint">{t('Enabled')}</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-head"><span className="card-title">{t('Data')}</span></div>
                    <div className="card-body tight" style={{ padding: '0 16px' }}>
                      <div className="setting-row">
                        <div><div className="sr-label">{t('Demo data')}</div>
                          <div className="sr-desc">{t('Seed sample patients, appointments, inventory (only if the database is empty).')}</div></div>
                        <div className="sr-control">
                          <AsyncButton className="btn-ghost" onClick={async () => {
                            const ok = await seedDemoData(localUser.id);
                            alert(ok ? t('Demo data loaded.') : t('Database not empty — skipped.'));
                          }}>{t('Load demo data')}</AsyncButton>
                        </div>
                      </div>
                      <div className="setting-row">
                        <div><div className="sr-label">{t('Session')}</div>
                          <div className="sr-desc">{t('Signed in as {name}', { name: localUser ? `${localUser.first_name} ${localUser.last_name}` : '—' })}</div></div>
                        <div className="sr-control"><button className="btn-danger" onClick={signOut}>{t('Sign out')}</button></div>
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
