import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/features/auth/AuthContext';
import { CAN_APPROVE, type Permit } from '@/types';
import {
  SUSPENSION_REASONS, startPermit, suspendPermit, fetchLatestSuspension, resumePermit,
  requestExtension, fetchExtensions, decideExtension, completePermit, closePermit, type ClosureChecklist
} from './fieldControlService';

interface Suspension { id: string; reason: string; remarks: string; suspended_at: string; }
interface Extension { id: string; reason: string; current_expiry: string; requested_new_expiry: string; status: string; requester: { full_name: string } | null; }

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-brand focus:ring-1 focus:ring-brand';

export default function FieldControlPanel({ permit, onUpdate }: { permit: Permit; onUpdate: () => void }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'suspend' | 'resume' | 'extend' | 'complete' | 'close'>('none');

  const [suspension, setSuspension] = useState<Suspension | null>(null);
  const [extensions, setExtensions] = useState<Extension[]>([]);

  const [suspendReason, setSuspendReason] = useState(SUSPENSION_REASONS[0]);
  const [suspendRemarks, setSuspendRemarks] = useState('');
  const [resumeRemarks, setResumeRemarks] = useState('');
  const [extReason, setExtReason] = useState('');
  const [extNewExpiry, setExtNewExpiry] = useState('');
  const [completedPerPlan, setCompletedPerPlan] = useState<boolean | null>(null);
  const [completeExplanation, setCompleteExplanation] = useState('');
  const [closureChecklist, setClosureChecklist] = useState<ClosureChecklist>({
    work_completed: false, equipment_removed: false, area_restored: false,
    residual_hazards_removed: false, barricades_removed: false
  });
  const [closeRemarks, setCloseRemarks] = useState('');

  useEffect(() => {
    if (permit.status === 'suspended') fetchLatestSuspension(permit.id).then(setSuspension).catch(() => {});
    fetchExtensions(permit.id).then(setExtensions as any).catch(() => {});
  }, [permit.id, permit.status]);

  if (!profile) return null;

  async function run(fn: () => Promise<void>, onSuccess?: () => void) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onSuccess?.();
      setPanel('none');
      onUpdate();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  const canOperate = CAN_APPROVE.includes(profile.role); // HSE-capable roles handle field control actions
  const pendingExtension = extensions.find(e => e.status === 'pending');

  return (
    <div className="space-y-2">
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      {/* APPROVED -> START */}
      {permit.status === 'approved' && (
        <button disabled={busy} onClick={() => run(() => startPermit(permit, profile.id))}
          className="w-full bg-success text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
          {busy ? 'Starting…' : permit.permit_type === 'lifting' ? 'START LIFT' : 'START WORK'}
        </button>
      )}

      {/* ACTIVE -> Suspend / Extend / Complete */}
      {(permit.status === 'active' || permit.status === 'expiring_soon') && (
        <>
          <button disabled={busy} onClick={() => setPanel(panel === 'suspend' ? 'none' : 'suspend')}
            className="w-full bg-slate-700 text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
            🛑 SUSPEND PERMIT
          </button>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => setPanel(panel === 'extend' ? 'none' : 'extend')}
              className="flex-1 bg-warning text-white font-semibold py-3 rounded-lg disabled:opacity-60">
              Request Extension
            </button>
            <button disabled={busy} onClick={() => setPanel(panel === 'complete' ? 'none' : 'complete')}
              className="flex-1 bg-brand text-white font-semibold py-3 rounded-lg disabled:opacity-60">
              Complete
            </button>
          </div>
        </>
      )}

      {panel === 'suspend' && (
        <div className="bg-white rounded-lg p-3 space-y-2 border border-slate-300">
          <select value={suspendReason} onChange={e => setSuspendReason(e.target.value)} className={inputClass}>
            {SUSPENSION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <textarea value={suspendRemarks} onChange={e => setSuspendRemarks(e.target.value)}
            placeholder="Remarks (required)" className={inputClass} rows={2} />
          <button disabled={busy || !suspendRemarks.trim()}
            onClick={() => run(() => suspendPermit(permit.id, profile.id, suspendReason, suspendRemarks, permit.status))}
            className="w-full bg-danger text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
            Confirm Suspension
          </button>
        </div>
      )}

      {/* SUSPENDED -> Resume */}
      {permit.status === 'suspended' && (
        <>
          {suspension && (
            <div className="bg-white rounded-lg p-3 border border-slate-200 text-sm space-y-1">
              <div><span className="text-slate-400 text-xs">Reason:</span> {suspension.reason}</div>
              <div><span className="text-slate-400 text-xs">Remarks:</span> {suspension.remarks}</div>
              <div className="text-xs text-slate-400">Suspended {format(new Date(suspension.suspended_at), 'dd MMM yyyy HH:mm')}</div>
            </div>
          )}
          {canOperate && (
            <>
              <button disabled={busy} onClick={() => setPanel(panel === 'resume' ? 'none' : 'resume')}
                className="w-full bg-success text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
                RESUME PERMIT
              </button>
              {panel === 'resume' && suspension && (
                <div className="bg-white rounded-lg p-3 space-y-2 border border-success">
                  <textarea value={resumeRemarks} onChange={e => setResumeRemarks(e.target.value)}
                    placeholder="Corrective action taken / verification remarks (required)" className={inputClass} rows={2} />
                  <button disabled={busy || !resumeRemarks.trim()}
                    onClick={() => run(() => resumePermit(suspension.id, permit.id, profile.id, resumeRemarks))}
                    className="w-full bg-success text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
                    Confirm Resume
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Extension request panel */}
      {panel === 'extend' && (
        <div className="bg-white rounded-lg p-3 space-y-2 border border-warning">
          <div className="text-xs text-slate-500">Current expiry: {permit.expiry_time ? format(new Date(permit.expiry_time), 'dd MMM yyyy HH:mm') : '—'}</div>
          <textarea value={extReason} onChange={e => setExtReason(e.target.value)} placeholder="Reason for extension (required)" className={inputClass} rows={2} />
          <input type="datetime-local" value={extNewExpiry} onChange={e => setExtNewExpiry(e.target.value)} className={inputClass} />
          <button disabled={busy || !extReason.trim() || !extNewExpiry}
            onClick={() => run(() => requestExtension(permit.id, profile.id, extReason, permit.expiry_time!, new Date(extNewExpiry).toISOString()),
              () => { setExtReason(''); setExtNewExpiry(''); })}
            className="w-full bg-warning text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
            Submit Extension Request
          </button>
        </div>
      )}

      {pendingExtension && (
        <div className="bg-amber-50 border border-warning rounded-lg p-3 text-sm space-y-2">
          <div className="font-semibold text-amber-800">Extension pending approval</div>
          <div className="text-amber-800">{pendingExtension.reason}</div>
          <div className="text-xs text-amber-700">
            Requested by {pendingExtension.requester?.full_name ?? 'unknown'} · new expiry {format(new Date(pendingExtension.requested_new_expiry), 'dd MMM HH:mm')}
          </div>
          {canOperate && pendingExtension.requester?.full_name !== profile.full_name && (
            <div className="flex gap-2">
              <button disabled={busy}
                onClick={() => run(() => decideExtension(pendingExtension.id, permit.id, profile.id, true, pendingExtension.requested_new_expiry))}
                className="flex-1 bg-success text-white font-semibold py-2 rounded-lg disabled:opacity-60">Approve</button>
              <button disabled={busy}
                onClick={() => run(() => decideExtension(pendingExtension.id, permit.id, profile.id, false))}
                className="flex-1 bg-danger text-white font-semibold py-2 rounded-lg disabled:opacity-60">Reject</button>
            </div>
          )}
        </div>
      )}

      {/* Complete panel */}
      {panel === 'complete' && (
        <div className="bg-white rounded-lg p-3 space-y-2 border border-brand">
          <div className="text-sm font-medium text-slate-700">Was the work completed according to the approved plan?</div>
          <div className="flex gap-2">
            <button onClick={() => setCompletedPerPlan(true)} className={`flex-1 py-2.5 rounded-lg font-semibold ${completedPerPlan === true ? 'bg-success text-white' : 'bg-slate-100 text-slate-600'}`}>YES</button>
            <button onClick={() => setCompletedPerPlan(false)} className={`flex-1 py-2.5 rounded-lg font-semibold ${completedPerPlan === false ? 'bg-danger text-white' : 'bg-slate-100 text-slate-600'}`}>NO</button>
          </div>
          {completedPerPlan === false && (
            <textarea value={completeExplanation} onChange={e => setCompleteExplanation(e.target.value)}
              placeholder="Explanation (required)" className={inputClass} rows={2} />
          )}
          <button disabled={busy || completedPerPlan === null}
            onClick={() => run(() => completePermit(permit.id, profile.id, !!completedPerPlan, completeExplanation, permit.status))}
            className="w-full bg-brand text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
            Confirm Completion
          </button>
        </div>
      )}

      {/* COMPLETED -> Close */}
      {permit.status === 'completed' && (
        <button disabled={busy} onClick={() => setPanel(panel === 'close' ? 'none' : 'close')}
          className="w-full bg-navy text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
          Close Permit
        </button>
      )}

      {panel === 'close' && (
        <div className="bg-white rounded-lg p-3 space-y-2 border border-navy">
          {([
            ['work_completed', 'Work completed'],
            ['equipment_removed', 'Equipment removed'],
            ['area_restored', 'Area restored'],
            ['residual_hazards_removed', 'Residual hazards removed'],
            ['barricades_removed', 'Barricades removed where appropriate']
          ] as [keyof ClosureChecklist, string][]).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between text-sm py-1">
              <span className="text-slate-700">{label}</span>
              <input type="checkbox" checked={closureChecklist[key]}
                onChange={e => setClosureChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                className="w-6 h-6 accent-navy" />
            </label>
          ))}
          <textarea value={closeRemarks} onChange={e => setCloseRemarks(e.target.value)} placeholder="Closure remarks" className={inputClass} rows={2} />
          <button disabled={busy}
            onClick={() => run(() => closePermit(permit.id, profile.id, closureChecklist, closeRemarks, permit.status))}
            className="w-full bg-navy text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
            Confirm Closure
          </button>
        </div>
      )}

      {permit.status === 'closed' && (
        <div className="text-center text-xs text-slate-400 py-2">This permit is closed and can no longer be modified.</div>
      )}
    </div>
  );
}
