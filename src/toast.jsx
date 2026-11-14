// Toast notices (bottom corner) + one place that turns errors into a visible
// message: notifyError(e). Global handlers catch anything a page missed.
import { useEffect, useState } from 'react';
import { Icon } from './icons.jsx';
import { t } from './lib/i18n.jsx';

let nextId = 1;
let toasts = [];
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(toasts));

export const dismissToast = (id) => {
  toasts = toasts.filter((x) => x.id !== id);
  emit();
};

// kind: 'error' | 'success' | 'info'. Errors stay longer.
export const notify = ({ kind = 'info', title, detail = '', timeout }) => {
  const id = nextId++;
  // The same error twice in a row (e.g. a retried action) shows once.
  const last = toasts[toasts.length - 1];
  if (last && last.kind === kind && last.title === title && last.detail === detail) return last.id;
  toasts = [...toasts.slice(-3), { id, kind, title, detail }];
  emit();
  setTimeout(() => dismissToast(id), timeout ?? (kind === 'error' ? 10_000 : 4_000));
  return id;
};

export const notifyError = (err) => {
  const detail = String((err && err.message) || err || '');
  console.error('[DocCentral]', (err && err.stack) || detail); // reaches the log file
  return notify({ kind: 'error', title: t('Something went wrong'), detail });
};

// Errors no handler caught (an async onClick without try/catch, a failed
// background load): show them instead of failing silently.
export const installGlobalErrorHandlers = () => {
  // preventDefault: reported (toast) and logged (console.error) here already.
  const onRejection = (e) => { e.preventDefault(); notifyError(e.reason); };
  window.addEventListener('unhandledrejection', onRejection);
  return () => window.removeEventListener('unhandledrejection', onRejection);
};

export const Toasts = () => {
  const [list, setList] = useState(toasts);
  useEffect(() => { listeners.add(setList); return () => listeners.delete(setList); }, []);
  if (!list.length) return null;
  return (
    <div className="toasts">
      {list.map((x) => (
        <div key={x.id} className={`toast ${x.kind}`} role={x.kind === 'error' ? 'alert' : 'status'}>
          <Icon name={x.kind === 'error' ? 'alert-tri' : x.kind === 'success' ? 'check' : 'bell'} size={15}/>
          <div className="toast-text">
            <div className="toast-title">{x.title}</div>
            {x.detail && <div className="toast-detail">{x.detail}</div>}
          </div>
          <button className="toast-close" aria-label={t('Dismiss')} onClick={() => dismissToast(x.id)}><Icon name="x" size={13}/></button>
        </div>
      ))}
    </div>
  );
};
