// "Report a problem": a description, optional files and screenshot, and —
// only if the user ticks them — device information and app logs, each
// previewable before sending. Sent to the clinic's Supabase project, or kept
// on this computer and sent later when that isn't possible.
import { useEffect, useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import { Modal, Field } from './components.jsx';
import { t, lang } from './lib/i18n.jsx';
import { useAuth } from './lib/auth.jsx';
import { onSyncState } from './lib/sync.js';
import { uuid } from './lib/dbx.js';
import { buildReport, submitReport, reportSupport, LIMITS } from './lib/bugreport.js';

const fileSize = (n) => (n >= 1024 * 1024
  ? t('{n} MB', { n: (n / (1024 * 1024)).toFixed(1) })
  : t('{n} KB', { n: Math.max(1, Math.round(n / 1024)) }));

const blobUrl = (bytes, type) => URL.createObjectURL(new Blob([bytes], { type }));

// App-side facts that only the renderer knows; joined to the main process's
// device information.
function appState(sync) {
  return {
    language: lang(),
    window: `${window.innerWidth}x${window.innerHeight}`,
    online: navigator.onLine,
    sync: {
      status: sync.status,
      pending: sync.pending,
      lastSync: sync.lastSync ? new Date(sync.lastSync).toISOString() : null,
      errors: (sync.errors || []).map((e) => `${e.table}: ${e.message}`),
    },
  };
}

const Option = ({ id, checked, onChange, title, hint, preview }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`report-opt ${checked ? 'on' : ''}`}>
      <label className="report-opt-row" htmlFor={id}>
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}/>
        <span>
          <span className="report-opt-title">{title}</span>
          <span className="report-opt-hint">{hint}</span>
        </span>
      </label>
      <button type="button" className="report-link" onClick={() => setOpen(!open)}>
        {open ? t('Hide what will be sent') : t('Show what will be sent')}
      </button>
      {open && <pre className="report-preview ltr" dir="ltr">{preview || t('Nothing recorded yet.')}</pre>}
    </div>
  );
};

