import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { createPermit, type CreatePermitInput } from './permitService';
import { HOT_WORK_TYPES, CRITICAL_LIFT_QUESTIONS } from './controlDefs';
import type { PermitType } from '@/types';

interface FormValues {
  permit_type: PermitType;
  project_id: string;
  contractor_id: string;
  location: string;
  exact_area: string;
  activity: string;
  description: string;
  supervisor_name: string;
  workers: string;
  start_time: string;
  expiry_time: string;
  hot_work_type: string;
  load_description: string;
  load_weight_ton: string;
  crane_type: string;
  rated_capacity_ton: string;
  crane_manufacturer: string;
  lifting_supervisor_name: string;
  crane_operator_name: string;
  rigger_name: string;
  signalman_name: string;
}

export default function CreatePermitPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialType = (params.get('type') as PermitType) || 'hot_work';

  const [projects, setProjects] = useState<{ id: string; project_name: string }[]>([]);
  const [contractors, setContractors] = useState<{ id: string; company_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criticalAnswers, setCriticalAnswers] = useState<Record<string, boolean>>({});

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    defaultValues: { permit_type: initialType, location: params.get('location') ?? '' }
  });
  const permitType = watch('permit_type');

  useEffect(() => {
    supabase.from('projects').select('id, project_name').then(({ data }) => setProjects(data ?? []));
    if (profile?.contractor_id) {
      supabase.from('contractors').select('id, company_name').eq('id', profile.contractor_id)
        .then(({ data }) => setContractors(data ?? []));
    } else {
      supabase.from('contractors').select('id, company_name').eq('status', 'active')
        .then(({ data }) => setContractors(data ?? []));
    }
  }, [profile]);

  async function onSubmit(values: FormValues) {
    if (!profile) return;
    setSubmitting(true);
    setError(null);
    try {
      const input: CreatePermitInput = {
        permit_type: values.permit_type,
        project_id: values.project_id,
        contractor_id: values.contractor_id || profile.contractor_id || '',
        location: values.location,
        exact_area: values.exact_area || undefined,
        activity: values.activity,
        description: values.description || undefined,
        supervisor_name: values.supervisor_name,
        workers: values.workers ? values.workers.split(',').map(w => w.trim()).filter(Boolean) : undefined,
        start_time: new Date(values.start_time).toISOString(),
        expiry_time: new Date(values.expiry_time).toISOString(),
        created_by: profile.id,
        ...(values.permit_type === 'hot_work' ? { hot_work_type: values.hot_work_type } : {}),
        ...(values.permit_type === 'lifting' ? {
          load_description: values.load_description,
          load_weight_ton: values.load_weight_ton ? Number(values.load_weight_ton) : undefined,
          crane_type: values.crane_type,
          rated_capacity_ton: values.rated_capacity_ton ? Number(values.rated_capacity_ton) : undefined,
          crane_manufacturer: values.crane_manufacturer,
          lifting_supervisor_name: values.lifting_supervisor_name,
          crane_operator_name: values.crane_operator_name,
          rigger_name: values.rigger_name,
          signalman_name: values.signalman_name,
          critical_lift_answers: criticalAnswers
        } : {})
      };
      if (!input.contractor_id) throw new Error('Select a contractor.');

      const permit = await createPermit(input);
      navigate(`/permits/${permit.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create permit.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-brand focus:ring-1 focus:ring-brand';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-lg font-bold text-navy">Create Permit</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div>
            <label className={labelClass}>Permit Type *</label>
            <select {...register('permit_type', { required: true })} className={inputClass}>
              <option value="hot_work">Hot Work</option>
              <option value="cold_work">Cold Work</option>
              <option value="lifting">Lifting</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Project *</label>
              <select {...register('project_id', { required: true })} className={inputClass}>
                <option value="">Select…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Contractor *</label>
              <select {...register('contractor_id', { required: !profile?.contractor_id })} className={inputClass} defaultValue={profile?.contractor_id ?? ''}>
                {!profile?.contractor_id && <option value="">Select…</option>}
                {contractors.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Work Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Location *</label>
              <input {...register('location', { required: true })} className={inputClass} placeholder="e.g. Laydown Area 02" />
            </div>
            <div>
              <label className={labelClass}>Exact Work Area</label>
              <input {...register('exact_area')} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Activity *</label>
            <input {...register('activity', { required: true })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea {...register('description')} className={inputClass} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Supervisor *</label>
              <input {...register('supervisor_name', { required: true })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Workers (comma separated)</label>
              <input {...register('workers')} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Start Time *</label>
              <input type="datetime-local" {...register('start_time', { required: true })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Expiry Time *</label>
              <input type="datetime-local" {...register('expiry_time', { required: true })} className={inputClass} />
            </div>
          </div>
        </div>

        {permitType === 'hot_work' && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Hot Work Type</h2>
            <select {...register('hot_work_type', { required: true })} className={inputClass}>
              {HOT_WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <p className="text-xs text-slate-400">Gas testing readings are recorded separately by the assigned gas tester before field controls are verified.</p>
          </div>
        )}

        {permitType === 'lifting' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Load & Crane</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Load Description</label><input {...register('load_description')} className={inputClass} /></div>
                <div><label className={labelClass}>Load Weight (t)</label><input type="number" step="0.01" {...register('load_weight_ton')} className={inputClass} /></div>
                <div><label className={labelClass}>Crane Type</label><input {...register('crane_type')} className={inputClass} /></div>
                <div><label className={labelClass}>Rated Capacity (t)</label><input type="number" step="0.01" {...register('rated_capacity_ton')} className={inputClass} /></div>
                <div><label className={labelClass}>Manufacturer</label><input {...register('crane_manufacturer')} className={inputClass} /></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">Personnel</h2>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>Lifting Supervisor</label><input {...register('lifting_supervisor_name')} className={inputClass} /></div>
                <div><label className={labelClass}>Crane Operator</label><input {...register('crane_operator_name')} className={inputClass} /></div>
                <div><label className={labelClass}>Rigger</label><input {...register('rigger_name')} className={inputClass} /></div>
                <div><label className={labelClass}>Signalman</label><input {...register('signalman_name')} className={inputClass} /></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-700">Critical Lift Screening</h2>
              {CRITICAL_LIFT_QUESTIONS.map(q => (
                <label key={q.key} className="flex items-center justify-between py-1.5 text-sm text-slate-700">
                  {q.label}
                  <input type="checkbox" className="w-5 h-5 accent-danger"
                    onChange={e => setCriticalAnswers(prev => ({ ...prev, [q.key]: e.target.checked }))} />
                </label>
              ))}
              {Object.values(criticalAnswers).some(Boolean) && (
                <div className="mt-2 rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-2 font-semibold">
                  🔴 CRITICAL LIFT — additional documentation and approval will be required.
                </div>
              )}
            </div>
          </>
        )}

        {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
        {Object.keys(errors).length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-warning text-amber-800 text-sm p-3">
            Please complete all required fields marked with *.
          </div>
        )}

        <div className="sticky bottom-16 md:bottom-0 bg-bgapp py-3 -mx-4 px-4 border-t border-slate-200">
          <button type="submit" disabled={submitting}
            className="w-full bg-brand text-white font-semibold py-3.5 rounded-lg text-base disabled:opacity-60">
            {submitting ? 'Saving…' : 'Save as Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
