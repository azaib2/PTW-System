-- =========================================================================
-- Storage buckets (run once) + 60-day configurable retention
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('permit-attachments', 'permit-attachments', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('permit-photos', 'permit-photos', false)
on conflict (id) do nothing;

-- Storage RLS: a user may read/write objects only under a path prefixed with
-- a permit id they already have permit-table access to. Path convention:
-- {permit_id}/{filename}
create policy "attachments_read" on storage.objects for select
  using (
    bucket_id = 'permit-attachments'
    and exists (
      select 1 from permits p
      where p.id::text = (storage.foldername(name))[1]
        and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))
    )
  );

create policy "attachments_write" on storage.objects for insert
  with check (
    bucket_id = 'permit-attachments'
    and exists (
      select 1 from permits p
      where p.id::text = (storage.foldername(name))[1]
        and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))
    )
  );

create policy "photos_read" on storage.objects for select
  using (
    bucket_id = 'permit-photos'
    and exists (
      select 1 from permits p
      where p.id::text = (storage.foldername(name))[1]
        and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))
    )
  );

create policy "photos_write" on storage.objects for insert
  with check (
    bucket_id = 'permit-photos'
    and exists (
      select 1 from permits p
      where p.id::text = (storage.foldername(name))[1]
        and (is_admin() or p.contractor_id = current_user_contractor() or has_project_access(p.project_id))
    )
  );

-- ---------------------------------------------------------------------
-- Retention: records are ARCHIVED (soft) after the configured window, not
-- silently deleted. Nothing here hard-codes 60 — it reads system_settings
-- or the per-project override, per section 36.
-- Intended to run daily via a Supabase Scheduled Edge Function (see
-- supabase/functions/retention-sweep) — NOT a psql cron in this migration,
-- because Supabase free tier requires pg_cron to be enabled explicitly.
-- ---------------------------------------------------------------------
alter table permits add column archived_at timestamptz;

create or replace function apply_retention_policy() returns integer
language plpgsql security definer as $$
declare
  v_count integer := 0;
begin
  update permits p
  set archived_at = now()
  from projects pr
  where p.project_id = pr.id
    and p.archived_at is null
    and p.status in ('closed','expired','cancelled','rejected')
    and coalesce(p.closed_at, p.updated_at) <
        now() - make_interval(days => coalesce(pr.retention_days,
                (select project_default_retention_days from system_settings limit 1)));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
