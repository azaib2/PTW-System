import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { uploadAttachment, fetchAttachments, getAttachmentDownloadUrl, deleteAttachment } from './documentService';

interface AttachmentRow {
  id: string; file_name: string; storage_path: string; doc_type: string | null;
  doc_number: string | null; issue_date: string | null; expiry_date: string | null;
  status: 'valid' | 'expiring' | 'expired' | null; created_at: string;
}

const DOC_TYPES = ['Certificate', 'Load Chart', 'Risk Assessment', 'Method Statement', 'Lifting Drawing', 'Other'];
const STATUS_ICON: Record<string, string> = { valid: '🟢', expiring: '🟡', expired: '🔴' };

export default function AttachmentsPanel({ permitId, disabled }: { permitId: string; disabled?: boolean }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<AttachmentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try { setRows(await fetchAttachments(permitId) as AttachmentRow[]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load attachments.'); }
  }
  useEffect(() => { load(); }, [permitId]);

  async function handleFile(file: File) {
    if (!profile) return;
    setUploading(true);
    setError(null);
    try {
      await uploadAttachment({ permit_id: permitId, file, doc_type: docType, doc_number: docNumber || undefined, expiry_date: expiryDate || undefined, uploaded_by: profile.id });
      setDocNumber(''); setExpiryDate('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(row: AttachmentRow) {
    try {
      const url = await getAttachmentDownloadUrl(row.storage_path);
      window.open(url, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate download link.');
    }
  }

  async function handleDelete(row: AttachmentRow) {
    try { await deleteAttachment(row.id, row.storage_path); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed.'); }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand';

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Documents & Certificates</h2>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-xs p-2">{error}</div>}

      {rows.length === 0 && <div className="text-xs text-slate-400">No documents uploaded yet.</div>}
      {rows.map(r => (
        <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
          <div className="min-w-0">
            <div className="font-medium text-slate-800 truncate">{r.file_name}</div>
            <div className="text-xs text-slate-500">
              {r.doc_type}{r.doc_number ? ` · #${r.doc_number}` : ''}{r.expiry_date ? ` · exp ${r.expiry_date}` : ''}
              {r.status && <span className="ml-1">{STATUS_ICON[r.status]}</span>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0 ml-2">
            <button onClick={() => handleDownload(r)} className="text-brand text-xs font-medium">View</button>
            {!disabled && <button onClick={() => handleDelete(r)} className="text-danger text-xs font-medium">Remove</button>}
          </div>
        </div>
      ))}

      {!disabled && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={docType} onChange={e => setDocType(e.target.value)} className={inputClass}>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input placeholder="Doc number" value={docNumber} onChange={e => setDocNumber(e.target.value)} className={inputClass} />
          </div>
          <input type="date" placeholder="Expiry date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inputClass} />
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={uploading} className="text-sm w-full" />
          {uploading && <div className="text-xs text-slate-400">Uploading…</div>}
        </div>
      )}
    </div>
  );
}
