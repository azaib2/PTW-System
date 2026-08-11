import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import {
  createSitePreparationChecklist, fetchSitePreparationItems, toggleSitePreparationItem, finalizeSitePreparation
} from './liftingService';

interface ItemRow { id: string; category: string; item_key: string; item_label: string; is_checked: boolean; }

export default function SitePreparationPage() {
  const [params] = useSearchParams();
  const permitId = params.get('permitId');
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [checklistId, setChecklistId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  async function start() {
    if (!profile) return;
    setStarting(true);
    setError(null);
    try {
      const checklist = await createSitePreparationChecklist(permitId, profile.id);
      setChecklistId(checklist.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start checklist.');
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (checklistId) fetchSitePreparationItems(checklistId).then(d => setItems(d as ItemRow[])).catch(e => setError(e.message));
  }, [checklistId]);

  async function toggle(item: ItemRow) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: !item.is_checked } : i));
    try { await toggleSitePreparationItem(item.id, !item.is_checked); }
    catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); }
  }

  async function finalize(result: 'pass' | 'fail') {
    if (!checklistId) return;
    setSubmitting(true);
    try {
      await finalizeSitePreparation(checklistId, result);
      navigate(permitId ? `/permits/${permitId}` : '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  }

  const categories = Array.from(new Set(items.map(i => i.category)));
  const checkedCount = items.filter(i => i.is_checked).length;

  if (!checklistId) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-navy">Site Preparation</h1>
        <p className="text-sm text-slate-500">Verify access, ground, crane setup, lifting zone, electrical, environment and SIMOPS controls before lifting.</p>
        {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
        <button onClick={start} disabled={starting} className="w-full bg-brand text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
          {starting ? 'Starting…' : 'Start Site Preparation Checklist'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-navy">Site Preparation</h1>
        <span className="text-xs text-slate-400">{checkedCount}/{items.length} checked</span>
      </div>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      {categories.map(cat => (
        <div key={cat} className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">{cat}</h2>
          {items.filter(i => i.category === cat).map(i => (
            <label key={i.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
              <span className="text-slate-700 pr-3">{i.item_label}</span>
              <input type="checkbox" checked={i.is_checked} onChange={() => toggle(i)} className="w-6 h-6 accent-success shrink-0" />
            </label>
          ))}
        </div>
      ))}

      <div className="sticky bottom-16 md:bottom-0 bg-bgapp py-3 -mx-4 px-4 border-t border-slate-200 flex gap-2">
        <button onClick={() => finalize('pass')} disabled={submitting} className="flex-1 bg-success text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">PASS</button>
        <button onClick={() => finalize('fail')} disabled={submitting} className="flex-1 bg-danger text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">FAIL</button>
      </div>
    </div>
  );
}
