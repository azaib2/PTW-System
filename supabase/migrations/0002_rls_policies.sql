-- =========================================================================
-- Digital HSE PTW — Row Level Security
-- Every table with permit/project data is locked down. Public QR verification
-- is served through a SEPARATE public view (0003) that never touches these
-- tables directly, so RLS here can stay strict.
-- =========================================================================

alter table contractors enable row level security;
alter table projects enable row level security;
alter table users enable row level security;
alter table user_projects enable row level security;
alter table permits enable row level security;
alter table permit_controls enable row level security;
alter table permit_approvals enable row level security;
alter table permit_attachments enable row level security;
alter table permit_photos enable row level security;
alter table permit_extensions enable row level security;
alter table permit_suspensions enable row level security;
alter table lifting_plans enable row level security;
alter table lifting_plan_steps enable row level security;
alter table crane_checklists enable row level security;
alter table crane_checklist_items enable row level security;
alter table site_preparation_checklists enable row level security;
alter table site_preparation_items enable row level security;
alter table rigging_verifications enable row level security;
alter table rigging_verification_items enable row level security;
alter table competency_documents enable row level security;
alter table field_verifications enable row level security;
alter table qr_codes enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
alter table system_settings enable row level security;

-- ---------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, read-only) to avoid recursive RLS
-- ---------------------------------------------------------------------
create or replace function current_user_role() returns app_role
language sql security definer stable as $$
  select role from users where id = auth.uid();
$$;

create or replace function current_user_contractor() returns uuid
language sql security definer stable as $$
  select contractor_id from users where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select current_user_role() = 'administrator';
$$;

create or replace function is_hse_or_client() returns boolean
language sql security definer stable as $$
  select current_user_role() in ('hse_officer','hse_manager','client_hse','permit_approver','lifting_supervisor');
$$;

create or replace function has_project_access(p_project_id uuid) returns boolean
language sql security definer stable as $$
  select is_admin() or exists (
    select 1 from user_projects up where up.user_id = auth.uid() and up.project_id = p_project_id
  );
$$;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
create policy users_select_self_or_admin on users for select
  using (id = auth.uid() or is_admin() or is_hse_or_client());
create policy users_update_admin_only on users for update
  using (is_admin());
create policy users_insert_admin_only on users for insert
  with check (is_admin());

-- ---------------------------------------------------------------------
-- contractors / projects — readable by involved parties, writable by admin
-- ---------------------------------------------------------------------
create policy contractors_select on contractors for select
  using (is_admin() or is_hse_or_client() or id = current_user_contractor());
create policy contractors_write_admin on contractors for all
  using (is_admin()) with check (is_admin());

create policy projects_select on projects for select
  using (is_admin() or has_project_access(id) or exists (
    select 1 from permits p where p.project_id = projects.id and p.contractor_id = current_user_contractor()
  ));
create policy projects_write_admin on projects for all
  using (is_admin()) with check (is_admin());

create policy user_projects_select on user_projects for select
  using (user_id = auth.uid() or is_admin());
create policy user_projects_write_admin on user_projects for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------
-- permits — the core access rule set
-- Contractor: only their own contractor's records.
-- HSE/client/approver: only assigned-project records.
-- Admin: everything.
-- ---------------------------------------------------------------------
create policy permits_select on permits for select
  using (
    is_admin()
    or contractor_id = current_user_contractor()
    or has_project_access(project_id)
  );

create policy permits_insert on permits for insert
  with check (
    created_by = auth.uid()
    and (is_admin() or contractor_id = current_user_contractor() or has_project_access(project_id))
  );

-- Draft/submitted edits: only by the contractor that owns it (or admin), and never once closed.
create policy permits_update on permits for update
  using (
    status not in ('closed') and (
      is_admin()
      or (contractor_id = current_user_contractor() and status in ('draft','submitted','rejected'))
      or (has_project_access(project_id) and is_hse_or_client())
    )
  )
  with check (status not in ('closed'));

-- No deletes from the app layer — closure/cancellation are status changes, not row deletes.
-- (No delete policy created => delete is denied by default under RLS.)

-- ---------------------------------------------------------------------
-- Child tables inherit permit visibility via EXISTS against permits
-- ---------------------------------------------------------------------
create policy permit_controls_all on permit_controls for all
  using (exists (select 1 from permits p where p.id = permit_controls.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (exists (select 1 from permits p where p.id = permit_controls.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))));

-- Approval history: insertable by HSE/approvers/admin only; NEVER updatable or deletable by anyone
-- (no update/delete policy = denied). Self-approval is blocked at the application layer AND
-- re-checked here: actor cannot equal the permit's created_by when action = 'approved'.
create policy permit_approvals_select on permit_approvals for select
  using (exists (select 1 from permits p where p.id = permit_approvals.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))));

