-- =========================================================================
-- Template alignment — brings the permit record in line with the four
-- reference PTW templates (Hot Work, Lifting Operations, Working at Height,
-- generic PTW). Adds the sections those templates carry that the app didn't
-- yet capture: Applicable Standards, Equipment/PPE, Additional Permits
-- Required, Emergency Procedure, a distinct Identified Hazards checklist
-- (separate from Safety Controls), a gating Pre-Authorisation Checks list,
-- and a real per-worker Sign On / Sign Off log (name, designation, certs,
-- timestamps) in place of the plain text[] name list.
-- =========================================================================

-- ---------------------------------------------------------------------
-- New free-text fields on permits, common to every permit type
-- ---------------------------------------------------------------------
alter table permits add column if not exists applicable_standards text;
alter table permits add column if not exists equipment_used text;
alter table permits add column if not exists ppe_required text;
alter table permits add column if not exists additional_permits_required text;
alter table permits add column if not exists emergency_procedure text;

-- ---------------------------------------------------------------------
-- Pre-authorisation flag on the existing controls table. Templates keep
-- "Safety Controls & Precautions" and "Pre-Authorisation Checks" as two
-- distinct sections; we seed both into permit_controls (same shape/UI
-- pattern already in place) but flag the second set so approval can gate
-- on it specifically, the way crane-checklist critical items already gate
-- clearance.
-- ---------------------------------------------------------------------
alter table permit_controls add column if not exists is_pre_authorization boolean not null default false;

-- ---------------------------------------------------------------------
-- Identified Hazards — a distinct checklist from Safety Controls. The
-- templates document *what could hurt someone* separately from *what
-- mitigates it*; the app previously only tracked the latter.
-- ---------------------------------------------------------------------
create table if not exists permit_hazards (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  hazard_key text not null,
  hazard_label text not null,
  is_applicable boolean not null default false,
  remarks text,
  created_at timestamptz not null default now(),
  unique(permit_id, hazard_key)
);
create index if not exists idx_permit_hazards_permit on permit_hazards(permit_id);

alter table permit_hazards enable row level security;

create policy permit_hazards_all on permit_hazards for all
  using (exists (select 1 from permits p where p.id = permit_hazards.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (exists (select 1 from permits p where p.id = permit_hazards.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))));

-- ---------------------------------------------------------------------
-- Worker Sign On / Sign Off log — every template has this table
-- (Name, Designation, Certs/Accreditations, Sign-On, Sign-Off). The old
-- `permits.workers text[]` only ever held bare names; this replaces it as
-- the real evidence record while the column stays for quick display/back-
-- compat.
-- ---------------------------------------------------------------------
create table if not exists permit_workers (
  id uuid primary key default gen_random_uuid(),
  permit_id uuid not null references permits(id) on delete cascade,
  full_name text not null,
  designation text,
  certifications text,
  signed_on_at timestamptz,
  signed_on_by uuid references users(id),
  signed_off_at timestamptz,
  signed_off_by uuid references users(id),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_permit_workers_permit on permit_workers(permit_id);

alter table permit_workers enable row level security;

create policy permit_workers_all on permit_workers for all
  using (exists (select 1 from permits p where p.id = permit_workers.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (exists (select 1 from permits p where p.id = permit_workers.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))));
