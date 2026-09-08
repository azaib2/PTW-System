import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import { createPermit, updatePermit, type CreatePermitInput } from './permitService';
import {
  HOT_WORK_TYPES, CRITICAL_LIFT_QUESTIONS,
  DEFAULT_STANDARDS_BY_TYPE, DEFAULT_EQUIPMENT_BY_TYPE, DEFAULT_PPE_BY_TYPE, DEFAULT_EMERGENCY_PROCEDURE_BY_TYPE
} from './controlDefs';
import type { PermitType } from '@/types';

interface FormValues {
  permit_type: PermitType;
  project_id: string;
  contractor_id: string;
  location: string;
  exact_area: string;
  activity: string;
  description: string;
  detail_of_surroundings: string;
  supervisor_name: string;
  workers: string;
  start_time: string;
  expiry_time: string;
  hot_work_type: string;
  fire_watcher_name: string;
  load_description: string;
  load_weight_ton: string;
  crane_type: string;
  rated_capacity_ton: string;
  crane_manufacturer: string;
  lifting_supervisor_name: string;
  lifting_supervisor_contact: string;
  crane_operator_name: string;
  crane_operator_contact: string;
  rigger_name: string;
  rigger_contact: string;
  signalman_name: string;
  signalman_contact: string;
  additional_information: string;
  department: string;
  alternative_company_contact: string;
  company_permit_issuer: string;
  hours_of_work: string;
  deviations_from_method_statement: string;
  site_specific_hazards: string;
  work_leader_name: string;
  superintendent_name: string;
  no_alternative_method_confirmed: boolean;
  applicable_standards: string;
  equipment_used: string;
  ppe_required: string;
  additional_permits_required: string;
  emergency_procedure: string;
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CreatePermitPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { id: editPermitId } = useParams<{ id: string }>();
  const isEditMode = !!editPermitId;
  const initialType = (params.get('type') as PermitType) || 'hot_work';

  const [projects, setProjects] = useState<{ id: string; project_name: string }[]>([]);
  const [contractors, setContractors] = useState<{ id: string; company_name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criticalAnswers, setCriticalAnswers] = useState<Record<string, boolean>>({});
  const [lockedInfo, setLockedInfo] = useState<{ project_name: string; contractor_name: string } | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

