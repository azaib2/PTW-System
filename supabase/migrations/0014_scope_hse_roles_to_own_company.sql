-- =========================================================================
-- Per user report: an hse_officer/hse_manager/lifting_supervisor/
-- permit_approver assigned to one contractor company (via users.contractor_id)
-- could see AND approve/act on every OTHER contractor's permits too, because
-- is_hse_or_client() was used everywhere as a blanket, non-company-scoped
-- authorization check ("any HSE-capable role sees/acts on everything").
--
-- User explicitly chose: "Scope to own company only" --
--   - An HSE-capable user tied to a specific company (contractor_id set)
--     should only see/act on THAT company's own permits and related records.
--   - client_hse keeps full cross-company oversight (that's the point of the
--     role: an independent client/consultant reviewer across all contractors).
--   - Any HSE-capable user with NO company assigned (contractor_id is null --
--     e.g. a project-wide/"main site" HSE person) also keeps full oversight.
--
-- New helper `has_hse_scope(p_contractor_id)` replaces bare `is_hse_or_client()`
-- everywhere it was used as a row-visibility/authorization check, EXCEPT
-- audit_logs_select and contractors_select which are deliberately left as-is
-- for this pass (lower sensitivity / harder to scope correctly -- audit_logs
-- spans multiple unrelated entity types, contractors is just the company
-- directory).
--
-- Also aligns permit_hazards_all / permit_workers_all -- previously the only
-- two policies using a *different*, effectively-dormant scoping mechanism
-- (has_project_access() backed by a nearly-empty user_projects table) -- onto
-- the same has_hse_scope() mechanism as everything else, for consistency.
--
-- Applied directly to production on 2026-09-05; this file brings the
-- migration history in the repo in sync with that change.
-- =========================================================================

create or replace function has_hse_scope(p_contractor_id uuid) returns boolean
language sql security definer stable as $$
  select is_hse_or_client() and (
    current_user_role() = 'client_hse'
    or current_user_contractor() is null
    or current_user_contractor() = p_contractor_id
  );
$$;

-- permits
drop policy if exists permits_select on permits;
create policy permits_select on permits for select
  using (is_admin() or contractor_id = current_user_contractor() or has_hse_scope(contractor_id));

drop policy if exists permits_update on permits;
create policy permits_update on permits for update
  using (
    status not in ('closed') and (
      is_admin()
      or (contractor_id = current_user_contractor() and status in ('draft','submitted','rejected','suspended','cancelled'))
      or has_hse_scope(contractor_id)
    )
  )
  with check (
    (is_admin() or contractor_id = current_user_contractor() or has_hse_scope(contractor_id))
    and (status <> 'completed' or is_admin())
  );

-- permit_controls
drop policy if exists permit_controls_all on permit_controls;
create policy permit_controls_all on permit_controls for all
  using (exists (select 1 from permits p where p.id = permit_controls.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (exists (select 1 from permits p where p.id = permit_controls.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))));

-- permit_hazards (was has_project_access, effectively unused -- align with the rest)
drop policy if exists permit_hazards_all on permit_hazards;
create policy permit_hazards_all on permit_hazards for all
  using (exists (select 1 from permits p where p.id = permit_hazards.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (exists (select 1 from permits p where p.id = permit_hazards.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))));

-- permit_workers
drop policy if exists permit_workers_all on permit_workers;
create policy permit_workers_all on permit_workers for all
  using (exists (select 1 from permits p where p.id = permit_workers.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (exists (select 1 from permits p where p.id = permit_workers.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))));

-- permit_approvals
drop policy if exists permit_approvals_select on permit_approvals;
create policy permit_approvals_select on permit_approvals for select
  using (exists (select 1 from permits p where p.id = permit_approvals.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))));

drop policy if exists permit_approvals_insert on permit_approvals;
create policy permit_approvals_insert on permit_approvals for insert
  with check (
    actor_id = auth.uid()
    and (is_admin() or has_hse_scope((select contractor_id from permits where id = permit_approvals.permit_id)))
    and not (action = 'approved' and exists (select 1 from permits p where p.id = permit_approvals.permit_id and p.created_by = auth.uid()))
  );

-- permit_attachments
drop policy if exists permit_attachments_all on permit_attachments;
create policy permit_attachments_all on permit_attachments for all
  using (exists (select 1 from permits p where p.id = permit_attachments.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (uploaded_by = auth.uid());

-- permit_extensions
drop policy if exists permit_extensions_select on permit_extensions;
create policy permit_extensions_select on permit_extensions for select
  using (exists (select 1 from permits p where p.id = permit_extensions.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))));