export const ReportProblemModal = ({ screenshot, onClose }) => {
  const { session, clinic } = useAuth();
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);
  const [withShot, setWithShot] = useState(false);
  const [includeDevice, setIncludeDevice] = useState(false);
  const [includeLogs, setIncludeLogs] = useState(false);
  const [device, setDevice] = useState(null);
  const [logs, setLogs] = useState('');
  const [version, setVersion] = useState(null);
  const [sync, setSync] = useState({});
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    reportSupport.device().then(setDevice);
    reportSupport.logs().then(setLogs);
    window.dc.app.info().then((i) => setVersion(i.version));
    return onSyncState(setSync);
  }, []);

  const shotUrl = useMemo(() => (screenshot ? blobUrl(screenshot, 'image/png') : null), [screenshot]);
  useEffect(() => () => shotUrl && URL.revokeObjectURL(shotUrl), [shotUrl]);

  const deviceInfo = device ? { ...device, ...appState(sync) } : null;
  const attached = [
    ...(withShot && screenshot ? [{ name: 'screenshot.png', type: 'image/png', bytes: screenshot }] : []),
    ...files,
  ];

  const addFiles = async () => {
    setError('');
    const picked = await reportSupport.pickFiles();
    const tooLarge = picked.filter((f) => f.tooLarge);
    if (tooLarge.length) setError(t('Too large (over {n} MB): {files}', { n: LIMITS.fileBytes / (1024 * 1024), files: tooLarge.map((f) => f.name).join(', ') }));
    const ok = picked.filter((f) => !f.tooLarge).map((f) => ({ name: f.name, type: mimeOf(f.name), bytes: f.bytes }));
    const room = LIMITS.files - (withShot ? 1 : 0) - files.length;
    if (ok.length > room) setError(t('You can attach up to {n} files.', { n: LIMITS.files }));
    setFiles([...files, ...ok.slice(0, Math.max(0, room))]);
  };

  const send = async () => {
    setError('');
    if (!description.trim()) { setError(t('Please describe the problem.')); return; }
    setSending(true);
    try {
      const report = buildReport({
        id: uuid(), description, clinicId: clinic?.id || null, appVersion: version, language: lang(),
        files: attached, device: deviceInfo, logs, includeDevice, includeLogs,
      });
      setResult({ ...(await submitReport(report, session)), id: report.id });
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  if (result) {
    return (
      <Modal title={t('Report a problem')} onClose={onClose}
             footer={<button className="btn-primary" onClick={onClose}>{t('Close')}</button>}>
        <div className="report-done">
          <Icon name={result.status === 'sent' ? 'check' : 'clock'} size={22}/>
          <div>
            <div className="report-done-title">
              {result.status === 'sent' ? t('Thank you — your report was sent.') : t('Report saved on this computer.')}
            </div>
            <div className="report-opt-hint">
              {result.status === 'sent'
                ? t('Reference: {ref}', { ref: result.id.slice(0, 8) })
                : t("It couldn't be sent right now (offline or not connected to the cloud). It will be sent automatically.")}
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={t('Report a problem')} onClose={onClose} wide
           footer={<>
             <span className="report-foot-note"><Icon name="shield" size={13}/>{t('Your patient records are never included.')}</span>
             <button className="btn-ghost" onClick={onClose}>{t('Cancel')}</button>
             <button className="btn-primary" disabled={sending} onClick={send}>
               <Icon name="check" size={13}/>{sending ? t('Sending…') : t('Send report')}
             </button>
           </>}>
      <div className="report-form">
        <Field label={t('What happened?')}>
          <textarea rows={5} maxLength={LIMITS.description} value={description} autoFocus
                    placeholder={t('What were you doing, what did you expect, and what happened instead?')}
                    onChange={(e) => setDescription(e.target.value)}/>
        </Field>

        <div className="report-section">
          <div className="report-section-title">{t('Attachments (optional)')}</div>
          <div className="report-attach">
            {shotUrl && (
              <label className={`report-shot ${withShot ? 'on' : ''}`}>
                <input type="checkbox" checked={withShot} onChange={(e) => setWithShot(e.target.checked)}/>
                <img src={shotUrl} alt=""/>
                <span><Icon name="camera" size={13}/>{t('Screenshot of the screen')}</span>
              </label>
            )}
            <button type="button" className="btn-ghost" onClick={addFiles} disabled={attached.length >= LIMITS.files}>
              <Icon name="paperclip" size={13}/>{t('Add files')}
            </button>
          </div>
          {files.length > 0 && (
            <ul className="report-files">
              {files.map((f, i) => (
                <li key={i}>
                  <span className="ltr">{f.name}</span>
                  <span className="report-opt-hint">{fileSize(f.bytes.length)}</span>
                  <button type="button" className="drawer-close" title={t('Remove')} onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    <Icon name="x" size={13}/>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="report-warn">
            <Icon name="alert-tri" size={13}/>
            {t('Screenshots and files may show patient information. Attach only what helps explain the problem.')}
          </div>
        </div>

        <div className="report-section">
          <div className="report-section-title">{t('Help find the cause (optional)')}</div>
          <Option id="report-device" checked={includeDevice} onChange={setIncludeDevice}
                  title={t('Include device information')}
                  hint={t('App and Windows version, processor, memory, screens, language and sync status. No computer name, user name or network address.')}
                  preview={deviceInfo && JSON.stringify(deviceInfo, null, 2)}/>
          <Option id="report-logs" checked={includeLogs} onChange={setIncludeLogs}
                  title={t('Include app logs')}
                  hint={t('Recent errors and warnings from the app. Email addresses, phone numbers and passwords are removed.')}
                  preview={logs}/>
        </div>

        {error && <div className="auth-error">{error}</div>}
      </div>
    </Modal>
  );
};

const MIME = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  pdf: 'application/pdf', txt: 'text/plain', log: 'text/plain', json: 'application/json', zip: 'application/zip',
  mp4: 'video/mp4', webm: 'video/webm',
};
const mimeOf = (name) => MIME[String(name).split('.').pop().toLowerCase()] || 'application/octet-stream';

// Sidebar entry. The screenshot is taken before the dialog opens, so it shows
// the screen the problem is about, not the dialog.
export const ReportProblemButton = () => {
  const [open, setOpen] = useState(null);
  const start = async () => {
    let shot = null;
    try { shot = await reportSupport.screenshot(); } catch { /* still allow a report without it */ }
    setOpen({ shot });
  };
  return (
    <>
      {/* Dialog first: the button must stay right before the sidebar footer (CSS) */}
      {open && <ReportProblemModal screenshot={open.shot} onClose={() => setOpen(null)}/>}
      <button type="button" className="side-report" onClick={start}>
        <Icon name="bug" size={15}/><span>{t('Report a problem')}</span>
      </button>
    </>
  );
};
