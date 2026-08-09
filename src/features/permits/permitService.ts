import { supabase } from '@/lib/supabase';
import { PERMIT_PREFIX, type Permit, type PermitType } from '@/types';
import { CONTROLS_BY_TYPE } from './controlDefs';

export interface CreatePermitInput {
  permit_type: PermitType;
  project_id: string;
  contractor_id: string;
  location: string;
  exact_area?: string;
  activity: string;
  description?: string;
  supervisor_name: string;
  workers?: string[];
  start_time: string;
  expiry_time: string;
  hot_work_type?: string;
  gas_test?: Record<string, unknown>;
  load_description?: string;
  load_weight_ton?: number;
  crane_type?: string;
  rated_capacity_ton?: number;
  crane_manufacturer?: string;
  lifting_supervisor_name?: string;
  crane_operator_name?: string;
  rigger_name?: string;
  signalman_name?: string;
  critical_lift_answers?: Record<string, boolean>;
  created_by: string;
}

// Mandatory fields checked before a permit can be submitted or approved.
// This mirrors "Prevent approval with missing mandatory fields" (section 52)
// at the application layer; RLS is the real enforcement backstop.
export function findMissingMandatoryFields(p: Partial<Permit>): string[] {
  const missing: string[] = [];
  if (!p.location) missing.push('Location');
  if (!p.activity) missing.push('Activity');
  if (!p.supervisor_name) missing.push('Supervisor');
  if (!p.start_time) missing.push('Start time');
  if (!p.expiry_time) missing.push('Expiry time');
  return missing;
}

export async function generatePermitNumber(type: PermitType): Promise<string> {
  const { data, error } = await supabase.rpc('next_permit_number', { p_prefix: PERMIT_PREFIX[type] });
  if (error) throw new Error(`Could not generate permit number: ${error.message}`);
  return data as string;
}

export async function createPermit(input: CreatePermitInput) {
  const permit_number = await generatePermitNumber(input.permit_type);
  const isCritical = input.permit_type === 'lifting' && input.critical_lift_answers
    ? Object.values(input.critical_lift_answers).some(Boolean)
    : false;

  const { data: permit, error } = await supabase
    .from('permits')
    .insert({ ...input, permit_number, status: 'draft', is_critical_lift: isCritical })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Seed the control checklist rows for this permit type so the field
  // form has something to check against.
  const defs = CONTROLS_BY_TYPE[input.permit_type];
  const controlRows = defs.map(d => ({ permit_id: permit.id, control_key: d.key, control_label: d.label, is_checked: false }));
  const { error: controlsError } = await supabase.from('permit_controls').insert(controlRows);
  if (controlsError) throw new Error(`Permit created but controls failed to seed: ${controlsError.message}`);

  await logAudit('permits', permit.id, 'created', null, 'draft', null);
  return permit as Permit;
}

export async function updatePermitControl(permitId: string, controlKey: string, isChecked: boolean, remarks?: string) {
  const { error } = await supabase
    .from('permit_controls')
    .update({ is_checked: isChecked, remarks })
    .eq('permit_id', permitId)
    .eq('control_key', controlKey);
  if (error) throw new Error(error.message);
}

export async function submitPermit(permitId: string, userId: string) {
  const { data: permit, error: fetchErr } = await supabase.from('permits').select('*').eq('id', permitId).single();
  if (fetchErr) throw new Error(fetchErr.message);
  const missing = findMissingMandatoryFields(permit as Permit);
  if (missing.length) throw new Error(`Cannot submit — missing required fields: ${missing.join(', ')}`);

  const { error } = await supabase
    .from('permits')
    .update({ status: 'submitted', submitted_by: userId, submitted_at: new Date().toISOString() })
    .eq('id', permitId);
  if (error) throw new Error(error.message);

  await supabase.from('permit_approvals').insert({ permit_id: permitId, action: 'submitted', actor_id: userId });
  await logAudit('permits', permitId, 'submitted', permit.status, 'submitted', null);
}

export async function startReview(permitId: string, userId: string) {
  const { error } = await supabase.from('permits').update({ status: 'under_review' }).eq('id', permitId);
  if (error) throw new Error(error.message);
  await supabase.from('permit_approvals').insert({ permit_id: permitId, action: 'reviewed', actor_id: userId });
  await logAudit('permits', permitId, 'reviewed', 'submitted', 'under_review', null);
}

export async function approvePermit(permitId: string, userId: string, createdBy: string) {
  if (userId === createdBy) {
    throw new Error('Self-approval is not permitted: you created this permit.');
  }
  const { data: permit, error: fetchErr } = await supabase.from('permits').select('*').eq('id', permitId).single();
  if (fetchErr) throw new Error(fetchErr.message);
  const missing = findMissingMandatoryFields(permit as Permit);
  if (missing.length) throw new Error(`Cannot approve — missing required fields: ${missing.join(', ')}`);

  const { error } = await supabase
    .from('permits')
    .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
    .eq('id', permitId);
  if (error) throw new Error(error.message); // RLS also blocks self-approval server-side as a backstop

  await supabase.from('permit_approvals').insert({ permit_id: permitId, action: 'approved', actor_id: userId });
  await logAudit('permits', permitId, 'approved', permit.status, 'approved', null);
}

export async function rejectPermit(permitId: string, userId: string, remarks: string) {
  if (!remarks.trim()) throw new Error('A rejection reason is required.');
  const { data: permit, error: fetchErr } = await supabase.from('permits').select('status').eq('id', permitId).single();
  if (fetchErr) throw new Error(fetchErr.message);

  const { error } = await supabase.from('permits').update({ status: 'rejected' }).eq('id', permitId);
  if (error) throw new Error(error.message);

  await supabase.from('permit_approvals').insert({ permit_id: permitId, action: 'rejected', actor_id: userId, remarks });
  await logAudit('permits', permitId, 'rejected', permit.status, 'rejected', remarks);
}

async function logAudit(table: string, id: string, action: string, oldStatus: string | null, newStatus: string | null, remarks: string | null) {
  const { error } = await supabase.rpc('log_audit', {
    p_entity_table: table, p_entity_id: id, p_action: action,
    p_old_status: oldStatus, p_new_status: newStatus, p_remarks: remarks
  });
  if (error) console.error('Audit log failed (non-blocking):', error.message);
}

export async function fetchPermit(id: string) {
  const { data, error } = await supabase.from('permits').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Permit;
}

export async function fetchPermitControls(permitId: string) {
  const { data, error } = await supabase.from('permit_controls').select('*').eq('permit_id', permitId).order('control_key');
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPermitApprovals(permitId: string) {
  const { data, error } = await supabase
    .from('permit_approvals')
    .select('*, actor:users(full_name, role)')
    .eq('permit_id', permitId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPermits(filter: { status?: string[] } = {}) {
  let query = supabase.from('permits').select('*').order('created_at', { ascending: false });
  if (filter.status?.length) query = query.in('status', filter.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Permit[];
}
