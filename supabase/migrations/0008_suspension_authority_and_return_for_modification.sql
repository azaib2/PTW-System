-- Item 2: Only administrator may suspend a permit (previously any HSE-capable role could).
drop policy if exists permit_suspensions_insert on permit_suspensions;
create policy permit_suspensions_insert on permit_suspensions for insert
  with check (suspended_by = auth.uid() and is_admin());

-- Item 3: a suspended or cancelled permit returns to the requestor's control
-- so they can act on the comments and resubmit — previously only
-- draft/submitted/rejected were editable by the owning contractor.
drop policy if exists permits_update on permits;
create policy permits_update on permits for update
  using (
    status not in ('closed') and (
      is_admin()
      or (contractor_id = current_user_contractor() and status in ('draft','submitted','rejected','suspended','cancelled'))
      or (has_project_access(project_id) and is_hse_or_client())
    )
  )
  with check (status not in ('closed'));
