import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchPermitWorkers, addPermitWorker, signOnWorker, signOffWorker } from './permitService';

interface WorkerRow {
  id: string;
  full_name: string;
  designation: string | null;
  certifications: string | null;
  signed_on_at: string | null;
  signed_off_at: string | null;
}

// Worker Log & Sign On/Off — every reference template carries this table
// (Name, Designation, Certs/Accreditations, Sign-On, Sign-Off). It replaces
// the plain `permits.workers` name list with real per-worker evidence: who
// was on site, when they signed on, and when they signed off.
export default function WorkerLogPanel({ permitId, disabled }: { permitId: string; disabled?: boolean }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState<WorkerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  const [certifications, setCertifications] = useState('');

  async function load() {
    try {
      setRows(await fetchPermitWorkers(permitId) as WorkerRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load worker log.');
    }
  }
  useEffect(() => { load(); }, [permitId]);

  async function handleAdd() {
    if (!profile || !fullName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addPermitWorker(permitId, { full_name: fullName.trim(), designation: designation.trim() || undefined, certifications: certifications.trim() || undefined }, profile.id);
      setFullName(''); setDesignation(''); setCertifications('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add worker.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOn(id: string) {
    if (!profile) return;
    setBusy(true);
    try { await signOnWorker(id, profile.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sign-on failed.'); }
    finally { setBusy(false); }
  }

  async function handleSignOff(id: string) {
    if (!profile) return;
    setBusy(true);
    try { await signOffWorker(id, profile.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Sign-off failed.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">Worker Log — Sign On / Sign Off</h2>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-xs p-2">{error}</div>}

      {rows.length === 0 && <div className="text-xs text-slate-400">No workers logged yet.</div>}
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="border border-slate-100 rounded-lg p-2.5 text-sm">
            <div className="font-medium text-slate-800">{r.full_name}</div>
            <div className="text-xs text-slate-500">
              {r.designation || '—'}{r.certifications ? ` · ${r.certifications}` : ''}
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs">
              <span className={r.signed_on_at ? 'text-success font-medium' : 'text-slate-400'}>
                {r.signed_on_at ? `On: ${format(new Date(r.signed_on_at), 'dd MMM HH:mm')}` : 'Not signed on'}
              </span>
              <span className={r.signed_off_at ? 'text-slate-500 font-medium' : 'text-slate-400'}>
                {r.signed_off_at ? `Off: ${format(new Date(r.signed_off_at), 'dd MMM HH:mm')}` : 'Not signed off'}
              </span>
            </div>
            {!disabled && (
              <div className="flex gap-2 mt-2">
                {!r.signed_on_at && (
                  <button disabled={busy} onClick={() => handleSignOn(r.id)} className="flex-1 bg-success text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-60">Sign On</button>
                )}
                {r.signed_on_at && !r.signed_off_at && (
                  <button disabled={busy} onClick={() => handleSignOff(r.id)} className="flex-1 bg-slate-600 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-60">Sign Off</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <input placeholder="Worker name" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Designation" value={designation} onChange={e => setDesignation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Certs / accreditations" value={certifications} onChange={e => setCertifications(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <button disabled={busy || !fullName.trim()} onClick={handleAdd}
            className="w-full bg-slate-100 text-slate-700 text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60">
            + Add Worker to Log
          </button>
        </div>
      )}
    </div>
  );
}
