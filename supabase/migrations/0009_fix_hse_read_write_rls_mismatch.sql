-- =========================================================================
-- Fix systemic RLS inconsistency: nearly every table's SELECT policy
-- required an explicit user_projects assignment for HSE-capable roles
-- (has_project_access), while the matching INSERT/UPDATE policy only
-- required the role itself (is_hse_or_client, no assignment needed). This
-- meant an HSE user could successfully save a field verification, lifting
-- plan, approval, etc., and then have the app immediately fail to read it
-- back — looking exactly like data loss or a broken feature.
--
-- Fix: any HSE-capable role can now read what they could already write,
-- same as before. Contractor isolation (a contractor only sees their own
-- contractor's data) and the administrator bypass are both unchanged —
-- this migration only removes the redundant, inconsistently-applied
-- per-project assignment requirement for HSE/client/approver roles.
-- =========================================================================

drop policy if exists permits_select on permits;
create policy permits_select on permits for select
  using (is_admin() or contractor_id = current_user_contractor() or is_hse_or_client());

drop policy if exists permits_update on permits;
create policy permits_update on permits for update
  using (
    status not in ('closed') and (
      is_admin()
      or (contractor_id = current_user_contractor() and status in ('draft','submitted','rejected','suspended','cancelled'))
      or is_hse_or_client()
    )
  )
  with check (status not in ('closed'));

drop policy if exists permit_controls_all on permit_controls;
create policy permit_controls_all on permit_controls for all
  using (exists (select 1 from permits p where p.id = permit_controls.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())))
  with check (exists (select 1 from permits p where p.id = permit_controls.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())));

drop policy if exists permit_approvals_select on permit_approvals;
create policy permit_approvals_select on permit_approvals for select
  using (exists (select 1 from permits p where p.id = permit_approvals.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())));

drop policy if exists permit_attachments_all on permit_attachments;
create policy permit_attachments_all on permit_attachments for all
  using (exists (select 1 from permits p where p.id = permit_attachments.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())))
  with check (uploaded_by = auth.uid());

drop policy if exists permit_photos_all on permit_photos;
create policy permit_photos_all on permit_photos for all
  using (permit_id is null or exists (select 1 from permits p where p.id = permit_photos.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())))
  with check (taken_by = auth.uid());

drop policy if exists permit_extensions_select on permit_extensions;
create policy permit_extensions_select on permit_extensions for select
  using (exists (select 1 from permits p where p.id = permit_extensions.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())));

drop policy if exists permit_suspensions_select on permit_suspensions;
create policy permit_suspensions_select on permit_suspensions for select
  using (exists (select 1 from permits p where p.id = permit_suspensions.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())));

drop policy if exists lifting_plans_all on lifting_plans;
create policy lifting_plans_all on lifting_plans for all
  using (is_admin() or contractor_id = current_user_contractor() or is_hse_or_client())
  with check (created_by = auth.uid() and (is_admin() or contractor_id = current_user_contractor() or is_hse_or_client()));

drop policy if exists lifting_plan_steps_all on lifting_plan_steps;
create policy lifting_plan_steps_all on lifting_plan_steps for all
  using (exists (select 1 from lifting_plans lp where lp.id = lifting_plan_steps.lifting_plan_id
                 and (is_admin() or lp.contractor_id = current_user_contractor() or is_hse_or_client())));

drop policy if exists crane_checklists_all on crane_checklists;
create policy crane_checklists_all on crane_checklists for all
  using (permit_id is null or exists (select 1 from permits p where p.id = crane_checklists.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())))
  with check (performed_by = auth.uid());

drop policy if exists site_prep_checklists_all on site_preparation_checklists;
create policy site_prep_checklists_all on site_preparation_checklists for all
  using (permit_id is null or exists (select 1 from permits p where p.id = site_preparation_checklists.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())))
  with check (performed_by = auth.uid());

drop policy if exists rigging_verifications_all on rigging_verifications;
create policy rigging_verifications_all on rigging_verifications for all
  using (permit_id is null or exists (select 1 from permits p where p.id = rigging_verifications.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())))
  with check (performed_by = auth.uid());

drop policy if exists competency_documents_all on competency_documents;
create policy competency_documents_all on competency_documents for all
  using (permit_id is null or exists (select 1 from permits p where p.id = competency_documents.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())))
  with check (created_by = auth.uid());

drop policy if exists field_verifications_select on field_verifications;
create policy field_verifications_select on field_verifications for select
  using (exists (select 1 from permits p where p.id = field_verifications.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())));

drop policy if exists qr_codes_select on qr_codes;
create policy qr_codes_select on qr_codes for select
  using (permit_id is null or exists (select 1 from permits p where p.id = qr_codes.permit_id
                 and (is_admin() or p.contractor_id = current_user_contractor() or is_hse_or_client())));
