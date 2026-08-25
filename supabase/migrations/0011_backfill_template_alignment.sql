-- =========================================================================
-- Backfill Identified Hazards + Pre-Authorisation Checks onto permits that
-- were created before migration 0010. New permits get these seeded by the
-- application at creation time; existing permits need a one-time catch-up
-- so their detail pages/PDFs aren't missing the new sections.
-- =========================================================================

with hazard_defs(permit_type, hazard_key, hazard_label) as (
  values
    ('hot_work', 'fire_ignition_combustibles', 'Fire / ignition of nearby combustible materials'),
    ('hot_work', 'explosion_flammable_gases', 'Explosion from flammable gases or vapours'),
    ('hot_work', 'burns_hot_surfaces_sparks', 'Burns from hot surfaces, sparks, and spatter'),
    ('hot_work', 'inhalation_fumes', 'Inhalation of welding fumes and toxic gases'),
    ('hot_work', 'eye_injury_uv', 'Eye injury from UV radiation / arc flash'),
    ('hot_work', 'uncontrolled_heat_spread', 'Uncontrolled heat spread causing structural damage'),

    ('lifting', 'load_falling', 'Load falling from height — crush or fatal injury to persons below'),
    ('lifting', 'structural_failure_equipment', 'Structural failure of lifting equipment or accessories'),
    ('lifting', 'crane_overturning', 'Crane or equipment overturning — ground conditions or overload'),
    ('lifting', 'collision_overhead_lines', 'Collision with overhead power lines or nearby structures'),
    ('lifting', 'persons_in_load_path', 'Persons entering the load path or exclusion zone during lift'),
    ('lifting', 'adverse_weather_wind', 'Adverse weather — wind gusts causing loss of load control'),

    ('work_at_height', 'falls_from_height', 'Falls from height — serious injury or death'),
    ('work_at_height', 'falling_objects', 'Falling objects striking personnel below'),
    ('work_at_height', 'platform_collapse', 'Collapse or instability of working platform or scaffold'),
    ('work_at_height', 'adverse_weather', 'Adverse weather — wind, rain, or ice increasing fall risk'),
    ('work_at_height', 'fall_protection_failure', 'Failure of personal fall protection equipment'),
    ('work_at_height', 'manual_handling_fatigue', 'Manual handling fatigue and overreaching at height'),

    ('cold_work', 'stored_energy_release', 'Unexpected release of stored electrical/mechanical/pressure energy'),
    ('cold_work', 'confined_space_atmosphere', 'Hazardous or oxygen-deficient atmosphere (confined space)'),
    ('cold_work', 'falls_same_level', 'Slips, trips, and falls from work-area obstructions'),
    ('cold_work', 'chemical_exposure_hazard', 'Exposure to chemicals, dust, or hazardous substances'),
    ('cold_work', 'struck_by_moving_plant', 'Struck by moving plant, vehicles, or equipment'),
    ('cold_work', 'simops_conflict', 'Conflict with simultaneous operations (SIMOPS) nearby'),

    ('general_work', 'uncontrolled_scope_deviation', 'Work proceeding outside the approved method statement/risk assessment'),
    ('general_work', 'environmental_release', 'Environmental release (spill, dust, noise) affecting site or public'),
    ('general_work', 'struck_by_moving_plant_gw', 'Struck by moving plant, vehicles, or equipment'),
    ('general_work', 'uninducted_personnel', 'Personnel working without site-specific induction/briefing'),
    ('general_work', 'poor_housekeeping', 'Poor housekeeping creating slip/trip/fire hazards')
)
insert into permit_hazards (permit_id, hazard_key, hazard_label, is_applicable)
select p.id, h.hazard_key, h.hazard_label, false
from permits p
join hazard_defs h on h.permit_type = p.permit_type::text
on conflict (permit_id, hazard_key) do nothing;

