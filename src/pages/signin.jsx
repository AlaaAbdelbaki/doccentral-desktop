// Sign-in / first-run clinic provisioning (FR-1, FR-2).
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useLang, t } from '../lib/i18n.jsx';

export const SignInPage = () => {
  const { signIn, signUp, clinic, notice, setNotice } = useAuth();
  const { lang, setLang } = useLang();
  const [mode, setMode] = useState(clinic ? 'signin' : 'signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ clinicName: '', firstName: '', lastName: '', email: '', password: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Dev self-check: DOC_TEST_LOGIN="email:password" drives the real sign-in path.
  useEffect(() => {
    window.dc.app.info().then((i) => {
      if (!i.testLogin) return;
      const idx = i.testLogin.indexOf(':');
      setBusy(true);
      signIn(i.testLogin.slice(0, idx), i.testLogin.slice(idx + 1))
        .catch((err) => setError(err.message || String(err)))
        .finally(() => setBusy(false));
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      if (mode === 'signup') await signUp(form);
      else await signIn(form.email, form.password);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-brand">
          <div className="side-brand-mark" style={{ width: 38, height: 38, fontSize: 22 }}>D</div>
          <div>
            <div className="side-brand-name" style={{ fontSize: 17 }}>DocCentral</div>
            <div className="side-brand-sub">{t('Clinic management')}</div>
          </div>
        </div>
        <div className="auth-title">{mode === 'signup' ? t('Create your clinic') : t('Sign in')}</div>
        <div className="auth-sub">
          {mode === 'signup'
            ? t('First run — this provisions the clinic and the owner (Dentist) account.')
            : t('Use your clinic account. Sessions persist across restarts.')}
        </div>
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}
        {mode === 'signup' && (
          <>
            <div className="field"><label>{t('Clinic')}</label>
              <input required value={form.clinicName} onChange={set('clinicName')} placeholder={t('Cabinet Dentaire — Tunis')}/></div>
            <div className="form-row">
              <div className="field"><label>{t('First name')}</label><input required value={form.firstName} onChange={set('firstName')}/></div>
              <div className="field"><label>{t('Last name')}</label><input required value={form.lastName} onChange={set('lastName')}/></div>
            </div>
          </>
        )}
        <div className="field"><label>{t('Email')}</label>
          <input required type="email" value={form.email} onChange={set('email')} placeholder="dentist@clinic.tn"/></div>
        <div className="field"><label>{t('Password')}</label>
          <input required type="password" minLength={6} value={form.password} onChange={set('password')}/></div>
        <button className="btn-primary btn-block" disabled={busy} type="submit">
          {busy ? '…' : mode === 'signup' ? t('Sign up') : t('Sign in')}
          {!busy && <Icon name="arrow-right" size={14}/>}
        </button>
        <div className="auth-lang" role="group" aria-label={t('Language')}>
          {[['en', 'English'], ['fr', 'Français'], ['ar', 'العربية']].map(([code, label]) => (
            <button key={code} type="button" className={`chip ${lang === code ? 'active' : ''}`}
                    onClick={() => setLang(code)}>{label}</button>
          ))}
        </div>
        <div className="auth-switch">
          {mode === 'signup'
            ? <>{t('Already provisioned?')} <a onClick={() => setMode('signin')}>{t('Sign in')}</a></>
            : <>{t('First run on this clinic?')} <a onClick={() => setMode('signup')}>{t('Create the clinic')}</a></>}
        </div>
      </form>
    </div>
  );
};