drop policy if exists permit_extensions_approve_update on permit_extensions;
create policy permit_extensions_approve_update on permit_extensions for update
  using (is_admin() or has_hse_scope((select contractor_id from permits where id = permit_extensions.permit_id)))
  with check (is_admin() or has_hse_scope((select contractor_id from permits where id = permit_extensions.permit_id)));

-- permit_photos
drop policy if exists permit_photos_all on permit_photos;
create policy permit_photos_all on permit_photos for all
  using (permit_id is null or exists (select 1 from permits p where p.id = permit_photos.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (taken_by = auth.uid());

-- permit_suspensions
drop policy if exists permit_suspensions_select on permit_suspensions;
create policy permit_suspensions_select on permit_suspensions for select
  using (exists (select 1 from permits p where p.id = permit_suspensions.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))));

drop policy if exists permit_suspensions_resume_update on permit_suspensions;
create policy permit_suspensions_resume_update on permit_suspensions for update
  using (is_admin() or has_hse_scope((select contractor_id from permits where id = permit_suspensions.permit_id)))
  with check (is_admin() or has_hse_scope((select contractor_id from permits where id = permit_suspensions.permit_id)));

-- qr_codes
drop policy if exists qr_codes_select on qr_codes;
create policy qr_codes_select on qr_codes for select
  using (permit_id is null or exists (select 1 from permits p where p.id = qr_codes.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))));

drop policy if exists qr_codes_insert on qr_codes;
create policy qr_codes_insert on qr_codes for insert
  with check (
    created_by = auth.uid()
    and (is_admin() or (permit_id is not null and has_hse_scope((select contractor_id from permits where id = qr_codes.permit_id))))
  );

-- field_verifications
drop policy if exists field_verifications_select on field_verifications;
create policy field_verifications_select on field_verifications for select
  using (exists (select 1 from permits p where p.id = field_verifications.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))));

drop policy if exists field_verifications_insert on field_verifications;
create policy field_verifications_insert on field_verifications for insert
  with check (
    verified_by = auth.uid()
    and (is_admin() or has_hse_scope((select contractor_id from permits where id = field_verifications.permit_id)))
  );

-- crane_checklists
drop policy if exists crane_checklists_all on crane_checklists;
create policy crane_checklists_all on crane_checklists for all
  using (permit_id is null or exists (select 1 from permits p where p.id = crane_checklists.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (performed_by = auth.uid());

-- rigging_verifications
drop policy if exists rigging_verifications_all on rigging_verifications;
create policy rigging_verifications_all on rigging_verifications for all
  using (permit_id is null or exists (select 1 from permits p where p.id = rigging_verifications.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (performed_by = auth.uid());

-- site_preparation_checklists
drop policy if exists site_prep_checklists_all on site_preparation_checklists;
create policy site_prep_checklists_all on site_preparation_checklists for all
  using (permit_id is null or exists (select 1 from permits p where p.id = site_preparation_checklists.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (performed_by = auth.uid());

-- competency_documents
drop policy if exists competency_documents_all on competency_documents;
create policy competency_documents_all on competency_documents for all
  using (permit_id is null or exists (select 1 from permits p where p.id = competency_documents.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or has_hse_scope(p.contractor_id))))
  with check (created_by = auth.uid());

-- lifting_plans
drop policy if exists lifting_plans_all on lifting_plans;
create policy lifting_plans_all on lifting_plans for all
  using (is_admin() or contractor_id = current_user_contractor() or has_hse_scope(contractor_id))
  with check (created_by = auth.uid() and (is_admin() or contractor_id = current_user_contractor() or has_hse_scope(contractor_id)));

-- lifting_plan_steps
drop policy if exists lifting_plan_steps_all on lifting_plan_steps;
create policy lifting_plan_steps_all on lifting_plan_steps for all
  using (exists (select 1 from lifting_plans lp where lp.id = lifting_plan_steps.lifting_plan_id
                 and (is_admin() or lp.contractor_id = current_user_contractor() or has_hse_scope(lp.contractor_id))));

-- users
drop policy if exists users_select_self_or_admin on users;
create policy users_select_self_or_admin on users for select
  using (id = auth.uid() or is_admin() or has_hse_scope(contractor_id));