with preauth_defs(permit_type, control_key, control_label) as (
  values
    ('hot_work', 'preauth_area_cleared_3m', 'Area cleared of combustibles within 3 metres'),
    ('hot_work', 'preauth_extinguisher_ready', 'Fire extinguisher present, charged, and accessible'),
    ('hot_work', 'preauth_fire_watch_arranged', 'Fire watch arranged — duration + 60 min post-completion'),
    ('hot_work', 'preauth_area_inspected', 'Hot work area inspected and approved by supervisor'),
    ('hot_work', 'preauth_ignition_sources_isolated', 'Gas / fuel / ignition sources isolated or removed'),
    ('hot_work', 'preauth_emergency_comms', 'Emergency procedures communicated to all personnel'),

    ('lifting', 'preauth_lift_plan_signed', 'Lift plan reviewed and signed by Appointed Person'),
    ('lifting', 'preauth_loler_certs_onsite', 'Lifting equipment and all accessories checked — LOLER certificates on site'),
    ('lifting', 'preauth_ground_outriggers', 'Ground bearing capacity assessed — outrigger mats correctly positioned'),
    ('lifting', 'preauth_exclusion_zone_clear', 'Exclusion zone established and all non-essential persons clear of lift zone'),
    ('lifting', 'preauth_wind_within_limit', 'Wind speed checked and confirmed within equipment rated operating limit'),
    ('lifting', 'preauth_banksman_comms', 'Banksman in position; two-way communication with operator confirmed'),

    ('work_at_height', 'preauth_platform_signed_off', 'Platform / scaffold inspected and signed off — inspection sheet on site'),
    ('work_at_height', 'preauth_rescue_plan_documented', 'Rescue plan documented and rescue team identified'),
    ('work_at_height', 'preauth_fall_protection_fit_checked', 'Personal fall protection inspected and fit-checked'),
    ('work_at_height', 'preauth_anchor_points_verified', 'Anchor points verified and load-rated for intended use'),
    ('work_at_height', 'preauth_weather_acceptable', 'Weather assessed and confirmed acceptable for work'),
    ('work_at_height', 'preauth_exclusion_zone_wah', 'Exclusion zone established and communicated to all personnel'),

    ('cold_work', 'preauth_isolation_confirmed', 'Isolation / Lock-out / Tag-out (LOTO) confirmed where applicable'),
    ('cold_work', 'preauth_standby_fire_watch', 'Standby person / fire watch assigned where required'),
    ('cold_work', 'preauth_rescue_emergency_plan', 'Rescue / emergency plan in place'),
    ('cold_work', 'preauth_barricades_signage', 'Barricades / signage erected'),
    ('cold_work', 'preauth_comms_tested', 'Communication system tested'),
    ('cold_work', 'preauth_equipment_inspected_tagged', 'Equipment inspected and tagged'),
    ('cold_work', 'preauth_work_area_cleared', 'Work area cleaned / cleared and ready'),

    ('general_work', 'preauth_isolation_confirmed', 'Isolation / Lock-out / Tag-out (LOTO) confirmed where applicable'),
    ('general_work', 'preauth_standby_fire_watch', 'Standby person / fire watch assigned where required'),
    ('general_work', 'preauth_rescue_emergency_plan', 'Rescue / emergency plan in place'),
    ('general_work', 'preauth_barricades_signage', 'Barricades / signage erected'),
    ('general_work', 'preauth_comms_tested', 'Communication system tested'),
    ('general_work', 'preauth_equipment_inspected_tagged', 'Equipment inspected and tagged'),
    ('general_work', 'preauth_work_area_cleared', 'Work area cleaned / cleared and ready')
)
insert into permit_controls (permit_id, control_key, control_label, is_checked, is_pre_authorization)
select p.id, d.control_key, d.control_label, false, true
from permits p
join preauth_defs d on d.permit_type = p.permit_type::text
on conflict (permit_id, control_key) do nothing;
