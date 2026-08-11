import { supabase } from '@/lib/supabase';
import { CRANE_CHECKLIST_ITEMS, SITE_PREPARATION_ITEMS, RIGGING_ITEMS, DEFAULT_LIFT_SEQUENCE } from './checklistDefs';

// ---------------------------------------------------------------------
// Lifting Plan
// ---------------------------------------------------------------------
export interface LiftingPlanInput {
  linked_permit_id?: string | null;
  project_id: string;
  contractor_id: string;
  location: string;
  description?: string;
  load_description?: string; load_weight_ton?: number; load_length_m?: number;
  load_width_m?: number; load_height_m?: number; center_of_gravity?: string; lifting_points?: string;
  crane_type?: string; crane_id?: string; rated_capacity_ton?: number; boom_length_m?: number;
  counterweight_ton?: number; outrigger_configuration?: string; working_radius_m?: number;
  lift_height_m?: number; crane_configuration?: string;
  sling_type?: string; sling_capacity_ton?: number; sling_length_m?: number;
  shackle_type?: string; shackle_capacity_ton?: number; hook_type?: string;
  wll_swl_ton?: number; sling_angle_deg?: number;
  lifting_supervisor_name?: string; operator_name?: string; rigger_name?: string; signalman_name?: string;
  ground_condition?: string; ground_bearing_assessment?: string; underground_services?: string;
  created_by: string;
}

async function nextPlanNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('next_permit_number', { p_prefix: 'LP' });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function createLiftingPlan(input: LiftingPlanInput, steps: string[] = DEFAULT_LIFT_SEQUENCE) {
  const plan_number = await nextPlanNumber();
  const { data: plan, error } = await supabase.from('lifting_plans').insert({ ...input, plan_number }).select().single();
  if (error) throw new Error(error.message);

  const stepRows = steps.map((s, i) => ({ lifting_plan_id: plan.id, step_order: i + 1, step_description: s }));
  const { error: stepsErr } = await supabase.from('lifting_plan_steps').insert(stepRows);
  if (stepsErr) throw new Error(`Plan created but steps failed to save: ${stepsErr.message}`);

  if (input.linked_permit_id) {
    const { error: linkErr } = await supabase.from('permits').update({ lifting_plan_id: plan.id }).eq('id', input.linked_permit_id);
    if (linkErr) throw new Error(`Plan created but linking to permit failed: ${linkErr.message}`);
  }
  return plan;
}

export async function approveLiftingPlan(planId: string, userId: string) {
  const { error } = await supabase.from('lifting_plans')
    .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
    .eq('id', planId);
  if (error) throw new Error(error.message);
}

