import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchLatestFieldVerification } from '@/features/lifting/liftingService';
import { format } from 'date-fns';
import { useAuth } from '@/features/auth/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import {
  fetchPermit, fetchPermitControls, fetchPermitApprovals,
  updatePermitControl, submitPermit, approvePermit, rejectPermit, startReview
} from './permitService';
import { CAN_APPROVE, type Permit } from '@/types';

interface ControlRow { id: string; control_key: string; control_label: string; is_checked: boolean; remarks: string | null; }
interface ApprovalRow { id: string; action: string; remarks: string | null; created_at: string; actor: { full_name: string; role: string } | null; }

export default function PermitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [permit, setPermit] = useState<Permit | null>(null);
  const [controls, setControls] = useState<ControlRow[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [fieldVerification, setFieldVerification] = useState<{ ready_to_lift: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, c, a] = await Promise.all([fetchPermit(id), fetchPermitControls(id), fetchPermitApprovals(id)]);
      setPermit(p);
      setControls(c as ControlRow[]);
      setApprovals(a as unknown as ApprovalRow[]);
      if (p.permit_type === 'lifting') {
        fetchLatestFieldVerification(id).then(setFieldVerification).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load permit.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function toggleControl(row: ControlRow) {
    setControls(prev => prev.map(c => c.id === row.id ? { ...c, is_checked: !row.is_checked } : c));
    try {
      await updatePermitControl(permit!.id, row.control_key, !row.is_checked);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save control.');
      load();
    }
  }

  async function runAction(fn: () => Promise<void>) {
    setActionBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) return <div className="text-slate-400 text-sm">Loading…</div>;
  if (error && !permit) return <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>;
  if (!permit || !profile) return null;

  const canApprove = CAN_APPROVE.includes(profile.role) && profile.id !== permit.created_by;
  const isSelfApprovalBlocked = CAN_APPROVE.includes(profile.role) && profile.id === permit.created_by;
  const canSubmit = permit.status === 'draft' && (profile.id === permit.created_by || profile.contractor_id === permit.contractor_id);
  const checkedCount = controls.filter(c => c.is_checked).length;

  return (
    <div className="space-y-4 pb-24">
      {/* Snapshot */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-bold text-navy text-base">{permit.permit_number}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wide">{permit.permit_type.replace('_', ' ')}</div>
          </div>
          <StatusBadge status={permit.status} />
        </div>
        {permit.is_critical_lift && (
          <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-xs font-semibold p-2">🔴 CRITICAL LIFT</div>
        )}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm pt-1">
          <div><dt className="text-slate-400 text-xs">Activity</dt><dd className="text-slate-800">{permit.activity}</dd></div>
          <div><dt className="text-slate-400 text-xs">Location</dt><dd className="text-slate-800">{permit.location}</dd></div>
          <div><dt className="text-slate-400 text-xs">Supervisor</dt><dd className="text-slate-800">{permit.supervisor_name || '—'}</dd></div>
          <div><dt className="text-slate-400 text-xs">Start</dt><dd className="text-slate-800">{permit.start_time ? format(new Date(permit.start_time), 'dd MMM HH:mm') : '—'}</dd></div>
          <div><dt className="text-slate-400 text-xs">Expiry</dt><dd className="text-slate-800">{permit.expiry_time ? format(new Date(permit.expiry_time), 'dd MMM HH:mm') : '—'}</dd></div>
          {permit.permit_type === 'lifting' && (
            <div><dt className="text-slate-400 text-xs">Load</dt><dd className="text-slate-800">{permit.load_weight_ton ? `${permit.load_weight_ton} t` : '—'}</dd></div>
          )}
        </dl>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      {isSelfApprovalBlocked && (
        <div className="rounded-lg bg-amber-50 border border-warning text-amber-800 text-sm p-3">
          You created this permit, so you cannot approve or reject it — another authorized user must review it.
        </div>
      )}

      {/* Controls checklist */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-1">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-700">Field Controls</h2>
          <span className="text-xs text-slate-400">{checkedCount}/{controls.length} checked</span>
        </div>
        {controls.map(c => (
          <label key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 text-sm">
            <span className="text-slate-700 pr-3">{c.control_label}</span>
            <input type="checkbox" checked={c.is_checked} onChange={() => toggleControl(c)}
              disabled={permit.status === 'closed'} className="w-6 h-6 accent-success shrink-0" />
          </label>
        ))}
      </div>

      {/* Lifting Package (Stage 3) */}
      {permit.permit_type === 'lifting' && (
        <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Lifting Package</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link to={permit.lifting_plan_id ? `/lifting/plans/${permit.lifting_plan_id}` : `/lifting/plans/new?permitId=${permit.id}`}
              className="text-center text-sm bg-slate-50 hover:bg-slate-100 rounded-lg py-3 font-medium text-slate-700">
              {permit.lifting_plan_id ? 'View Lifting Plan' : '+ Create Lifting Plan'}
            </Link>
            <Link to={`/lifting/crane-checklist?permitId=${permit.id}`} className="text-center text-sm bg-slate-50 hover:bg-slate-100 rounded-lg py-3 font-medium text-slate-700">Crane Checklist</Link>
            <Link to={`/lifting/site-preparation?permitId=${permit.id}`} className="text-center text-sm bg-slate-50 hover:bg-slate-100 rounded-lg py-3 font-medium text-slate-700">Site Preparation</Link>
            <Link to={`/lifting/rigging?permitId=${permit.id}`} className="text-center text-sm bg-slate-50 hover:bg-slate-100 rounded-lg py-3 font-medium text-slate-700">Rigging Verification</Link>
            <Link to={`/lifting/competency/${permit.id}`} className="text-center text-sm bg-slate-50 hover:bg-slate-100 rounded-lg py-3 font-medium text-slate-700">Competency</Link>
            <Link to={`/lifting/field-verification/${permit.id}`} className="text-center text-sm bg-slate-50 hover:bg-slate-100 rounded-lg py-3 font-medium text-slate-700">Field Verification</Link>
          </div>
          {fieldVerification && (
            <div className={`rounded-lg p-2.5 text-center font-bold text-sm mt-2 ${fieldVerification.ready_to_lift ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
              {fieldVerification.ready_to_lift ? '🟢 READY TO LIFT' : '🔴 NOT READY TO LIFT'}
            </div>
          )}
        </div>
      )}

      {/* Approval history / audit */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Approval History</h2>
        {approvals.length === 0 && <div className="text-xs text-slate-400">No actions recorded yet.</div>}
        <ul className="space-y-2">
          {approvals.map(a => (
            <li key={a.id} className="text-sm border-l-2 border-slate-200 pl-3">
              <div className="font-medium text-slate-700 capitalize">{a.action}</div>
              <div className="text-xs text-slate-500">
                {a.actor?.full_name ?? 'Unknown user'} · {format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}
              </div>
              {a.remarks && <div className="text-xs text-slate-600 mt-0.5">"{a.remarks}"</div>}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="sticky bottom-16 md:bottom-0 bg-bgapp py-3 -mx-4 px-4 border-t border-slate-200 space-y-2">
        {canSubmit && (
          <button disabled={actionBusy} onClick={() => runAction(() => submitPermit(permit.id, profile.id))}
            className="w-full bg-brand text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
            Submit for Review
          </button>
        )}

        {permit.status === 'submitted' && canApprove && (
          <button disabled={actionBusy} onClick={() => runAction(() => startReview(permit.id, profile.id))}
            className="w-full bg-slate-700 text-white font-semibold py-3 rounded-lg disabled:opacity-60">
            Start Review
          </button>
        )}

        {(permit.status === 'submitted' || permit.status === 'under_review') && canApprove && (
          <div className="flex gap-2">
            <button disabled={actionBusy} onClick={() => runAction(() => approvePermit(permit.id, profile.id, permit.created_by))}
              className="flex-1 bg-success text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
              Approve
            </button>
            <button disabled={actionBusy} onClick={() => setShowRejectBox(v => !v)}
              className="flex-1 bg-danger text-white font-semibold py-3.5 rounded-lg disabled:opacity-60">
              Reject
            </button>
          </div>
        )}

        {showRejectBox && (
          <div className="bg-white rounded-lg p-3 space-y-2 border border-danger">
            <textarea value={rejectRemarks} onChange={e => setRejectRemarks(e.target.value)}
              placeholder="Reason for rejection (required)" className="w-full border border-slate-300 rounded-lg p-2 text-sm" rows={2} />
            <button disabled={actionBusy || !rejectRemarks.trim()}
              onClick={() => runAction(() => rejectPermit(permit.id, profile.id, rejectRemarks)).then(() => { setShowRejectBox(false); setRejectRemarks(''); })}
              className="w-full bg-danger text-white font-semibold py-2.5 rounded-lg disabled:opacity-60">
              Confirm Rejection
            </button>
          </div>
        )}

        {permit.status === 'approved' && (
          <div className="text-center text-xs text-slate-400 py-2">
            Start/Suspend/Complete/Close actions arrive in Stage 4 (Field Control).
          </div>
        )}
      </div>

      <Link to="/permits/active" className="block text-center text-sm text-brand mt-2">← Back to permits</Link>
    </div>
  );
}
