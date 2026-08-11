import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { submitFieldVerification, type FieldVerificationInput } from './liftingService';

const GATE_ITEMS: { key: keyof Omit<FieldVerificationInput, 'permit_id' | 'verified_by'>; label: string }[] = [
  { key: 'lifting_ptw_ok', label: 'Lifting PTW approved' },
  { key: 'lifting_plan_ok', label: 'Lifting Plan approved' },
  { key: 'crane_checklist_ok', label: 'Crane checklist passed' },
  { key: 'site_preparation_ok', label: 'Site preparation passed' },
  { key: 'rigging_ok', label: 'Rigging passed' },
  { key: 'competency_ok', label: 'Competency verified' },
  { key: 'barricade_ok', label: 'Barricade completed' },
  { key: 'communication_ok', label: 'Communication established' },
  { key: 'weather_ok', label: 'Weather acceptable' },
  { key: 'emergency_arrangements_ok', label: 'Emergency arrangements available' }
];

export default function FieldVerificationPage() {
  const { permitId } = useParams<{ permitId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allOk = GATE_ITEMS.every(i => answers[i.key]);

  async function submit() {
    if (!profile || !permitId) return;
    setSubmitting(true);
    setError(null);
    try {
      const input: FieldVerificationInput = {
        permit_id: permitId,
        lifting_ptw_ok: !!answers.lifting_ptw_ok, lifting_plan_ok: !!answers.lifting_plan_ok,
        crane_checklist_ok: !!answers.crane_checklist_ok, site_preparation_ok: !!answers.site_preparation_ok,
        rigging_ok: !!answers.rigging_ok, competency_ok: !!answers.competency_ok,
        barricade_ok: !!answers.barricade_ok, communication_ok: !!answers.communication_ok,
        weather_ok: !!answers.weather_ok, emergency_arrangements_ok: !!answers.emergency_arrangements_ok,
        verified_by: profile.id
      };
      await submitFieldVerification(input);
      navigate(`/permits/${permitId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save verification.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <h1 className="text-lg font-bold text-navy">HSE Field Verification</h1>
      <p className="text-sm text-slate-500">Confirm each control has actually been verified in the field before this lift can be marked ready.</p>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm p-4">
        {GATE_ITEMS.map(item => (
          <label key={item.key} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 text-sm">
            <span className="text-slate-700 pr-3">{item.label}</span>
            <input type="checkbox" checked={!!answers[item.key]}
              onChange={e => setAnswers(prev => ({ ...prev, [item.key]: e.target.checked }))}
              className="w-6 h-6 accent-success shrink-0" />
          </label>
        ))}
      </div>

      <div className={`rounded-xl p-4 text-center font-bold ${allOk ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
        {allOk ? '🟢 READY TO LIFT' : '🔴 NOT READY TO LIFT'}
      </div>

      <div className="sticky bottom-16 md:bottom-0 bg-bgapp py-3 -mx-4 px-4 border-t border-slate-200">
        <button onClick={submit} disabled={submitting}
          className="w-full bg-brand text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
          {submitting ? 'Saving…' : 'Save Field Verification'}
        </button>
      </div>
    </div>
  );
}
