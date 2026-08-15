import { supabase } from '@/lib/supabase';
import { fetchLatestFieldVerification } from '@/features/lifting/liftingService';
import type { Permit } from '@/types';

export const SUSPENSION_REASONS = [
  'Weather', 'Unsafe condition', 'Equipment failure', 'Change in scope', 'SIMOPS',
  'Personnel issue', 'Communication failure', 'Ground condition', 'Emergency', 'Other'
];

async function logAudit(table: string, id: string, action: string, oldStatus: string | null, newStatus: string | null, remarks: string | null) {
  const { error } = await supabase.rpc('log_audit', {
    p_entity_table: table, p_entity_id: id, p_action: action,
    p_old_status: oldStatus, p_new_status: newStatus, p_remarks: remarks
  });
  if (error) console.error('Audit log failed (non-blocking):', error.message);
}

// ---------------------------------------------------------------------
// Start (section 25 / 31 Ready-to-Lift gate / 52 error prevention)
// ---------------------------------------------------------------------
export async function startPermit(permit: Permit, userId: string) {
  if (permit.status !== 'approved') {
    throw new Error('Only an approved permit can be started.');
  }
  if (permit.permit_type === 'lifting') {
    if (!permit.lifting_plan_id) throw new Error('Cannot start lifting — no lifting plan is linked to this permit.');
    const fv = await fetchLatestFieldVerification(permit.id);
    if (!fv || !fv.ready_to_lift) {
      throw new Error('Cannot start lifting — HSE Field Verification has not confirmed Ready to Lift.');
    }
  }
  const { error } = await supabase.from('permits').update({ status: 'active' }).eq('id', permit.id);
  if (error) throw new Error(error.message);
  await logAudit('permits', permit.id, permit.permit_type === 'lifting' ? 'started_lift' : 'started', permit.status, 'active', null);
}

// ---------------------------------------------------------------------
// Suspend / Resume (sections 26-27)
// ---------------------------------------------------------------------
export async function suspendPermit(permitId: string, userId: string, reason: string, remarks: string, currentStatus: string) {
  if (!remarks.trim()) throw new Error('Remarks are required to suspend a permit.');
  const { error: insErr } = await supabase.from('permit_suspensions').insert({
    permit_id: permitId, suspended_by: userId, reason, remarks
  });
  if (insErr) throw new Error(insErr.message);

  const { error } = await supabase.from('permits').update({ status: 'suspended' }).eq('id', permitId);
  if (error) throw new Error(error.message);
  await logAudit('permits', permitId, 'suspended', currentStatus, 'suspended', `${reason}: ${remarks}`);
}

export async function fetchLatestSuspension(permitId: string) {
  const { data, error } = await supabase.from('permit_suspensions').select('*')
    .eq('permit_id', permitId).is('resumed_at', null)
    .order('suspended_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function resumePermit(suspensionId: string, permitId: string, userId: string, resumeRemarks: string) {
  if (!resumeRemarks.trim()) throw new Error('Verification remarks are required to resume a permit.');
  const { error: susErr } = await supabase.from('permit_suspensions').update({
    resumed_by: userId, resume_remarks: resumeRemarks, resumed_at: new Date().toISOString()
  }).eq('id', suspensionId);
  if (susErr) throw new Error(susErr.message);

  const { error } = await supabase.from('permits').update({ status: 'active' }).eq('id', permitId);
  if (error) throw new Error(error.message);
  await logAudit('permits', permitId, 'resumed', 'suspended', 'active', resumeRemarks);
}

// ---------------------------------------------------------------------
// Extension (section 28) — never auto-extends; requires separate approval
// ---------------------------------------------------------------------
export async function requestExtension(permitId: string, userId: string, reason: string, currentExpiry: string, requestedNewExpiry: string) {
  if (!reason.trim()) throw new Error('A reason is required to request an extension.');
  const { error } = await supabase.from('permit_extensions').insert({
    permit_id: permitId, requested_by: userId, reason,
    current_expiry: currentExpiry, requested_new_expiry: requestedNewExpiry
  });
  if (error) throw new Error(error.message);
  await logAudit('permits', permitId, 'extension_requested', null, null, reason);
}

export async function fetchExtensions(permitId: string) {
  const { data, error } = await supabase.from('permit_extensions').select('*, requester:users!requested_by(full_name)')
    .eq('permit_id', permitId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function decideExtension(extensionId: string, permitId: string, userId: string, approve: boolean, newExpiry?: string) {
  const { error } = await supabase.from('permit_extensions').update({
    status: approve ? 'approved' : 'rejected', approved_by: userId, approved_at: new Date().toISOString()
  }).eq('id', extensionId);
  if (error) throw new Error(error.message);

  if (approve && newExpiry) {
    const { error: permitErr } = await supabase.from('permits').update({ expiry_time: newExpiry }).eq('id', permitId);
    if (permitErr) throw new Error(permitErr.message);
  }
  await logAudit('permits', permitId, approve ? 'extension_approved' : 'extension_rejected', null, null, null);
}

// ---------------------------------------------------------------------
// Complete (section 29)
// ---------------------------------------------------------------------
export async function completePermit(permitId: string, userId: string, completedPerPlan: boolean, explanation: string | null, currentStatus: string) {
  if (!completedPerPlan && !explanation?.trim()) {
    throw new Error('An explanation is required when the work was not completed according to the approved plan.');
  }
  const { error } = await supabase.from('permits').update({ status: 'completed' }).eq('id', permitId);
  if (error) throw new Error(error.message);
  await logAudit('permits', permitId, 'completed', currentStatus, 'completed',
    completedPerPlan ? 'Completed per approved plan.' : `Deviation: ${explanation}`);
}

// ---------------------------------------------------------------------
// Closure (section 30)
// ---------------------------------------------------------------------
export interface ClosureChecklist {
  work_completed: boolean; equipment_removed: boolean; area_restored: boolean;
  residual_hazards_removed: boolean; barricades_removed: boolean;
}

export async function closePermit(permitId: string, userId: string, checklist: ClosureChecklist, remarks: string, currentStatus: string) {
  const allDone = Object.values(checklist).every(Boolean);
  if (!allDone) throw new Error('All closure checks must be confirmed before the permit can be closed.');

  const { error } = await supabase.from('permits').update({
    status: 'closed', closed_by: userId, closed_at: new Date().toISOString()
  }).eq('id', permitId);
  if (error) throw new Error(error.message);
  await logAudit('permits', permitId, 'closed', currentStatus, 'closed', remarks || null);
}
