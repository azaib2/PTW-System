-- =========================================================================
-- Per user request: only administrators may mark a permit COMPLETED.
-- Previously any HSE-capable role (hse_officer, hse_manager, client_hse,
-- permit_approver, lifting_supervisor) could complete a permit via
-- is_hse_or_client() in the permits_update WITH CHECK. This narrows that:
-- the general HSE/client/contractor update paths remain for every other
-- status transition (suspend, resume, extend, reject, etc.), but any
-- update whose resulting status is 'completed' now additionally requires
-- is_admin().
--
-- Applied directly to production on 2026-09-01; this file brings the
-- migration history in the repo in sync with that change. See also the
-- app-layer mirror: CAN_COMPLETE in src/types/index.ts, used to hide the
-- Complete button in FieldControlPanel.tsx for non-admins (UI convenience
-- only -- this policy is the actual security boundary).
-- =========================================================================

drop policy if exists permits_update on permits;
create policy permits_update on permits for update
  using (
    status not in ('closed') and (
      is_admin()
      or (contractor_id = current_user_contractor() and status in ('draft','submitted','rejected','suspended','cancelled'))
      or is_hse_or_client()
    )
  )
  with check (
    (is_admin() or contractor_id = current_user_contractor() or is_hse_or_client())
    and (status <> 'completed' or is_admin())
  );
