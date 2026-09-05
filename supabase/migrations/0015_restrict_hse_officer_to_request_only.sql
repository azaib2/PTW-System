-- =========================================================================
-- Per user request: "hse officer of any company can only request permit not
-- approve it." HSE Officer should be able to create/submit a permit for
-- their own company (already covered by the plain contractor_id match on
-- permits_insert / permits_update / permits_select and every related
-- lifting-package table), but should NOT have any of the HSE-authority
-- actions bundled into is_hse_or_client(): first-pass permit review
-- ("verify and accept"), final approve/reject, resume-from-suspension,
-- extension approval, recording field verification, generating a permit QR,
-- or the broader HSE user-directory visibility.
--
-- That authority now starts at hse_manager (still scoped to their own
-- company per has_hse_scope() from migration 0014), plus lifting_supervisor,
-- client_hse and permit_approver, unchanged.
--
-- App-layer mirror: CAN_APPROVE (and CAN_VERIFY, which equals it) in
-- src/types/index.ts no longer includes 'hse_officer' -- UI convenience
-- only, this policy is the actual security boundary.
--
-- Applied directly to production on 2026-09-05; this file brings the
-- migration history in the repo in sync with that change.
-- =========================================================================

create or replace function is_hse_or_client() returns boolean
language sql stable security definer as $$
  select current_user_role() in ('hse_manager','client_hse','permit_approver','lifting_supervisor');
$$;
