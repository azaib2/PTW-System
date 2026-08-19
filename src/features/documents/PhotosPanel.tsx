import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { uploadPhoto, fetchPhotos, getPhotoUrl, deletePhoto } from './documentService';

interface PhotoRow { id: string; storage_path: string; caption: string | null; created_at: string; }

export default function PhotosPanel({ permitId, disabled }: { permitId: string; disabled?: boolean }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<PhotoRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const data = await fetchPhotos(permitId) as PhotoRow[];
      setRows(data);
      const entries = await Promise.all(data.map(async r => [r.id, await getPhotoUrl(r.storage_path)] as const));
      setUrls(Object.fromEntries(entries));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load photos.');
    }
  }
  useEffect(() => { load(); }, [permitId]);

  async function handleFile(file: File) {
    if (!profile) return;
    setUploading(true);
    setError(null);
    try {
      await uploadPhoto({ permit_id: permitId, file, caption: caption || undefined, taken_by: profile.id });
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(row: PhotoRow) {
    try { await deletePhoto(row.id, row.storage_path); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Delete failed.'); }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Photo Evidence</h2>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-xs p-2">{error}</div>}

      {rows.length === 0 && <div className="text-xs text-slate-400">No photos uploaded yet.</div>}
      <div className="grid grid-cols-3 gap-2">
        {rows.map(r => (
          <div key={r.id} className="relative">
            {urls[r.id] && <img src={urls[r.id]} alt={r.caption ?? ''} className="w-full h-24 object-cover rounded-lg" />}
            {r.caption && <div className="text-[10px] text-slate-500 truncate mt-0.5">{r.caption}</div>}
            {!disabled && (
              <button onClick={() => handleDelete(r)} className="absolute top-1 right-1 bg-white/90 rounded-full w-5 h-5 text-danger text-xs font-bold">×</button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <input placeholder="Provide photo for site verification" value={caption} onChange={e => setCaption(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={uploading} className="text-sm w-full" />
          {uploading && <div className="text-xs text-slate-400">Uploading…</div>}
        </div>
      )}
    </div>
  );
}