create policy permit_approvals_insert on permit_approvals for insert
  with check (
    actor_id = auth.uid()
    and (is_admin() or is_hse_or_client())
    and not (
      action = 'approved' and exists (
        select 1 from permits p where p.id = permit_approvals.permit_id and p.created_by = auth.uid()
      )
    )
  );

create policy permit_attachments_all on permit_attachments for all
  using (exists (select 1 from permits p where p.id = permit_attachments.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (uploaded_by = auth.uid());

create policy permit_photos_all on permit_photos for all
  using (permit_id is null or exists (select 1 from permits p where p.id = permit_photos.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (taken_by = auth.uid());

create policy permit_extensions_select on permit_extensions for select
  using (exists (select 1 from permits p where p.id = permit_extensions.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))));
create policy permit_extensions_insert on permit_extensions for insert
  with check (requested_by = auth.uid());
create policy permit_extensions_approve_update on permit_extensions for update
  using (is_admin() or is_hse_or_client())
  with check (is_admin() or is_hse_or_client());

create policy permit_suspensions_select on permit_suspensions for select
  using (exists (select 1 from permits p where p.id = permit_suspensions.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))));
create policy permit_suspensions_insert on permit_suspensions for insert
  with check (suspended_by = auth.uid() and (is_admin() or is_hse_or_client()));
create policy permit_suspensions_resume_update on permit_suspensions for update
  using (is_admin() or is_hse_or_client())
  with check (is_admin() or is_hse_or_client());

-- ---------------------------------------------------------------------
-- Lifting package tables — same has_project_access / contractor pattern
-- ---------------------------------------------------------------------
create policy lifting_plans_all on lifting_plans for all
  using (is_admin() or contractor_id = current_user_contractor() or has_project_access(project_id))
  with check (created_by = auth.uid() and (is_admin() or contractor_id = current_user_contractor() or has_project_access(project_id)));

create policy lifting_plan_steps_all on lifting_plan_steps for all
  using (exists (select 1 from lifting_plans lp where lp.id = lifting_plan_steps.lifting_plan_id
                 and (is_admin() or lp.contractor_id = current_user_contractor() or has_project_access(lp.project_id))));

create policy crane_checklists_all on crane_checklists for all
  using (permit_id is null or exists (select 1 from permits p where p.id = crane_checklists.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (performed_by = auth.uid());

create policy crane_checklist_items_all on crane_checklist_items for all
  using (exists (select 1 from crane_checklists c where c.id = crane_checklist_items.crane_checklist_id));

create policy site_prep_checklists_all on site_preparation_checklists for all
  using (permit_id is null or exists (select 1 from permits p where p.id = site_preparation_checklists.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (performed_by = auth.uid());

create policy site_prep_items_all on site_preparation_items for all
  using (exists (select 1 from site_preparation_checklists c where c.id = site_preparation_items.checklist_id));

create policy rigging_verifications_all on rigging_verifications for all
  using (permit_id is null or exists (select 1 from permits p where p.id = rigging_verifications.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (performed_by = auth.uid());

create policy rigging_items_all on rigging_verification_items for all
  using (exists (select 1 from rigging_verifications r where r.id = rigging_verification_items.rigging_verification_id));

create policy competency_documents_all on competency_documents for all
  using (permit_id is null or exists (select 1 from permits p where p.id = competency_documents.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))))
  with check (created_by = auth.uid());

-- Field verification can only be recorded by HSE roles or admin (never contractor)
create policy field_verifications_select on field_verifications for select
  using (exists (select 1 from permits p where p.id = field_verifications.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))));
create policy field_verifications_insert on field_verifications for insert
  with check (verified_by = auth.uid() and (is_admin() or is_hse_or_client()));

-- ---------------------------------------------------------------------
-- QR codes — creation restricted to HSE/admin; select open to anyone with permit access
-- ---------------------------------------------------------------------
create policy qr_codes_select on qr_codes for select
  using (permit_id is null or exists (select 1 from permits p where p.id = qr_codes.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))));
create policy qr_codes_insert on qr_codes for insert
  with check (created_by = auth.uid() and (is_admin() or is_hse_or_client()));

-- ---------------------------------------------------------------------
-- Audit logs — insert-only for authenticated actions, NEVER updatable/deletable by anyone
-- ---------------------------------------------------------------------
create policy audit_logs_select on audit_logs for select
  using (is_admin() or is_hse_or_client() or actor_id = auth.uid());
create policy audit_logs_insert on audit_logs for insert
  with check (actor_id = auth.uid());
-- No update or delete policy exists for audit_logs => both denied by default.

-- ---------------------------------------------------------------------
-- Notifications — a user only ever sees their own
-- ---------------------------------------------------------------------
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());
create policy notifications_insert on notifications for insert with check (true); -- created by server-side triggers/functions

-- ---------------------------------------------------------------------
-- System settings — readable by all authenticated, writable by admin only
-- ---------------------------------------------------------------------
create policy system_settings_select on system_settings for select using (true);
create policy system_settings_update on system_settings for update using (is_admin()) with check (is_admin());