export async function fetchLiftingPlan(id: string) {
  const { data, error } = await supabase.from('lifting_plans').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchLiftingPlanSteps(planId: string) {
  const { data, error } = await supabase.from('lifting_plan_steps').select('*').eq('lifting_plan_id', planId).order('step_order');
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------
// Crane Checklist
// ---------------------------------------------------------------------
export interface CraneChecklistInput {
  permit_id?: string | null;
  crane_id: string; crane_type?: string; capacity_ton?: number;
  operator_name: string; shift?: string; location?: string;
  performed_by: string;
}

export async function createCraneChecklist(input: CraneChecklistInput) {
  const { data: checklist, error } = await supabase.from('crane_checklists').insert(input).select().single();
  if (error) throw new Error(error.message);

  const itemRows = CRANE_CHECKLIST_ITEMS.map(i => ({
    crane_checklist_id: checklist.id, category: i.category, item_key: i.key, item_label: i.label, is_critical: !!i.critical
  }));
  const { error: itemsErr } = await supabase.from('crane_checklist_items').insert(itemRows);
  if (itemsErr) throw new Error(`Checklist created but items failed to seed: ${itemsErr.message}`);
  return checklist;
}

export async function fetchCraneChecklistItems(checklistId: string) {
  const { data, error } = await supabase.from('crane_checklist_items').select('*').eq('crane_checklist_id', checklistId).order('category');
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleCraneChecklistItem(itemId: string, isChecked: boolean, remarks?: string) {
  const { error } = await supabase.from('crane_checklist_items').update({ is_checked: isChecked, remarks }).eq('id', itemId);
  if (error) throw new Error(error.message);
}

// A critical item left unchecked (i.e. failed) blocks clearance — never allow
// PASS to be recorded while a critical item is outstanding (section 20/52).
export function computeCraneResult(items: { is_critical: boolean; is_checked: boolean }[]): 'pass' | 'pass_with_action' | 'fail' {
  const criticalFailed = items.some(i => i.is_critical && !i.is_checked);
  if (criticalFailed) return 'fail';
  const anyFailed = items.some(i => !i.is_checked);
  return anyFailed ? 'pass_with_action' : 'pass';
}

export async function finalizeCraneChecklist(checklistId: string, result: 'pass' | 'pass_with_action' | 'fail', correctiveAction?: string) {
  const { error } = await supabase.from('crane_checklists').update({ result, corrective_action_required: correctiveAction }).eq('id', checklistId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Site Preparation
// ---------------------------------------------------------------------
export async function createSitePreparationChecklist(permitId: string | null, performedBy: string) {
  const { data: checklist, error } = await supabase.from('site_preparation_checklists')
    .insert({ permit_id: permitId, performed_by: performedBy }).select().single();
  if (error) throw new Error(error.message);

  const itemRows = SITE_PREPARATION_ITEMS.map(i => ({
    checklist_id: checklist.id, category: i.category, item_key: i.key, item_label: i.label
  }));
  const { error: itemsErr } = await supabase.from('site_preparation_items').insert(itemRows);
  if (itemsErr) throw new Error(`Checklist created but items failed to seed: ${itemsErr.message}`);
  return checklist;
}

export async function fetchSitePreparationItems(checklistId: string) {
  const { data, error } = await supabase.from('site_preparation_items').select('*').eq('checklist_id', checklistId).order('category');
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleSitePreparationItem(itemId: string, isChecked: boolean) {
  const { error } = await supabase.from('site_preparation_items').update({ is_checked: isChecked }).eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function finalizeSitePreparation(checklistId: string, result: 'pass' | 'pass_with_action' | 'fail') {
  const { error } = await supabase.from('site_preparation_checklists').update({ result }).eq('id', checklistId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Rigging Verification
// ---------------------------------------------------------------------
export async function createRiggingVerification(permitId: string | null, performedBy: string) {
  const { data: verification, error } = await supabase.from('rigging_verifications')
    .insert({ permit_id: permitId, performed_by: performedBy }).select().single();
  if (error) throw new Error(error.message);

  const itemRows = RIGGING_ITEMS.map(i => ({
    rigging_verification_id: verification.id, item_key: i.key, item_label: i.label
  }));
  const { error: itemsErr } = await supabase.from('rigging_verification_items').insert(itemRows);
  if (itemsErr) throw new Error(`Verification created but items failed to seed: ${itemsErr.message}`);
  return verification;
}

export async function fetchRiggingItems(verificationId: string) {
  const { data, error } = await supabase.from('rigging_verification_items').select('*').eq('rigging_verification_id', verificationId);
  if (error) throw new Error(error.message);
  return data;
}

export async function toggleRiggingItem(itemId: string, isChecked: boolean) {
  const { error } = await supabase.from('rigging_verification_items').update({ is_checked: isChecked }).eq('id', itemId);
  if (error) throw new Error(error.message);
}

export async function finalizeRigging(verificationId: string, result: 'pass' | 'fail') {
  const { error } = await supabase.from('rigging_verifications').update({ result }).eq('id', verificationId);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Competency Documents
// ---------------------------------------------------------------------
export interface CompetencyInput {
  permit_id?: string | null;
  person_role: 'crane_operator' | 'lifting_supervisor' | 'rigger' | 'signalman';
  person_name: string;
  certificate_number: string;
  issue_date?: string;
  expiry_date: string;
  created_by: string;
}

export async function addCompetencyDocument(input: CompetencyInput) {
  const status = new Date(input.expiry_date) < new Date() ? 'expired'
    : new Date(input.expiry_date) < new Date(Date.now() + 30 * 86400000) ? 'expiring' : 'valid';
  const { data, error } = await supabase.from('competency_documents').insert({ ...input, status }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchCompetencyDocuments(permitId: string) {
  const { data, error } = await supabase.from('competency_documents').select('*').eq('permit_id', permitId).order('created_at');
  if (error) throw new Error(error.message);
  return data;
}

// ---------------------------------------------------------------------
// Field Verification / Ready-to-Lift gate (section 24/31)
// ---------------------------------------------------------------------
export interface FieldVerificationInput {
  permit_id: string;
  lifting_ptw_ok: boolean; lifting_plan_ok: boolean; crane_checklist_ok: boolean;
  site_preparation_ok: boolean; rigging_ok: boolean; competency_ok: boolean;
  barricade_ok: boolean; communication_ok: boolean; weather_ok: boolean; emergency_arrangements_ok: boolean;
  verified_by: string;
}

export async function submitFieldVerification(input: FieldVerificationInput) {
  const { data, error } = await supabase.from('field_verifications').insert(input).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchLatestFieldVerification(permitId: string) {
  const { data, error } = await supabase.from('field_verifications').select('*').eq('permit_id', permitId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
