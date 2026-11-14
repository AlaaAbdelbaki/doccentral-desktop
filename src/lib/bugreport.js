// App wiring for bug reports: Supabase as the destination, the main process
// for device info, logs, screenshots, files and the offline outbox.
import { supabase } from './supabase.js';
import { createReporter } from './bugreport-core.js';

export { buildReport, LIMITS } from './bugreport-core.js';

const BUCKET = 'bug-reports';

const supabaseRemote = {
  upload: (path, bytes, type) =>
    supabase.storage.from(BUCKET).upload(path, new Blob([bytes], { type }), { contentType: type, upsert: false }),
  // No .select(): reports are insert-only, the API can't read them back.
  insert: (row) => supabase.from('bug_reports').insert(row),
};

const reporter = createReporter({ remote: supabaseRemote, outbox: window.dc.report.outbox });

// Dev sessions (DOC_DEV_AUTOLOGIN) have no cloud account: reports are queued.
const uidOf = (session) => (session && !session.dev ? session.user?.id : null);

export const submitReport = (report, session) => reporter.submit(report, uidOf(session));

let flushing = null;
export function flushReports(session) {
  if (!flushing) flushing = reporter.flush(uidOf(session)).catch(() => 0).finally(() => { flushing = null; });
  return flushing;
}

export const reportSupport = window.dc.report;
