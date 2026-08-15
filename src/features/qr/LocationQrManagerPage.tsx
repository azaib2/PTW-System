import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { createLocationQr, fetchLocationQrs, generateLocationQrDataUrl } from './qrService';

interface LocationQr { id: string; code: string; default_location: string | null; created_at: string; }

export default function LocationQrManagerPage() {
  const { profile } = useAuth();
  const [codes, setCodes] = useState<LocationQr[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [label, setLabel] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const data = await fetchLocationQrs() as LocationQr[];
      setCodes(data);
      const entries = await Promise.all(data.map(async c => [c.code, await generateLocationQrDataUrl(c.code)] as const));
      setImages(Object.fromEntries(entries));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load location QR codes.');
    }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!profile || !label.trim() || !location.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createLocationQr(label.trim(), location.trim(), profile.id);
      setLabel(''); setLocation('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create location QR.');
    } finally {
      setSubmitting(false);
    }
  }

  function download(code: string) {
    const url = images[code];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = `${code}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Location QR Labels</h1>
      <p className="text-sm text-slate-500">Generate printable QR codes for fixed site locations (e.g. QR-HOT-B1-001). Scanning one pre-fills the location when creating a permit.</p>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Code label, e.g. QR-HOT-B1-001"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Default location text"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
        <button onClick={handleCreate} disabled={submitting || !label.trim() || !location.trim()}
          className="w-full bg-brand text-white font-semibold py-3 rounded-lg disabled:opacity-60">
          {submitting ? 'Creating…' : 'Create Location QR'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {codes.map(c => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm p-3 text-center space-y-1">
            {images[c.code] && <img src={images[c.code]} alt={c.code} className="w-full aspect-square object-contain" />}
            <div className="text-xs font-semibold text-slate-700">{c.code}</div>
            <div className="text-[11px] text-slate-400">{c.default_location}</div>
            <button onClick={() => download(c.code)} className="text-xs text-brand font-medium">Download</button>
          </div>
        ))}
      </div>
    </div>
  );
}
