import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { getOrCreatePermitQr, generateQrDataUrl } from './qrService';

export default function PermitQrPanel({ permitId, permitNumber }: { permitId: string; permitNumber: string }) {
  const { profile } = useAuth();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const code = await getOrCreatePermitQr(permitId, profile.id);
        setDataUrl(await generateQrDataUrl(code));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate QR code.');
      }
    })();
  }, [permitId, profile]);

  function download() {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl; a.download = `${permitNumber}-QR.png`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 text-center space-y-2">
      <h2 className="text-sm font-semibold text-slate-700">Permit QR Code</h2>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-xs p-2">{error}</div>}
      {dataUrl ? (
        <>
          <img src={dataUrl} alt="Permit QR code" className="mx-auto w-40 h-40" />
          <button onClick={download} className="text-sm text-brand font-medium">Download QR Label</button>
        </>
      ) : !error && <div className="text-xs text-slate-400 py-6">Generating…</div>}
    </div>
  );
}
