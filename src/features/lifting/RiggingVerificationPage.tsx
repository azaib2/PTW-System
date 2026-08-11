import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { createRiggingVerification, fetchRiggingItems, toggleRiggingItem, finalizeRigging } from './liftingService';

interface ItemRow { id: string; item_key: string; item_label: string; is_checked: boolean; }

export default function RiggingVerificationPage() {
  const [params] = useSearchParams();
  const permitId = params.get('permitId');
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  async function start() {
    if (!profile) return;
    setStarting(true);
    setError(null);
    try {
      const v = await createRiggingVerification(permitId, profile.id);
      setVerificationId(v.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start.');
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (verificationId) fetchRiggingItems(verificationId).then(d => setItems(d as ItemRow[])).catch(e => setError(e.message));
  }, [verificationId]);

  async function toggle(item: ItemRow) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: !item.is_checked } : i));
    try { await toggleRiggingItem(item.id, !item.is_checked); }
    catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); }
  }

  async function finalize(result: 'pass' | 'fail') {
    if (!verificationId) return;
    setSubmitting(true);
    try {
      await finalizeRigging(verificationId, result);
      navigate(permitId ? `/permits/${permitId}` : '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!verificationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-navy">Rigging Verification</h1>
        <p className="text-sm text-slate-500">Inspect slings, shackles, hooks and lifting accessories before use.</p>
        {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
        <button onClick={start} disabled={starting} className="w-full bg-brand text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
          {starting ? 'Starting…' : 'Start Rigging Verification'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      <h1 className="text-lg font-bold text-navy">Rigging Verification</h1>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
      <div className="bg-white rounded-xl shadow-sm p-4">
        {items.map(i => (
          <label key={i.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
            <span className="text-slate-700 pr-3">{i.item_label}</span>
            <input type="checkbox" checked={i.is_checked} onChange={() => toggle(i)} className="w-6 h-6 accent-success shrink-0" />
          </label>
        ))}
      </div>
      <div className="sticky bottom-16 md:bottom-0 bg-bgapp py-3 -mx-4 px-4 border-t border-slate-200 flex gap-2">
        <button onClick={() => finalize('pass')} disabled={submitting} className="flex-1 bg-success text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">PASS</button>
        <button onClick={() => finalize('fail')} disabled={submitting} className="flex-1 bg-danger text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">FAIL</button>
      </div>
    </div>
  );
}
