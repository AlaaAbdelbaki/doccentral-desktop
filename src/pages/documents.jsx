// Documents (Epic 9): attachments grid, upload against a patient, view & preview.
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { Modal, Field, fmtDate, fullName, EmptyState } from '../components.jsx';
import { attachmentRepo, patientRepo } from '../lib/repos.js';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';

const isImage = (name) => /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);

export const DocumentsPage = ({ onNavigate, badges }) => {
  const { localUser } = useAuth();
  const [docs, setDocs] = useState([]);
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [patients, setPatients] = useState([]);

  const load = async () => {
    setDocs(await attachmentRepo.list());
    setPatients(await patientRepo.list());
  };
  useEffect(() => { load(); return onDataChanged(load); }, []);

  const startUpload = async () => {
    const picked = await window.dc.files.pick();
    if (!picked) return;
    setUploading({ picked, patientId: patients[0]?.id || '' });
  };

  const confirmUpload = async () => {
    const imported = await window.dc.files.import(uploading.picked.path);
    await attachmentRepo.create({
      target_type: 'patient', target_id: uploading.patientId, file_name: imported.name,
      storage_path: imported.storagePath, file_size_bytes: imported.size,
      uploaded_by_user_id: localUser.id,
    });
    setUploading(null);
  };

  const openDoc = async (d) => {
    if (isImage(d.file_name)) {
      const dataUrl = await window.dc.files.dataUrl(d.storage_path);
      if (dataUrl) { setPreview({ ...d, dataUrl }); return; }
    }
    window.dc.files.open(d.storage_path);
  };

  const filtered = docs.filter((d) =>
    d.file_name.toLowerCase().includes(q.toLowerCase()) ||
    (d.patient_name || '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="app">
      <Sidebar active="docs" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>Documents</span>}
          subtitle={`${docs.length} files · imaging, consents, records`}
          actions={<button className="btn-primary" onClick={startUpload}><Icon name="plus" size={14}/>Upload</button>}/>
        <div className="content">
          <div className="toolbar">
            <div className="search-inline">
              <Icon name="search" size={14}/><input placeholder="Search files or patients…" value={q} onChange={(e) => setQ(e.target.value)}/>
            </div>
          </div>
          {filtered.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {filtered.map((d) => (
                <div key={d.id} className="doc-card" onClick={() => openDoc(d)}>
                  <div className="placeholder-doc" style={{
                    aspectRatio: '4/3', borderRadius: 0,
                    background: isImage(d.file_name) ? 'var(--ink-800)' : 'var(--blue-50)',
                    color: isImage(d.file_name) ? 'var(--ink-300)' : 'var(--blue-500)',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <Icon name={isImage(d.file_name) ? 'tooth' : 'file-text'} size={30}/>
                      <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        {isImage(d.file_name) ? 'Imaging' : 'Document'}
                      </span>
                    </div>
                  </div>
                  <div className="doc-foot">
                    <div className="doc-name">{d.file_name}</div>
                    <div className="doc-meta">{d.patient_name || '—'} · {fmtDate(d.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <EmptyState icon="file-text" title="No documents" hint="Upload X-rays, consents and records against a patient."/>}
        </div>
      </main>

      {uploading && (
        <Modal title={`Upload — ${uploading.picked.name}`} onClose={() => setUploading(null)}
          footer={<>
            <button className="btn-ghost" onClick={() => setUploading(null)}>Cancel</button>
            <button className="btn-primary" disabled={!uploading.patientId} onClick={confirmUpload}><Icon name="check" size={13}/>Upload</button>
          </>}>
          <Field label="Attach to patient">
            <select value={uploading.patientId} onChange={(e) => setUploading({ ...uploading, patientId: e.target.value })}>
              {patients.map((p) => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
            </select>
          </Field>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)' }}>
            {(uploading.picked.size / 1024).toFixed(0)} KB — stored locally, mirrored on sync.
          </div>
        </Modal>
      )}

      {preview && (
        <Modal wide title={preview.file_name} onClose={() => setPreview(null)}
          footer={<button className="btn-ghost" onClick={() => window.dc.files.open(preview.storage_path)}>Open in system viewer</button>}>
          <img className="attach-preview" src={preview.dataUrl} alt={preview.file_name}/>
        </Modal>
      )}
    </div>
  );
};
