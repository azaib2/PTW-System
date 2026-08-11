import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/features/auth/AuthContext';
import {
  createCraneChecklist, fetchCraneChecklistItems, toggleCraneChecklistItem,
  computeCraneResult, finalizeCraneChecklist
} from './liftingService';

interface ItemRow { id: string; category: string; item_key: string; item_label: string; is_checked: boolean; is_critical: boolean; }
interface FormValues { crane_id: string; crane_type: string; capacity_ton: string; operator_name: string; shift: string; location: string; }

export default function CraneChecklistPage() {
  const { checklistId } = useParams<{ checklistId: string }>();
  const [params] = useSearchParams();
  const permitId = params.get('permitId');
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [activeId, setActiveId] = useState<string | null>(checklistId ?? null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit } = useForm<FormValues>();

  useEffect(() => {
    if (activeId) fetchCraneChecklistItems(activeId).then(d => setItems(d as ItemRow[])).catch(e => setError(e.message));
  }, [activeId]);

  async function onCreate(v: FormValues) {
    if (!profile) return;
    setSubmitting(true);
    setError(null);
    try {
      const checklist = await createCraneChecklist({
        permit_id: permitId, crane_id: v.crane_id, crane_type: v.crane_type || undefined,
        capacity_ton: v.capacity_ton ? Number(v.capacity_ton) : undefined,
        operator_name: v.operator_name, shift: v.shift || undefined, location: v.location || undefined,
        performed_by: profile.id
      });
      setActiveId(checklist.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create checklist.');
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(item: ItemRow) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_checked: !item.is_checked } : i));
    try { await toggleCraneChecklistItem(item.id, !item.is_checked); }
    catch (e) { setError(e instanceof Error ? e.message : 'Save failed.'); }
  }

  const result = items.length ? computeCraneResult(items) : null;
  const categories = Array.from(new Set(items.map(i => i.category)));

  async function finalize() {
    if (!activeId || !result) return;
    setSubmitting(true);
    try {
      await finalizeCraneChecklist(activeId, result, result !== 'pass' ? correctiveAction : undefined);
      navigate(permitId ? `/permits/${permitId}` : '/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save result.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-brand focus:ring-1 focus:ring-brand';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  if (!activeId) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-navy">Crane Checklist</h1>
        <form onSubmit={handleSubmit(onCreate)} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Crane ID *</label><input {...register('crane_id', { required: true })} className={inputClass} /></div>
            <div><label className={labelClass}>Crane Type</label><input {...register('crane_type')} className={inputClass} /></div>
            <div><label className={labelClass}>Capacity (t)</label><input type="number" step="0.01" {...register('capacity_ton')} className={inputClass} /></div>
            <div><label className={labelClass}>Operator *</label><input {...register('operator_name', { required: true })} className={inputClass} /></div>
            <div><label className={labelClass}>Shift</label><input {...register('shift')} className={inputClass} /></div>
            <div><label className={labelClass}>Location</label><input {...register('location')} className={inputClass} /></div>
          </div>
          {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
          <button type="submit" disabled={submitting} className="w-full bg-brand text-white font-semibold py-3 rounded-lg disabled:opacity-60">
            {submitting ? 'Starting…' : 'Start Checklist'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      <h1 className="text-lg font-bold text-navy">Crane Checklist</h1>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      {categories.map(cat => (
        <div key={cat} className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">{cat}</h2>
          {items.filter(i => i.category === cat).map(i => (
            <label key={i.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
              <span className="text-slate-700 pr-3">{i.item_label}{i.is_critical && <span className="text-danger ml-1">*</span>}</span>
              <input type="checkbox" checked={i.is_checked} onChange={() => toggle(i)} className={`w-6 h-6 shrink-0 ${i.is_critical ? 'accent-danger' : 'accent-success'}`} />
            </label>
          ))}
        </div>
      ))}

      <div className="sticky bottom-16 md:bottom-0 bg-bgapp py-3 -mx-4 px-4 border-t border-slate-200 space-y-2">
        {result === 'fail' && (
          <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm font-semibold p-3">
            🔴 CRANE NOT CLEARED FOR LIFTING — a critical item has failed.
          </div>
        )}
        {result === 'pass_with_action' && (
          <div className="rounded-lg bg-amber-50 border border-warning text-amber-800 text-sm p-3">
            PASS WITH ACTION — some non-critical items still need attention.
          </div>
        )}
        {result !== 'pass' && result !== null && (
          <textarea value={correctiveAction} onChange={e => setCorrectiveAction(e.target.value)}
            placeholder="Corrective action required…" className={inputClass} rows={2} />
        )}
        <button onClick={finalize} disabled={submitting}
          className={`w-full font-semibold py-3.5 rounded-lg text-white disabled:opacity-60 ${result === 'fail' ? 'bg-danger' : result === 'pass_with_action' ? 'bg-warning' : 'bg-success'}`}>
          {submitting ? 'Saving…' : `Record Result: ${result?.replace(/_/g, ' ').toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}
