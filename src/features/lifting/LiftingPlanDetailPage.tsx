import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchLiftingPlan, fetchLiftingPlanSteps, approveLiftingPlan } from './liftingService';

interface Plan {
  id: string; plan_number: string; location: string; description: string | null; status: string;
  linked_permit_id: string | null; created_by: string;
  load_description: string | null; load_weight_ton: number | null; load_length_m: number | null;
  load_width_m: number | null; load_height_m: number | null; center_of_gravity: string | null; lifting_points: string | null;
  crane_type: string | null; crane_id: string | null; rated_capacity_ton: number | null; boom_length_m: number | null;
  counterweight_ton: number | null; outrigger_configuration: string | null; working_radius_m: number | null; lift_height_m: number | null;
  sling_type: string | null; sling_capacity_ton: number | null; shackle_type: string | null; shackle_capacity_ton: number | null;
  wll_swl_ton: number | null; sling_angle_deg: number | null;
  lifting_supervisor_name: string | null; operator_name: string | null; rigger_name: string | null; signalman_name: string | null;
  ground_condition: string | null; ground_bearing_assessment: string | null; underground_services: string | null;
}
interface Step { id: string; step_order: number; step_description: string; }

export default function LiftingPlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, s] = await Promise.all([fetchLiftingPlan(id), fetchLiftingPlanSteps(id)]);
      setPlan(p as Plan);
      setSteps(s as Step[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plan.');
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function approve() {
    if (!plan || !profile) return;
    setBusy(true);
    try {
      await approveLiftingPlan(plan.id, profile.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to approve.');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>;
  if (!plan) return <div className="text-slate-400 text-sm">Loading…</div>;

  const row = (label: string, value: string | number | null | undefined, unit = '') => (
    value !== null && value !== undefined && value !== '' ? (
      <div><dt className="text-slate-400 text-xs">{label}</dt><dd className="text-slate-800 text-sm">{value}{unit}</dd></div>
    ) : null
  );

  const isSelfApproval = profile?.id === plan.created_by;

  return (
    <div className="space-y-4 pb-24">
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-navy text-base">{plan.plan_number}</div>
            <div className="text-xs text-slate-500">{plan.location}</div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${plan.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {plan.status}
          </span>
        </div>
        {plan.description && <p className="text-sm text-slate-600">{plan.description}</p>}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Load</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {row('Description', plan.load_description)}
          {row('Weight', plan.load_weight_ton, ' t')}
          {row('Length', plan.load_length_m, ' m')}
          {row('Width', plan.load_width_m, ' m')}
          {row('Height', plan.load_height_m, ' m')}
          {row('Center of Gravity', plan.center_of_gravity)}
          {row('Lifting Points', plan.lifting_points)}
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Crane</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {row('Type', plan.crane_type)}
          {row('Crane ID', plan.crane_id)}
          {row('Rated Capacity', plan.rated_capacity_ton, ' t')}
          {row('Boom Length', plan.boom_length_m, ' m')}
          {row('Counterweight', plan.counterweight_ton, ' t')}
          {row('Outrigger Config', plan.outrigger_configuration)}
          {row('Working Radius', plan.working_radius_m, ' m')}
          {row('Lift Height', plan.lift_height_m, ' m')}
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Rigging</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {row('Sling Type', plan.sling_type)}
          {row('Sling Capacity', plan.sling_capacity_ton, ' t')}
          {row('Shackle Type', plan.shackle_type)}
          {row('Shackle Capacity', plan.shackle_capacity_ton, ' t')}
          {row('WLL/SWL', plan.wll_swl_ton, ' t')}
          {row('Sling Angle', plan.sling_angle_deg, '°')}
        </dl>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Personnel</h2>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
          {row('Lifting Supervisor', plan.lifting_supervisor_name)}
          {row('Operator', plan.operator_name)}
          {row('Rigger', plan.rigger_name)}
          {row('Signalman', plan.signalman_name)}
        </dl>
      </div>

      {(plan.ground_condition || plan.ground_bearing_assessment || plan.underground_services) && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">Ground</h2>
          <dl className="grid grid-cols-1 gap-y-2">
            {row('Ground Condition', plan.ground_condition)}
            {row('Ground Bearing Assessment', plan.ground_bearing_assessment)}
            {row('Underground Services', plan.underground_services)}
          </dl>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Lift Sequence</h2>
        <ol className="space-y-1.5">
          {steps.map(s => (
            <li key={s.id} className="text-sm text-slate-700 flex gap-2">
              <span className="text-slate-400 w-5 shrink-0">{s.step_order}.</span>{s.step_description}
            </li>
          ))}
        </ol>
      </div>

      {isSelfApproval && plan.status !== 'approved' && (
        <div className="rounded-lg bg-amber-50 border border-warning text-amber-800 text-sm p-3">
          You created this plan, so you cannot approve it — another authorized user must review it.
        </div>
      )}

      {!isSelfApproval && plan.status !== 'approved' && (
        <div className="sticky bottom-16 md:bottom-0 bg-bgapp py-3 -mx-4 px-4 border-t border-slate-200">
          <button onClick={approve} disabled={busy} className="w-full bg-success text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
            {busy ? 'Approving…' : 'Approve Lifting Plan'}
          </button>
        </div>
      )}

      {plan.linked_permit_id && (
        <Link to={`/permits/${plan.linked_permit_id}`} className="block text-center text-sm text-brand">← Back to permit</Link>
      )}
    </div>
  );
}
