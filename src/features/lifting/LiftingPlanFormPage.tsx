import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { createLiftingPlan } from './liftingService';
import { DEFAULT_LIFT_SEQUENCE } from './checklistDefs';

interface FormValues {
  project_id: string; contractor_id: string; location: string; description: string;
  load_description: string; load_weight_ton: string; load_length_m: string; load_width_m: string; load_height_m: string;
  center_of_gravity: string; lifting_points: string;
  crane_type: string; crane_id: string; rated_capacity_ton: string; boom_length_m: string;
  counterweight_ton: string; outrigger_configuration: string; working_radius_m: string; lift_height_m: string;
  sling_type: string; sling_capacity_ton: string; shackle_type: string; shackle_capacity_ton: string;
  wll_swl_ton: string; sling_angle_deg: string;
  lifting_supervisor_name: string; operator_name: string; rigger_name: string; signalman_name: string;
  ground_condition: string; ground_bearing_assessment: string; underground_services: string;
}

export default function LiftingPlanFormPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const linkedPermitId = params.get('permitId');

  const [projects, setProjects] = useState<{ id: string; project_name: string }[]>([]);
  const [contractors, setContractors] = useState<{ id: string; company_name: string }[]>([]);
  const [steps, setSteps] = useState<string[]>(DEFAULT_LIFT_SEQUENCE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit } = useForm<FormValues>();

  useEffect(() => {
    supabase.from('projects').select('id, project_name').then(({ data }) => setProjects(data ?? []));
    supabase.from('contractors').select('id, company_name').then(({ data }) => setContractors(data ?? []));
  }, []);

  async function onSubmit(v: FormValues) {
    if (!profile) return;
    setSubmitting(true);
    setError(null);
    try {
      const plan = await createLiftingPlan({
        linked_permit_id: linkedPermitId,
        project_id: v.project_id,
        contractor_id: v.contractor_id,
        location: v.location,
        description: v.description || undefined,
        load_description: v.load_description || undefined,
        load_weight_ton: v.load_weight_ton ? Number(v.load_weight_ton) : undefined,
        load_length_m: v.load_length_m ? Number(v.load_length_m) : undefined,
        load_width_m: v.load_width_m ? Number(v.load_width_m) : undefined,
        load_height_m: v.load_height_m ? Number(v.load_height_m) : undefined,
        center_of_gravity: v.center_of_gravity || undefined,
        lifting_points: v.lifting_points || undefined,
        crane_type: v.crane_type || undefined,
        crane_id: v.crane_id || undefined,
        rated_capacity_ton: v.rated_capacity_ton ? Number(v.rated_capacity_ton) : undefined,
        boom_length_m: v.boom_length_m ? Number(v.boom_length_m) : undefined,
        counterweight_ton: v.counterweight_ton ? Number(v.counterweight_ton) : undefined,
        outrigger_configuration: v.outrigger_configuration || undefined,
        working_radius_m: v.working_radius_m ? Number(v.working_radius_m) : undefined,
        lift_height_m: v.lift_height_m ? Number(v.lift_height_m) : undefined,
        sling_type: v.sling_type || undefined,
        sling_capacity_ton: v.sling_capacity_ton ? Number(v.sling_capacity_ton) : undefined,
        shackle_type: v.shackle_type || undefined,
        shackle_capacity_ton: v.shackle_capacity_ton ? Number(v.shackle_capacity_ton) : undefined,
        wll_swl_ton: v.wll_swl_ton ? Number(v.wll_swl_ton) : undefined,
        sling_angle_deg: v.sling_angle_deg ? Number(v.sling_angle_deg) : undefined,
        lifting_supervisor_name: v.lifting_supervisor_name || undefined,
        operator_name: v.operator_name || undefined,
        rigger_name: v.rigger_name || undefined,
        signalman_name: v.signalman_name || undefined,
        ground_condition: v.ground_condition || undefined,
        ground_bearing_assessment: v.ground_bearing_assessment || undefined,
        underground_services: v.underground_services || undefined,
        created_by: profile.id
      }, steps);
      navigate(linkedPermitId ? `/permits/${linkedPermitId}` : `/lifting/plans/${plan.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create lifting plan.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-brand focus:ring-1 focus:ring-brand';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
  const section = (title: string, children: React.ReactNode) => (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-lg font-bold text-navy">Create Lifting Plan</h1>
      {linkedPermitId && <p className="text-xs text-slate-400">Will be linked to the Lifting PTW you came from.</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {section('General', <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelClass}>Project *</label>
              <select {...register('project_id', { required: true })} className={inputClass}>
                <option value="">Select…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Contractor *</label>
              <select {...register('contractor_id', { required: true })} className={inputClass}>
                <option value="">Select…</option>
                {contractors.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelClass}>Location *</label><input {...register('location', { required: true })} className={inputClass} /></div>
          <div><label className={labelClass}>Description</label><textarea {...register('description')} className={inputClass} rows={2} /></div>
        </>)}

        {section('Load', <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className={labelClass}>Load Description</label><input {...register('load_description')} className={inputClass} /></div>
          <div><label className={labelClass}>Weight (t)</label><input type="number" step="0.01" {...register('load_weight_ton')} className={inputClass} /></div>
          <div><label className={labelClass}>Length (m)</label><input type="number" step="0.01" {...register('load_length_m')} className={inputClass} /></div>
          <div><label className={labelClass}>Width (m)</label><input type="number" step="0.01" {...register('load_width_m')} className={inputClass} /></div>
          <div><label className={labelClass}>Height (m)</label><input type="number" step="0.01" {...register('load_height_m')} className={inputClass} /></div>
          <div><label className={labelClass}>Center of Gravity</label><input {...register('center_of_gravity')} className={inputClass} /></div>
          <div><label className={labelClass}>Lifting Points</label><input {...register('lifting_points')} className={inputClass} /></div>
        </div>)}

        {section('Crane', <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Crane Type</label><input {...register('crane_type')} className={inputClass} /></div>
          <div><label className={labelClass}>Crane ID</label><input {...register('crane_id')} className={inputClass} /></div>
          <div><label className={labelClass}>Rated Capacity (t)</label><input type="number" step="0.01" {...register('rated_capacity_ton')} className={inputClass} /></div>
          <div><label className={labelClass}>Boom Length (m)</label><input type="number" step="0.01" {...register('boom_length_m')} className={inputClass} /></div>
          <div><label className={labelClass}>Counterweight (t)</label><input type="number" step="0.01" {...register('counterweight_ton')} className={inputClass} /></div>
          <div><label className={labelClass}>Outrigger Configuration</label><input {...register('outrigger_configuration')} className={inputClass} /></div>
          <div><label className={labelClass}>Working Radius (m)</label><input type="number" step="0.01" {...register('working_radius_m')} className={inputClass} /></div>
          <div><label className={labelClass}>Lift Height (m)</label><input type="number" step="0.01" {...register('lift_height_m')} className={inputClass} /></div>
        </div>)}

        {section('Rigging', <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Sling Type</label><input {...register('sling_type')} className={inputClass} /></div>
          <div><label className={labelClass}>Sling Capacity (t)</label><input type="number" step="0.01" {...register('sling_capacity_ton')} className={inputClass} /></div>
          <div><label className={labelClass}>Shackle Type</label><input {...register('shackle_type')} className={inputClass} /></div>
          <div><label className={labelClass}>Shackle Capacity (t)</label><input type="number" step="0.01" {...register('shackle_capacity_ton')} className={inputClass} /></div>
          <div><label className={labelClass}>WLL/SWL (t)</label><input type="number" step="0.01" {...register('wll_swl_ton')} className={inputClass} /></div>
          <div><label className={labelClass}>Sling Angle (°)</label><input type="number" step="0.1" {...register('sling_angle_deg')} className={inputClass} /></div>
        </div>)}

        {section('Personnel', <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Lifting Supervisor</label><input {...register('lifting_supervisor_name')} className={inputClass} /></div>
          <div><label className={labelClass}>Operator</label><input {...register('operator_name')} className={inputClass} /></div>
          <div><label className={labelClass}>Rigger</label><input {...register('rigger_name')} className={inputClass} /></div>
          <div><label className={labelClass}>Signalman</label><input {...register('signalman_name')} className={inputClass} /></div>
        </div>)}

        {section('Ground', <div className="space-y-3">
          <div><label className={labelClass}>Ground Condition</label><input {...register('ground_condition')} className={inputClass} /></div>
          <div><label className={labelClass}>Ground Bearing Assessment</label><input {...register('ground_bearing_assessment')} className={inputClass} /></div>
          <div><label className={labelClass}>Underground Services</label><input {...register('underground_services')} className={inputClass} /></div>
        </div>)}

        {section('Lift Sequence', <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
              <input value={s} onChange={e => setSteps(prev => prev.map((p, idx) => idx === i ? e.target.value : p))} className={inputClass} />
              <button type="button" onClick={() => setSteps(prev => prev.filter((_, idx) => idx !== i))} className="text-danger text-xs shrink-0">Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => setSteps(prev => [...prev, ''])} className="text-brand text-sm font-medium">+ Add Step</button>
        </div>)}

        {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

        <div className="sticky bottom-16 md:bottom-0 bg-bgapp py-3 -mx-4 px-4 border-t border-slate-200">
          <button type="submit" disabled={submitting} className="w-full bg-brand text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
            {submitting ? 'Saving…' : 'Save Lifting Plan'}
          </button>
        </div>
      </form>
    </div>
  );
}