  const { register, handleSubmit, watch, reset, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      permit_type: initialType, location: params.get('location') ?? '',
      applicable_standards: DEFAULT_STANDARDS_BY_TYPE[initialType as keyof typeof DEFAULT_STANDARDS_BY_TYPE] ?? '',
      equipment_used: DEFAULT_EQUIPMENT_BY_TYPE[initialType as keyof typeof DEFAULT_EQUIPMENT_BY_TYPE] ?? '',
      ppe_required: DEFAULT_PPE_BY_TYPE[initialType as keyof typeof DEFAULT_PPE_BY_TYPE] ?? '',
      emergency_procedure: DEFAULT_EMERGENCY_PROCEDURE_BY_TYPE[initialType as keyof typeof DEFAULT_EMERGENCY_PROCEDURE_BY_TYPE] ?? ''
    }
  });
  const permitType = watch('permit_type');

  // When creating a fresh permit (never edit mode) and the user changes
  // permit type, refresh the reference-text defaults — but only for fields
  // the user hasn't already typed something different into, so switching
  // type never silently overwrites something they wrote.
  const prevTypeRef = useRef<PermitType>(initialType);
  useEffect(() => {
    if (isEditMode) return;
    if (prevTypeRef.current === permitType) return;
    const prevType = prevTypeRef.current;
    prevTypeRef.current = permitType;
    const current = getValues();
    if (!current.applicable_standards || current.applicable_standards === DEFAULT_STANDARDS_BY_TYPE[prevType as keyof typeof DEFAULT_STANDARDS_BY_TYPE]) {
      setValue('applicable_standards', DEFAULT_STANDARDS_BY_TYPE[permitType as keyof typeof DEFAULT_STANDARDS_BY_TYPE] ?? '');
    }
    if (!current.equipment_used || current.equipment_used === DEFAULT_EQUIPMENT_BY_TYPE[prevType as keyof typeof DEFAULT_EQUIPMENT_BY_TYPE]) {
      setValue('equipment_used', DEFAULT_EQUIPMENT_BY_TYPE[permitType as keyof typeof DEFAULT_EQUIPMENT_BY_TYPE] ?? '');
    }
    if (!current.ppe_required || current.ppe_required === DEFAULT_PPE_BY_TYPE[prevType as keyof typeof DEFAULT_PPE_BY_TYPE]) {
      setValue('ppe_required', DEFAULT_PPE_BY_TYPE[permitType as keyof typeof DEFAULT_PPE_BY_TYPE] ?? '');
    }
    if (!current.emergency_procedure || current.emergency_procedure === DEFAULT_EMERGENCY_PROCEDURE_BY_TYPE[prevType as keyof typeof DEFAULT_EMERGENCY_PROCEDURE_BY_TYPE]) {
      setValue('emergency_procedure', DEFAULT_EMERGENCY_PROCEDURE_BY_TYPE[permitType as keyof typeof DEFAULT_EMERGENCY_PROCEDURE_BY_TYPE] ?? '');
    }
  }, [permitType, isEditMode, getValues, setValue]);

  useEffect(() => {
    supabase.from('projects').select('id, project_name').then(({ data, error }) => {
      if (error) setError(`Could not load projects: ${error.message}`);
      setProjects(data ?? []);
    });
    if (profile?.contractor_id) {
      supabase.from('contractors').select('id, company_name').eq('id', profile.contractor_id)
        .then(({ data, error }) => {
          if (error) setError(`Could not load your contractor: ${error.message}`);
          setContractors(data ?? []);
        });
    } else {
      supabase.from('contractors').select('id, company_name').eq('status', 'active')
        .then(({ data, error }) => {
          if (error) setError(`Could not load contractors: ${error.message}`);
          setContractors(data ?? []);
        });
    }
  }, [profile]);

  // Edit mode: load the existing draft and prefill every field. Type,
  // project, and contractor are locked — those are decided once at
  // creation and never change on an edit.
  useEffect(() => {
    if (!editPermitId) return;
    (async () => {
      const { data, error } = await supabase
        .from('permits').select('*, projects(project_name), contractors(company_name)')
        .eq('id', editPermitId).single();
      if (error || !data) {
        setError(error?.message ?? 'Could not load this permit.');
        setLoadingExisting(false);
        return;
      }
      if (data.status !== 'draft') {
        setError('This permit can no longer be edited — it is not in draft status.');
        setLoadingExisting(false);
        return;
      }
      setLockedInfo({
        project_name: (data as any).projects?.project_name ?? '—',
        contractor_name: (data as any).contractors?.company_name ?? '—'
      });
      reset({
        permit_type: data.permit_type, project_id: data.project_id, contractor_id: data.contractor_id,
        location: data.location ?? '', exact_area: data.exact_area ?? '', activity: data.activity ?? '',
        description: data.description ?? '', detail_of_surroundings: data.detail_of_surroundings ?? '',
        supervisor_name: data.supervisor_name ?? '', workers: (data.workers ?? []).join(', '),
        start_time: toLocalInputValue(data.start_time), expiry_time: toLocalInputValue(data.expiry_time),
        hot_work_type: data.hot_work_type ?? '', fire_watcher_name: data.fire_watcher_name ?? '',
        load_description: data.load_description ?? '', load_weight_ton: data.load_weight_ton?.toString() ?? '',
        crane_type: data.crane_type ?? '', rated_capacity_ton: data.rated_capacity_ton?.toString() ?? '',
        crane_manufacturer: data.crane_manufacturer ?? '',
        lifting_supervisor_name: data.lifting_supervisor_name ?? '', lifting_supervisor_contact: data.lifting_supervisor_contact ?? '',
        crane_operator_name: data.crane_operator_name ?? '', crane_operator_contact: data.crane_operator_contact ?? '',
        rigger_name: data.rigger_name ?? '', rigger_contact: data.rigger_contact ?? '',
        signalman_name: data.signalman_name ?? '', signalman_contact: data.signalman_contact ?? '',
        additional_information: data.additional_information ?? '', department: data.department ?? '',
        alternative_company_contact: data.alternative_company_contact ?? '', company_permit_issuer: data.company_permit_issuer ?? '',
        hours_of_work: data.hours_of_work ?? '', deviations_from_method_statement: data.deviations_from_method_statement ?? '',
        site_specific_hazards: data.site_specific_hazards ?? '', work_leader_name: data.work_leader_name ?? '',
        superintendent_name: data.superintendent_name ?? '', no_alternative_method_confirmed: !!data.no_alternative_method_confirmed,
        applicable_standards: data.applicable_standards ?? '', equipment_used: data.equipment_used ?? '',
        ppe_required: data.ppe_required ?? '', additional_permits_required: data.additional_permits_required ?? '',
        emergency_procedure: data.emergency_procedure ?? ''
      });
      setCriticalAnswers((data.critical_lift_answers as Record<string, boolean>) ?? {});
      setLoadingExisting(false);
    })();
  }, [editPermitId, reset]);

  async function onSubmit(values: FormValues) {
    if (!profile) return;
    setSubmitting(true);
    setError(null);
    try {
      const typeSpecific = {
        ...(values.permit_type === 'hot_work' ? { hot_work_type: values.hot_work_type, fire_watcher_name: values.fire_watcher_name || undefined } : {}),
        ...(values.permit_type === 'lifting' ? {
          load_description: values.load_description,
          load_weight_ton: values.load_weight_ton ? Number(values.load_weight_ton) : undefined,
          crane_type: values.crane_type,
          rated_capacity_ton: values.rated_capacity_ton ? Number(values.rated_capacity_ton) : undefined,
          crane_manufacturer: values.crane_manufacturer,
          lifting_supervisor_name: values.lifting_supervisor_name,
          lifting_supervisor_contact: values.lifting_supervisor_contact || undefined,
          crane_operator_name: values.crane_operator_name,
          crane_operator_contact: values.crane_operator_contact || undefined,
          rigger_name: values.rigger_name,
          rigger_contact: values.rigger_contact || undefined,
          signalman_name: values.signalman_name,
          signalman_contact: values.signalman_contact || undefined,
          critical_lift_answers: criticalAnswers
        } : {}),
        ...(values.permit_type === 'general_work' ? {
          additional_information: values.additional_information || undefined,
          department: values.department || undefined,
          alternative_company_contact: values.alternative_company_contact || undefined,
          company_permit_issuer: values.company_permit_issuer || undefined,
          hours_of_work: values.hours_of_work || undefined,
          deviations_from_method_statement: values.deviations_from_method_statement || undefined,
          site_specific_hazards: values.site_specific_hazards || undefined
        } : {}),
        ...(values.permit_type === 'work_at_height' ? {
          work_leader_name: values.work_leader_name || undefined,
          superintendent_name: values.superintendent_name || undefined,
          no_alternative_method_confirmed: !!values.no_alternative_method_confirmed
        } : {})
      };

      const templateFields = {
        applicable_standards: values.applicable_standards || undefined,
        equipment_used: values.equipment_used || undefined,
        ppe_required: values.ppe_required || undefined,
        additional_permits_required: values.additional_permits_required || undefined,
        emergency_procedure: values.emergency_procedure || undefined
      };

      if (isEditMode && editPermitId) {
        await updatePermit(editPermitId, {
          location: values.location, exact_area: values.exact_area || undefined, activity: values.activity,
          description: values.description || undefined, detail_of_surroundings: values.detail_of_surroundings || undefined,
          supervisor_name: values.supervisor_name,
          workers: values.workers ? values.workers.split(',').map(w => w.trim()).filter(Boolean) : undefined,
          start_time: new Date(values.start_time).toISOString(), expiry_time: new Date(values.expiry_time).toISOString(),
          ...templateFields,
          ...typeSpecific
        });
        navigate(`/permits/${editPermitId}`);
        return;
      }

      const input: CreatePermitInput = {
        permit_type: values.permit_type,
        project_id: values.project_id,
        contractor_id: values.contractor_id || profile.contractor_id || '',
        location: values.location,
        exact_area: values.exact_area || undefined,
        activity: values.activity,
        description: values.description || undefined,
        detail_of_surroundings: values.detail_of_surroundings || undefined,
        supervisor_name: values.supervisor_name,
        workers: values.workers ? values.workers.split(',').map(w => w.trim()).filter(Boolean) : undefined,
        start_time: new Date(values.start_time).toISOString(),
        expiry_time: new Date(values.expiry_time).toISOString(),
        created_by: profile.id,
        ...templateFields,
        ...typeSpecific
      };
      if (!input.contractor_id) throw new Error('Select a contractor.');

      const permit = await createPermit(input, profile.role === 'administrator');
      navigate(`/permits/${permit.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${isEditMode ? 'save' : 'create'} permit.`);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-brand focus:ring-1 focus:ring-brand';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  if (loadingExisting) return <div className="text-slate-400 text-sm">Loading permit…</div>;

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-lg font-bold text-navy">{isEditMode ? 'Edit Draft Permit' : 'Create Permit'}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-warning text-amber-800 text-xs font-semibold p-3">
          This permit is valid for one shift only and is not extendable without a formal Extension request.
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <div>
            <label className={labelClass}>Permit Type *</label>
            {isEditMode ? (
              <div className={`${inputClass} bg-slate-50 text-slate-500 capitalize`}>{permitType.replace('_', ' ')}</div>
            ) : (
              <select {...register('permit_type', { required: true })} className={inputClass}>
                <option value="hot_work">Hot Work</option>
                <option value="cold_work">Cold Work</option>
                <option value="lifting">General Lifting</option>
                <option value="general_work">General Work</option>
                <option value="work_at_height">Working at Height</option>
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Project *</label>
              {isEditMode && lockedInfo ? (
                <div className={`${inputClass} bg-slate-50 text-slate-500`}>{lockedInfo.project_name}</div>
              ) : (
                <select {...register('project_id', { required: true })} className={inputClass}>
                  <option value="">Select…</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.project_name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className={labelClass}>Contractor *</label>
              {isEditMode && lockedInfo ? (
                <div className={`${inputClass} bg-slate-50 text-slate-500`}>{lockedInfo.contractor_name}</div>
              ) : (
                <select {...register('contractor_id', { required: !profile?.contractor_id })} className={inputClass} defaultValue={profile?.contractor_id ?? ''}>
                  {!profile?.contractor_id && <option value="">Select…</option>}
                  {contractors.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              )}
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
          <div>
            <label className={labelClass}>Detail of Surroundings</label>
            <textarea {...register('detail_of_surroundings')} className={inputClass} rows={2} placeholder="Adjacent hazards, exposures, nearby activity…" />
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

        <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Standards, Equipment &amp; Emergency Procedure</h2>
          <p className="text-xs text-slate-400 -mt-2">Prefilled from the reference permit template for this work type — review and edit for the actual job.</p>
          <div>
            <label className={labelClass}>Applicable Standards</label>
            <textarea {...register('applicable_standards')} className={inputClass} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Equipment / Tools Used</label>
              <textarea {...register('equipment_used')} className={inputClass} rows={2} />
            </div>
            <div>
              <label className={labelClass}>PPE Required</label>
              <textarea {...register('ppe_required')} className={inputClass} rows={2} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Additional Permits Required</label>
            <input {...register('additional_permits_required')} className={inputClass} placeholder="e.g. COSHH Assessment for Welding Fume" />
          </div>
          <div>
            <label className={labelClass}>Emergency Procedure</label>
            <textarea {...register('emergency_procedure')} className={inputClass} rows={3} />
          </div>
        </div>

        {permitType === 'hot_work' && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Hot Work Type</h2>
            <select {...register('hot_work_type', { required: true })} className={inputClass}>
              {HOT_WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div>
              <label className={labelClass}>Fire Watcher</label>
              <input {...register('fire_watcher_name')} className={inputClass} placeholder="Name of assigned fire watcher" />
            </div>
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
                <div><label className={labelClass}>Contact</label><input {...register('lifting_supervisor_contact')} className={inputClass} /></div>
                <div><label className={labelClass}>Crane Operator</label><input {...register('crane_operator_name')} className={inputClass} /></div>
                <div><label className={labelClass}>Contact</label><input {...register('crane_operator_contact')} className={inputClass} /></div>
                <div><label className={labelClass}>Rigger</label><input {...register('rigger_name')} className={inputClass} /></div>
                <div><label className={labelClass}>Contact</label><input {...register('rigger_contact')} className={inputClass} /></div>
                <div><label className={labelClass}>Signalman</label><input {...register('signalman_name')} className={inputClass} /></div>
                <div><label className={labelClass}>Contact</label><input {...register('signalman_contact')} className={inputClass} /></div>
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

        {permitType === 'general_work' && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">General Work Details</h2>
            <div>
              <label className={labelClass}>Additional Information</label>
              <textarea {...register('additional_information')} className={inputClass} rows={2} placeholder="Barriers, spotters, or other precautions" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Department</label><input {...register('department')} className={inputClass} /></div>
              <div><label className={labelClass}>Hours of Work</label><input {...register('hours_of_work')} className={inputClass} /></div>
              <div><label className={labelClass}>Alternative Company Contact</label><input {...register('alternative_company_contact')} className={inputClass} /></div>
              <div><label className={labelClass}>Company Permit Issuer</label><input {...register('company_permit_issuer')} className={inputClass} /></div>
            </div>
            <div>
              <label className={labelClass}>Deviations from Method/Risk Assessment</label>
              <textarea {...register('deviations_from_method_statement')} className={inputClass} rows={2} placeholder="Leave blank if none" />
            </div>
            <div>
              <label className={labelClass}>Site-Specific Hazards Identified to Contractor</label>
              <textarea {...register('site_specific_hazards')} className={inputClass} rows={2} />
            </div>
          </div>
        )}

        {permitType === 'work_at_height' && (
          <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">Working at Height Details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelClass}>Work Leader / Supervisor</label><input {...register('work_leader_name')} className={inputClass} /></div>
              <div><label className={labelClass}>Superintendent</label><input {...register('superintendent_name')} className={inputClass} /></div>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-700 pt-1">
              <input type="checkbox" {...register('no_alternative_method_confirmed')} className="w-5 h-5 mt-0.5 accent-brand shrink-0" />
              The task has been reviewed and there is no alternative method to avoid working at height.
            </label>
          </div>
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
            {submitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Save as Draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
