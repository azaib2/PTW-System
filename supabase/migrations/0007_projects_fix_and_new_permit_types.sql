-- Fix: projects were invisible to a contractor user until they already had
-- a permit on that project — impossible to bootstrap. Project names/numbers
-- aren't sensitive, so any authenticated user may browse the list; actual
-- permit DATA stays locked down by the existing permits_select policy.
drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (true);

-- New permit types: General Work Permit and Working at Height Permit,
-- matching the sample templates provided.
alter type permit_type add value if not exists 'general_work';
alter type permit_type add value if not exists 'work_at_height';

-- General Work Permit fields
alter table permits add column if not exists additional_information text;
alter table permits add column if not exists department text;
alter table permits add column if not exists alternative_company_contact text;
alter table permits add column if not exists company_permit_issuer text;
alter table permits add column if not exists hours_of_work text;
alter table permits add column if not exists deviations_from_method_statement text;
alter table permits add column if not exists site_specific_hazards text;

-- Working at Height Permit fields
alter table permits add column if not exists work_leader_name text;
alter table permits add column if not exists superintendent_name text;
alter table permits add column if not exists no_alternative_method_confirmed boolean;
