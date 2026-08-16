export type AppRole =
  | 'contractor_user'
  | 'contractor_supervisor'
  | 'lifting_supervisor'
  | 'hse_officer'
  | 'hse_manager'
  | 'client_hse'
  | 'permit_approver'
  | 'administrator';

export type PermitType = 'hot_work' | 'cold_work' | 'lifting' | 'general_work' | 'work_at_height';

export type PermitStatus =
  | 'draft' | 'submitted' | 'under_review' | 'approved' | 'active'
  | 'expiring_soon' | 'suspended' | 'completed' | 'closed' | 'expired'
  | 'rejected' | 'cancelled';

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  role: AppRole;
  contractor_id: string | null;
  is_active: boolean;
}

export interface Permit {
  id: string;
  permit_number: string;
  permit_type: PermitType;
  project_id: string;
  contractor_id: string;
  location: string;
  exact_area: string | null;
  activity: string;
  description: string | null;
  supervisor_name: string | null;
  workers: string[] | null;
  start_time: string | null;
  expiry_time: string | null;
  status: PermitStatus;
  is_critical_lift: boolean;
  lifting_plan_id: string | null;
  crane_id: string | null;
  crane_type: string | null;
  rated_capacity_ton: number | null;
  load_weight_ton: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const STATUS_COLOR: Record<PermitStatus, string> = {
  draft: 'bg-blue-100 text-blue-700',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  expiring_soon: 'bg-amber-100 text-amber-700',
  suspended: 'bg-slate-200 text-slate-700',
  completed: 'bg-green-100 text-green-700',
  closed: 'bg-slate-200 text-slate-700',
  expired: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-700'
};

export const PERMIT_PREFIX: Record<PermitType, string> = {
  hot_work: 'HW',
  cold_work: 'CW',
  lifting: 'LFT',
  general_work: 'GWP',
  work_at_height: 'WAH'
};

// Role -> capability matrix (mirrors the RLS policies; UI-layer convenience
// only, never the actual security boundary).
export const CAN_APPROVE: AppRole[] = [
  'lifting_supervisor', 'hse_officer', 'hse_manager', 'client_hse', 'permit_approver', 'administrator'
];
export const CAN_MANAGE_USERS: AppRole[] = ['administrator'];
