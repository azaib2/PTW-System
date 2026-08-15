import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveScannedCode } from './qrService';

const SCANNER_ELEMENT_ID = 'qr-scanner-region';

export default function QrScannerPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [resolving, setResolving] = useState(false);
  const scannerRef = useRef<any>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    stoppedRef.current = false;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 240 },
        async (decodedText: string) => {
          if (stoppedRef.current) return;
          stoppedRef.current = true;
          await scanner.stop().catch(() => {});
          handleResolved(decodedText);
        },
        () => { /* per-frame scan failures are normal while aiming — ignore */ }
      ).catch((e: Error) => setError(`Camera unavailable: ${e.message}. You can enter a code manually below.`));
    });

    return () => {
      cancelled = true;
      if (scannerRef.current && !stoppedRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function handleResolved(rawValue: string) {
    setResolving(true);
    setError(null);
    try {
      const result = await resolveScannedCode(rawValue);
      if (result.kind === 'permit') navigate(`/verify/${result.target}`);
      else if (result.kind === 'location') navigate(`/permits/new?location=${encodeURIComponent(result.target)}`);
      else setError('Unrecognized QR code.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resolve code.');
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Scan Permit QR</h1>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      <div id={SCANNER_ELEMENT_ID} className="rounded-xl overflow-hidden bg-black" />

      {resolving && <div className="text-center text-sm text-slate-400">Looking up code…</div>}

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <div className="text-xs text-slate-500">Camera not working? Enter the code manually:</div>
        <div className="flex gap-2">
          <input value={manualCode} onChange={e => setManualCode(e.target.value)}
            placeholder="Permit ID or QR code" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={() => manualCode && handleResolved(manualCode)}
            className="bg-brand text-white font-medium px-4 rounded-lg text-sm">Go</button>
        </div>
      </div>
    </div>
  );
}
