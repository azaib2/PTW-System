-- =========================================================================
-- Digital HSE PTW — Core Schema (Stage 1)
-- =========================================================================
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type app_role as enum (
  'contractor_user',
  'contractor_supervisor',
  'lifting_supervisor',
  'hse_officer',
  'hse_manager',
  'client_hse',
  'permit_approver',
  'administrator'
);

create type permit_type as enum ('hot_work','cold_work','lifting');

create type permit_status as enum (
  'draft','submitted','under_review','approved','active',
  'expiring_soon','suspended','completed','closed','expired',
  'rejected','cancelled'
);

create type checklist_result as enum ('pass','pass_with_action','fail');

create type doc_status as enum ('valid','expiring','expired');

-- ---------------------------------------------------------------------
-- CONTRACTORS / PROJECTS / USERS
-- ---------------------------------------------------------------------
create table contractors (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active','inactive')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null,
  project_number text not null unique,
  logo_url text,
  permit_prefix_override jsonb, -- e.g. {"hot_work":"HW"} to override defaults
  retention_days integer not null default 60,
  critical_lift_criteria jsonb not null default '{
    "tandem_lift": true, "personnel_lifting": true, "near_live_electrical": true,
    "restricted_access": false, "complex_unusual_load": true,
    "critical_equipment": true, "above_occupied_area": true, "custom_flag": false
  }'::jsonb,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extends Supabase auth.users (1:1). RLS keys off auth.uid() = id.
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role app_role not null,
  contractor_id uuid references contractors(id),
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Many-to-many: which projects a user (HSE/client/admin) can see
create table user_projects (
  user_id uuid not null references users(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (user_id, project_id)
);

-- ---------------------------------------------------------------------
-- PERMITS (shared table for hot work / cold work / lifting)
-- ---------------------------------------------------------------------
create table permits (
  id uuid primary key default gen_random_uuid(),
  permit_number text not null unique,
  permit_type permit_type not null,
  project_id uuid not null references projects(id),
  contractor_id uuid not null references contractors(id),
  location text not null,
  exact_area text,
  activity text not null,
  description text,
  supervisor_name text,
  workers text[],
  start_time timestamptz,
  expiry_time timestamptz,
  status permit_status not null default 'draft',

  -- hot work specific
  hot_work_type text,
  gas_test jsonb, -- {o2, lel, h2s, co, other, tester, detector_id, calibration_expiry, test_time}

  -- lifting specific
  load_description text,
  load_weight_ton numeric,
  crane_id uuid,
  crane_type text,
  rated_capacity_ton numeric,
  crane_manufacturer text,
  crane_configuration text,
  lifting_supervisor_name text,
  crane_operator_name text,
  rigger_name text,
  signalman_name text,
  lifting_plan_id uuid,

  -- critical lift screening (see section 17)
  critical_lift_answers jsonb,
  is_critical_lift boolean not null default false,

  created_by uuid not null references users(id),
  submitted_by uuid references users(id),
  submitted_at timestamptz,
  approved_by uuid references users(id),
  approved_at timestamptz,
  closed_by uuid references users(id),
  closed_at timestamptz,

  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint expiry_after_start check (expiry_time is null or start_time is null or expiry_time > start_time)
);

create index idx_permits_number on permits(permit_number);
create index idx_permits_status on permits(status);
create index idx_permits_contractor on permits(contractor_id);
create index idx_permits_project on permits(project_id);
create index idx_permits_location on permits(location);
create index idx_permits_created_at on permits(created_at);
create index idx_permits_expiry on permits(expiry_time);

-- Boolean/JSON control checklists per permit (hot work & cold work control lists)
create table permit_controls (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  control_key text not null,      -- e.g. 'fire_extinguisher_available'
  control_label text not null,
  is_checked boolean not null default false,
  remarks text,
  created_at timestamptz not null default now(),
  unique(permit_id, control_key)
);

create table permit_approvals (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  action text not null check (action in ('submitted','reviewed','approved','rejected')),
  actor_id uuid not null references users(id),
  remarks text,
  created_at timestamptz not null default now()
);

create table permit_attachments (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  file_name text not null,
  storage_path text not null,      -- path within Supabase Storage bucket
  doc_type text,                    -- certificate / drawing / load_chart / method_statement / other
  doc_number text,
  issue_date date,
  expiry_date date,
  status doc_status,
  uploaded_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table permit_photos (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid references permits(id) on delete cascade,
  related_table text,      -- 'crane_checklist' | 'site_preparation' | 'rigging_verification' | null
  related_id uuid,
  storage_path text not null,
  caption text,
  taken_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table permit_extensions (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  requested_by uuid not null references users(id),
  reason text not null,
  current_expiry timestamptz not null,
  requested_new_expiry timestamptz not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table permit_suspensions (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  suspended_by uuid not null references users(id),
  reason text not null,
  remarks text not null,
  suspended_at timestamptz not null default now(),
  resumed_by uuid references users(id),
  resume_remarks text,
  resumed_at timestamptz
);

-- ---------------------------------------------------------------------
-- LIFTING PACKAGE
-- ---------------------------------------------------------------------
create table lifting_plans (
  id uuid primary key default gen_random_uuid(),
  plan_number text not null unique,
  linked_permit_id uuid references permits(id),
  project_id uuid not null references projects(id),
  contractor_id uuid not null references contractors(id),
  location text not null,
  plan_date date not null default current_date,
  description text,

  load_description text, load_weight_ton numeric, load_length_m numeric,
  load_width_m numeric, load_height_m numeric, center_of_gravity text, lifting_points text,

  crane_type text, crane_id text, rated_capacity_ton numeric, boom_length_m numeric,
  counterweight_ton numeric, outrigger_configuration text, working_radius_m numeric,
  lift_height_m numeric, crane_configuration text,

  sling_type text, sling_capacity_ton numeric, sling_length_m numeric,
  shackle_type text, shackle_capacity_ton numeric, spreader_beam boolean default false,
  lifting_beam boolean default false, hook_type text, wll_swl_ton numeric, sling_angle_deg numeric,

  lifting_supervisor_name text, operator_name text, rigger_name text, signalman_name text,

  ground_condition text, ground_bearing_assessment text, underground_services text,
  excavation_proximity text, outrigger_requirements text,

  status text not null default 'draft' check (status in ('draft','approved')),
  approved_by uuid references users(id),
  approved_at timestamptz,

  is_demo boolean not null default false,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table permits add constraint fk_permits_lifting_plan foreign key (lifting_plan_id) references lifting_plans(id);

create table lifting_plan_steps (
  id uuid primary key default gen_random_uuid(),
  lifting_plan_id uuid not null references lifting_plans(id) on delete cascade,
  step_order integer not null,
  step_description text not null
);

create table crane_checklists (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid references permits(id) on delete cascade,
  crane_id text not null, crane_type text, capacity_ton numeric,
  operator_name text not null, checklist_date date not null default current_date,
  shift text, location text,
  result checklist_result,
  corrective_action_required text,
  is_demo boolean not null default false,
  performed_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table crane_checklist_items (
  id uuid primary key default gen_random_uuid(),
  crane_checklist_id uuid not null references crane_checklists(id) on delete cascade,
  category text not null, -- documentation | condition | lifting_components | outriggers | safety
  item_key text not null,
  item_label text not null,
  is_checked boolean not null default false,
  is_critical boolean not null default false, -- failing a critical item blocks clearance
  remarks text
);

create table site_preparation_checklists (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid references permits(id) on delete cascade,
  checklist_date date not null default current_date,
  result checklist_result,
  is_demo boolean not null default false,
  performed_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table site_preparation_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references site_preparation_checklists(id) on delete cascade,
  category text not null, -- access | ground | crane_setup | lifting_zone | electrical | environment | simops
  item_key text not null,
  item_label text not null,
  is_checked boolean not null default false,
  remarks text
);

create table rigging_verifications (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid references permits(id) on delete cascade,
  result checklist_result,
  remarks text,
  is_demo boolean not null default false,
  performed_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table rigging_verification_items (
  id uuid primary key default gen_random_uuid(),
  rigging_verification_id uuid not null references rigging_verifications(id) on delete cascade,
  item_key text not null,
  item_label text not null,
  is_checked boolean not null default false,
  remarks text
);

create table competency_documents (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid references permits(id) on delete cascade,
  person_role text not null, -- crane_operator | lifting_supervisor | rigger | signalman
  person_name text not null,
  certificate_number text not null,
  issue_date date,
  expiry_date date not null,
  status doc_status not null default 'valid',
  storage_path text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table field_verifications (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  lifting_ptw_ok boolean not null default false,
  lifting_plan_ok boolean not null default false,
  crane_checklist_ok boolean not null default false,
  site_preparation_ok boolean not null default false,
  rigging_ok boolean not null default false,
  competency_ok boolean not null default false,
  barricade_ok boolean not null default false,
  communication_ok boolean not null default false,
  weather_ok boolean not null default false,
  emergency_arrangements_ok boolean not null default false,
  ready_to_lift boolean generated always as (
    lifting_ptw_ok and lifting_plan_ok and crane_checklist_ok and site_preparation_ok
    and rigging_ok and competency_ok and barricade_ok and communication_ok
    and weather_ok and emergency_arrangements_ok
  ) stored,
  verified_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- QR / AUDIT / NOTIFICATIONS / SETTINGS
-- ---------------------------------------------------------------------
create table qr_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,          -- e.g. permit id string or 'QR-HOT-B1-001' for location QR
  qr_kind text not null check (qr_kind in ('permit','location')),
  permit_id uuid references permits(id),
  location_label text,
  default_location text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index idx_qr_codes_permit on qr_codes(permit_id);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_table text not null,
  entity_id uuid not null,
  action text not null,
  old_status text,
  new_status text,
  remarks text,
  actor_id uuid references users(id),
  created_at timestamptz not null default now()
);
create index idx_audit_entity on audit_logs(entity_table, entity_id);
create index idx_audit_created on audit_logs(created_at);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table system_settings (
  id boolean primary key default true check (id), -- singleton row
  project_default_retention_days integer not null default 60,
  updated_by uuid references users(id),
  updated_at timestamptz not null default now()
);
insert into system_settings (id) values (true);

-- updated_at trigger helper
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_permits_updated before update on permits for each row execute function set_updated_at();
create trigger trg_projects_updated before update on projects for each row execute function set_updated_at();
create trigger trg_contractors_updated before update on contractors for each row execute function set_updated_at();
create trigger trg_users_updated before update on users for each row execute function set_updated_at();
create trigger trg_liftingplans_updated before update on lifting_plans for each row execute function set_updated_at();
