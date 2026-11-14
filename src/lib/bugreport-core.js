// Bug reports: build, send, and queue when sending isn't possible. Pure logic
// (no Supabase, no Electron) so it's testable with fakes.
//
//   remote.upload(path, bytes, type) → { error }   (private storage bucket)
//   remote.insert(row)               → { error }   (bug_reports table, insert-only)
//   outbox.put(report) / list() / remove(id)       (local queue)

export const LIMITS = { files: 5, fileBytes: 10 * 1024 * 1024, description: 10000 };

// Only what the user chose to include goes into the report.
export function buildReport({
  id, createdAt = new Date().toISOString(), description, clinicId = null, appVersion = null,
  language = null, files = [], device = null, logs = null, includeDevice = false, includeLogs = false,
}) {
  const text = String(description || '').trim();
  if (!text) throw new Error('A description is required');
  if (text.length > LIMITS.description) throw new Error('The description is too long');
  if (files.length > LIMITS.files) throw new Error('Too many files');
  if (files.some((f) => f.bytes.length > LIMITS.fileBytes)) throw new Error('A file is too large');
  return {
    id,
    created_at: createdAt,
    clinic_id: clinicId,
    description: text,
    app_version: appVersion,
    language,
    diagnostics: includeDevice && device ? device : null,
    logs: includeLogs && logs ? logs : null,
    files: files.map((f) => ({ name: f.name, type: f.type || 'application/octet-stream', bytes: f.bytes })),
  };
}

// Storage object names: keep them simple and unique within the report.
export const safeName = (name) =>
  String(name).normalize('NFKD').replace(/[̀-ͯ]/g, '') // drop accents
    .replace(/[^\w.-]+/g, '_').replace(/^\.+/, '').slice(-80) || 'file';

// A retry after a partial failure must not fail on what already got through.
const isDuplicate = (error) =>
  error && (String(error.statusCode) === '409' || error.code === '23505' || /already exists|duplicate/i.test(error.message || ''));

export function createReporter({ remote, outbox }) {
  async function send(report, uid) {
    const attachments = [];
    for (const [i, f] of report.files.entries()) {
      const path = `${uid}/${report.id}/${i}-${safeName(f.name)}`;
      const { error } = await remote.upload(path, f.bytes, f.type);
      if (error && !isDuplicate(error)) throw new Error(error.message || 'upload failed');
      attachments.push({ path, name: f.name, type: f.type, size: f.bytes.length });
    }
    const { files, ...row } = report;
    const { error } = await remote.insert({ ...row, reporter_auth_id: uid, attachments });
    if (error && !isDuplicate(error)) throw new Error(error.message || 'insert failed');
  }

  return {
    // → { status: 'sent' } or { status: 'queued', error? }. Never throws for
    // network trouble: the report is kept and sent later.
    async submit(report, uid) {
      if (!uid) {
        await outbox.put(report);
        return { status: 'queued' };
      }
      try {
        await send(report, uid);
        return { status: 'sent' };
      } catch (e) {
        await outbox.put(report);
        return { status: 'queued', error: e.message };
      }
    },
    // Send what's waiting; a report that still fails stays queued.
    async flush(uid) {
      if (!uid) return 0;
      let sent = 0;
      for (const report of await outbox.list()) {
        try {
          await send(report, uid);
          await outbox.remove(report.id);
          sent++;
        } catch {
          // keep it for the next attempt
        }
      }
      return sent;
    },
  };
}
