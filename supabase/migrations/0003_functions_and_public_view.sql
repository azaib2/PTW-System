-- =========================================================================
-- Digital HSE PTW — Permit numbering, public QR view, permit health
-- =========================================================================

-- ---------------------------------------------------------------------
-- Sequential, unique permit numbers: HW-2026-000001 style
-- ---------------------------------------------------------------------
create table permit_number_sequences (
  prefix text not null,
  year integer not null,
  last_value integer not null default 0,
  primary key (prefix, year)
);

create or replace function next_permit_number(p_prefix text) returns text
language plpgsql security definer as $$
declare
  v_year integer := extract(year from now());
  v_next integer;
begin
  insert into permit_number_sequences (prefix, year, last_value)
  values (p_prefix, v_year, 1)
  on conflict (prefix, year) do update set last_value = permit_number_sequences.last_value + 1
  returning last_value into v_next;

  return p_prefix || '-' || v_year || '-' || lpad(v_next::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------------
-- Permit health: computed status, never trust a stale client value.
-- Called by the frontend / a scheduled Edge Function to refresh expiring/expired.
-- ---------------------------------------------------------------------
create or replace function refresh_permit_health() returns void
language sql security definer as $$
  update permits set status = 'expired'
   where status in ('active','expiring_soon') and expiry_time is not null and expiry_time <= now();

  update permits set status = 'expiring_soon'
   where status = 'active' and expiry_time is not null
     and expiry_time > now() and expiry_time <= now() + interval '1 hour';
$$;

-- ---------------------------------------------------------------------
-- Generic audit-log writer, invoked from the app after every state-changing
-- action (approve/reject/suspend/resume/extend/close/start/complete).
-- Kept as an explicit RPC (not a blanket trigger) so remarks/old-new status
-- are captured meaningfully rather than raw column diffs.
-- ---------------------------------------------------------------------
create or replace function log_audit(
  p_entity_table text, p_entity_id uuid, p_action text,
  p_old_status text, p_new_status text, p_remarks text
) returns void language plpgsql security definer as $$
begin
  insert into audit_logs (entity_table, entity_id, action, old_status, new_status, remarks, actor_id)
  values (p_entity_table, p_entity_id, p_action, p_old_status, p_new_status, p_remarks, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- PUBLIC QR VERIFICATION — a security-definer function, NOT a table grant.
-- Only returns the safe field list from section 32. Callable by the
-- anonymous/public role via Supabase, independent of the strict RLS above.
-- ---------------------------------------------------------------------
create or replace function public_verify_permit(p_permit_id uuid)
returns table (
  permit_number text, permit_type permit_type, contractor_name text,
  location text, activity text, status permit_status,
  issue_time timestamptz, expiry_time timestamptz,
  lifting_plan_number text, crane_id text,
  ready_to_lift boolean
)
language sql security definer stable as $$
  select
    p.permit_number, p.permit_type, c.company_name,
    p.location, p.activity, p.status,
    p.approved_at, p.expiry_time,
    lp.plan_number, p.crane_id::text,
    coalesce(fv.ready_to_lift, false)
  from permits p
  join contractors c on c.id = p.contractor_id
  left join lifting_plans lp on lp.id = p.lifting_plan_id
  left join lateral (
    select ready_to_lift from field_verifications where permit_id = p.id
    order by created_at desc limit 1
  ) fv on true
  where p.id = p_permit_id;
$$;

-- Anonymous role can execute this function only (no direct table access).
grant execute on function public_verify_permit(uuid) to anon;
