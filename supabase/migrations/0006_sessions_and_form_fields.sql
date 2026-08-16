-- =========================================================================
-- Single active session enforcement + fields to match the sample PTW forms
-- =========================================================================

create table if not exists active_sessions (
  user_id uuid primary key references users(id) on delete cascade,
  session_token text not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table active_sessions enable row level security;

create policy active_sessions_select on active_sessions for select using (user_id = auth.uid());
create policy active_sessions_upsert on active_sessions for insert with check (user_id = auth.uid());
create policy active_sessions_update on active_sessions for update using (user_id = auth.uid());

-- Additional fields to match the sample Hot Work / Lifting PTW forms:
-- named Fire Watcher, Detail of Surroundings, and contact numbers for
-- lifting personnel roles.
alter table permits add column if not exists detail_of_surroundings text;
alter table permits add column if not exists fire_watcher_name text;
alter table permits add column if not exists lifting_supervisor_contact text;
alter table permits add column if not exists crane_operator_contact text;
alter table permits add column if not exists rigger_contact text;
alter table permits add column if not exists signalman_contact text;

-- Track the timestamp of the last password re-entry ("step-up auth") for
-- high-stakes actions, for audit/forensic purposes.
alter table permit_approvals add column if not exists reauth_confirmed_at timestamptz;
alter table permit_suspensions add column if not exists reauth_confirmed_at timestamptz;
