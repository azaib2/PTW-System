-- =========================================================================
-- Demo data (section 55). All rows flagged is_demo = true so they can be
-- identified and purged separately from real project data.
-- NOTE: demo `users` rows require matching auth.users accounts to actually
-- log in — create those first via Supabase Auth (dashboard or supabase-js
-- admin API), then run this seed with the matching UUIDs. Placeholders
-- below use deterministic UUIDs you should replace with real auth user IDs.
-- =========================================================================

insert into contractors (id, company_name, contact_name, email, phone, is_demo) values
  ('00000000-0000-0000-0000-000000000101', 'Al-Rashid Steel Erection Co.', 'Ahmed Al-Rashid', 'ahmed@example.com', '+966500000001', true),
  ('00000000-0000-0000-0000-000000000102', 'Gulf Rigging & Lifting Services', 'Fahad Al-Otaibi', 'fahad@example.com', '+966500000002', true),
  ('00000000-0000-0000-0000-000000000103', 'Falcon Welding Contractors', 'Yousef Al-Harbi', 'yousef@example.com', '+966500000003', true),
  ('00000000-0000-0000-0000-000000000104', 'Desert Crane Operations LLC', 'Mishal Al-Dossari', 'mishal@example.com', '+966500000004', true),
  ('00000000-0000-0000-0000-000000000105', 'Horizon Mechanical Works', 'Nasser Al-Ghamdi', 'nasser@example.com', '+966500000005', true);

insert into projects (id, project_name, project_number, retention_days, is_demo) values
  ('00000000-0000-0000-0000-000000000201', 'Demo Refinery Expansion Project', 'PRJ-DEMO-001', 60, true);

-- users rows intentionally omitted here — see note above; create auth.users
-- first (10 demo accounts spanning every role), then insert matching rows
-- into `users` with is_demo = true before running the permit inserts below.

-- Example of the pattern once you have real auth UUIDs (replace <UUID>):
-- insert into users (id, full_name, email, role, contractor_id, is_demo) values
--   ('<UUID>', 'Demo Admin', 'admin@demo.local', 'administrator', null, true);

comment on table contractors is 'is_demo=true rows are seed/demo data — safe to bulk-delete for a clean production start.';
