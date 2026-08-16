-- =========================================================================
-- Geofencing: permits can only be raised or approved from within range of
-- the project site. Enforced with database triggers (not just client-side
-- UI checks) so it can't be bypassed by disabling JavaScript.
-- =========================================================================

alter table projects add column if not exists site_latitude numeric;
alter table projects add column if not exists site_longitude numeric;
alter table projects add column if not exists geofence_radius_m integer not null default 500;
alter table projects add column if not exists geofence_enforced boolean not null default false;

alter table permits add column if not exists created_latitude numeric;
alter table permits add column if not exists created_longitude numeric;

alter table permit_approvals add column if not exists latitude numeric;
alter table permit_approvals add column if not exists longitude numeric;

-- Haversine distance in meters between two lat/lng points.
create or replace function geo_distance_m(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric language sql immutable as $$
  select 6371000 * acos(
    least(1.0, greatest(-1.0,
      sin(radians(lat1)) * sin(radians(lat2)) +
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lon2) - radians(lon1))
    ))
  );
$$;

-- Block creating a permit outside the project's geofence, if the project has
-- geofencing enabled. Admins are exempt (e.g. legitimate remote setup work).
create or replace function enforce_geofence_on_permit() returns trigger
language plpgsql security definer as $$
declare
  v_project projects%rowtype;
  v_distance numeric;
  v_is_admin boolean;
begin
  select * into v_project from projects where id = new.project_id;
  select current_user_role() = 'administrator' into v_is_admin;

  if v_project.geofence_enforced and not v_is_admin then
    if new.created_latitude is null or new.created_longitude is null then
      raise exception 'Location is required to raise a permit for this project. Enable location access and try again.';
    end if;
    v_distance := geo_distance_m(new.created_latitude, new.created_longitude, v_project.site_latitude, v_project.site_longitude);
    if v_distance > v_project.geofence_radius_m then
      raise exception 'You are % meters from the project site (limit % m). Permits must be raised from within range of the site.',
        round(v_distance), v_project.geofence_radius_m;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_geofence_permit on permits;
create trigger trg_enforce_geofence_permit before insert on permits
  for each row execute function enforce_geofence_on_permit();

-- Same rule for approvals: block approving a permit from outside the
-- project's geofence.
create or replace function enforce_geofence_on_approval() returns trigger
language plpgsql security definer as $$
declare
  v_project projects%rowtype;
  v_distance numeric;
  v_is_admin boolean;
begin
  if new.action <> 'approved' then
    return new;
  end if;

  select p.* into v_project from permits perm join projects p on p.id = perm.project_id where perm.id = new.permit_id;
  select current_user_role() = 'administrator' into v_is_admin;

  if v_project.geofence_enforced and not v_is_admin then
    if new.latitude is null or new.longitude is null then
      raise exception 'Location is required to approve a permit for this project. Enable location access and try again.';
    end if;
    v_distance := geo_distance_m(new.latitude, new.longitude, v_project.site_latitude, v_project.site_longitude);
    if v_distance > v_project.geofence_radius_m then
      raise exception 'You are % meters from the project site (limit % m). Approvals must be made from within range of the site.',
        round(v_distance), v_project.geofence_radius_m;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_geofence_approval on permit_approvals;
create trigger trg_enforce_geofence_approval before insert on permit_approvals
  for each row execute function enforce_geofence_on_approval();
