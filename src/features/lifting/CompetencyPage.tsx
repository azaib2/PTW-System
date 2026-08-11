import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/features/auth/AuthContext';
import { addCompetencyDocument, fetchCompetencyDocuments, type CompetencyInput } from './liftingService';

interface DocRow {
  id: string; person_role: string; person_name: string; certificate_number: string;
  issue_date: string | null; expiry_date: string; status: 'valid' | 'expiring' | 'expired';
}

interface FormValues {
  person_role: CompetencyInput['person_role']; person_name: string; certificate_number: string;
  issue_date: string; expiry_date: string;
}

const STATUS_ICON: Record<string, string> = { valid: '🟢', expiring: '🟡', expired: '🔴' };
const ROLE_LABEL: Record<string, string> = {
  crane_operator: 'Crane Operator', lifting_supervisor: 'Lifting Supervisor', rigger: 'Rigger', signalman: 'Signalman'
};

export default function CompetencyPage() {
  const { permitId } = useParams<{ permitId: string }>();
  const { profile } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormValues>();

  async function load() {
    if (!permitId) return;
    try { setDocs(await fetchCompetencyDocuments(permitId) as DocRow[]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
  }
  useEffect(() => { load(); }, [permitId]);

  async function onSubmit(v: FormValues) {
    if (!profile || !permitId) return;
    setSubmitting(true);
    setError(null);
    try {
      await addCompetencyDocument({
        permit_id: permitId, person_role: v.person_role, person_name: v.person_name,
        certificate_number: v.certificate_number, issue_date: v.issue_date || undefined,
        expiry_date: v.expiry_date, created_by: profile.id
      });
      reset();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add document.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-brand focus:ring-1 focus:ring-brand';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';
  const hasExpired = docs.some(d => d.status === 'expired');

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Competency Verification</h1>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
      {hasExpired && (
        <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm font-semibold p-3">
          🔴 One or more certificates are expired. Expired certificates cannot be accepted for field verification.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Recorded Personnel</h2>
        {docs.length === 0 && <div className="text-xs text-slate-400">No competency documents added yet.</div>}
        {docs.map(d => (
          <div key={d.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
            <div>
              <div className="font-medium text-slate-800">{d.person_name} <span className="text-xs text-slate-400">({ROLE_LABEL[d.person_role]})</span></div>
              <div className="text-xs text-slate-500">Cert #{d.certificate_number} · expires {d.expiry_date}</div>
            </div>
            <span>{STATUS_ICON[d.status]}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Add Certificate</h2>
        <div>
          <label className={labelClass}>Role *</label>
          <select {...register('person_role', { required: true })} className={inputClass}>
            <option value="crane_operator">Crane Operator</option>
            <option value="lifting_supervisor">Lifting Supervisor</option>
            <option value="rigger">Rigger</option>
            <option value="signalman">Signalman</option>
          </select>
        </div>
        <div><label className={labelClass}>Name *</label><input {...register('person_name', { required: true })} className={inputClass} /></div>
        <div><label className={labelClass}>Certificate Number *</label><input {...register('certificate_number', { required: true })} className={inputClass} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Issue Date</label><input type="date" {...register('issue_date')} className={inputClass} /></div>
          <div><label className={labelClass}>Expiry Date *</label><input type="date" {...register('expiry_date', { required: true })} className={inputClass} /></div>
        </div>
        <button type="submit" disabled={submitting} className="w-full bg-brand text-white font-semibold py-3 rounded-lg disabled:opacity-60">
          {submitting ? 'Saving…' : 'Add Certificate'}
        </button>
      </form>
    </div>
  );
}
