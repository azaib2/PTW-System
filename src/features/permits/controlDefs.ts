export interface ControlDef { key: string; label: string; }

export const HOT_WORK_CONTROLS: ControlDef[] = [
  { key: 'fire_extinguisher_available', label: 'Fire extinguisher available' },
  { key: 'fire_watch_assigned', label: 'Fire watch assigned' },
  { key: 'combustible_removed', label: 'Combustible material removed' },
  { key: 'combustible_protected', label: 'Combustible material protected' },
  { key: 'gas_cylinders_secured', label: 'Gas cylinders secured' },
  { key: 'flashback_arrestors', label: 'Flashback arrestors fitted' },
  { key: 'gas_hoses_inspected', label: 'Gas hoses inspected' },
  { key: 'welding_machine_inspected', label: 'Welding machine inspected' },
  { key: 'welding_cables_inspected', label: 'Welding cables inspected' },
  { key: 'grounding_verified', label: 'Grounding verified' },
  { key: 'welding_screens', label: 'Welding screens in place' },
  { key: 'openings_protected', label: 'Openings protected' },
  { key: 'adjacent_areas_checked', label: 'Adjacent areas checked' },
  { key: 'fire_protection_impairment', label: 'Fire protection impairment assessed' },
  { key: 'emergency_access_maintained', label: 'Emergency access maintained' }
];

export const HOT_WORK_TYPES = ['Welding', 'Gas cutting', 'Grinding', 'Brazing', 'Soldering', 'Heating', 'Burning', 'Other'];

export const COLD_WORK_CONTROLS: ControlDef[] = [
  { key: 'ppe', label: 'PPE' },
  { key: 'electrical_isolation', label: 'Electrical isolation' },
  { key: 'mechanical_isolation', label: 'Mechanical isolation' },
  { key: 'loto', label: 'LOTO' },
  { key: 'barricading', label: 'Barricading' },
  { key: 'work_at_height', label: 'Work at height' },
  { key: 'excavation', label: 'Excavation' },
  { key: 'confined_space', label: 'Confined space' },
  { key: 'chemical_exposure', label: 'Chemical exposure' },
  { key: 'line_breaking', label: 'Line breaking' },
  { key: 'pressure_release', label: 'Pressure release' },
  { key: 'simops', label: 'SIMOPS' },
  { key: 'emergency_arrangements', label: 'Emergency arrangements' }
];

export const LIFTING_CONTROLS: ControlDef[] = [
  { key: 'approved_lifting_plan', label: 'Approved lifting plan' },
  { key: 'crane_certificate', label: 'Crane certificate' },
  { key: 'operator_certificate', label: 'Operator certificate' },
  { key: 'rigger_certificate', label: 'Rigger certificate' },
  { key: 'signalman_certificate', label: 'Signalman certificate' },
  { key: 'lifting_accessory_certificates', label: 'Lifting accessory certificates' },
  { key: 'ground_verified', label: 'Ground verified' },
  { key: 'outriggers_installed', label: 'Outriggers installed' },
  { key: 'outrigger_mats', label: 'Outrigger mats' },
  { key: 'exclusion_zone', label: 'Exclusion zone' },
  { key: 'communication_system', label: 'Communication system' },
  { key: 'weather_checked', label: 'Weather checked' },
  { key: 'wind_checked', label: 'Wind checked' },
  { key: 'simops_checked', label: 'SIMOPS checked' },
  { key: 'emergency_arrangements', label: 'Emergency arrangements' }
];

export const CRITICAL_LIFT_QUESTIONS: { key: string; label: string }[] = [
  { key: 'tandem_lift', label: 'Tandem lift?' },
  { key: 'personnel_lifting', label: 'General lifting?' },
  { key: 'near_live_electrical', label: 'Near live electrical equipment?' },
  { key: 'restricted_access', label: 'Restricted access?' },
  { key: 'complex_unusual_load', label: 'Complex/unusual load?' },
  { key: 'critical_equipment', label: 'Critical equipment?' },
  { key: 'above_occupied_area', label: 'Above occupied area?' },
  { key: 'project_defined_critical', label: 'Project-defined critical lift?' }
];

export const GENERAL_WORK_CONTROLS: ControlDef[] = [
  { key: 'risk_assessment_approved', label: 'Risk assessment submitted and approved' },
  { key: 'method_statement_approved', label: 'Method statement submitted and approved' },
  { key: 'hazardous_materials_notes', label: 'Hazardous materials/transfer notes reviewed' },
  { key: 'environmental_aspects_assessed', label: 'Environmental aspects assessment completed' },
  { key: 'department_managers_informed', label: 'Department managers informed of the work' },
  { key: 'site_specific_hazards_identified', label: 'Site-specific hazards identified to the contractor' },
  { key: 'no_deviations_from_assessment', label: 'No unapproved deviations from method/risk assessment' },
  { key: 'personnel_site_induction', label: 'Personnel received site induction and EHS handout' }
];

export const WORK_AT_HEIGHT_CONTROLS: ControlDef[] = [
  { key: 'work_plan_in_place', label: 'There is a work plan in place for the working at height' },
  { key: 'fall_arrest_equipment_inspected', label: 'All fall restraint/arrest equipment has valid inspection, tag and check prior to use' },
  { key: 'guardrails_edge_protection', label: 'Guardrails/edge protection installed where applicable' },
  { key: 'ladders_scaffold_inspected', label: 'Ladders/scaffold inspected and tagged' },
  { key: 'barricades_warning_signs', label: 'Barricades and warning signs erected below the work area' },
  { key: 'weather_conditions_checked', label: 'Weather conditions checked and acceptable' },
  { key: 'rescue_plan_in_place', label: 'Rescue plan in place for fall arrest scenario' },
  { key: 'competent_person_assigned', label: 'Competent person assigned to supervise the work' },
  { key: 'ppe_harness_inspected', label: 'PPE (harness, lanyard) inspected before use' }
];

export const CONTROLS_BY_TYPE: Record<'hot_work' | 'cold_work' | 'lifting' | 'general_work' | 'work_at_height', ControlDef[]> = {
  hot_work: HOT_WORK_CONTROLS,
  cold_work: COLD_WORK_CONTROLS,
  lifting: LIFTING_CONTROLS,
  general_work: GENERAL_WORK_CONTROLS,
  work_at_height: WORK_AT_HEIGHT_CONTROLS
};

// =========================================================================
// Template alignment — content below is lifted directly from the four
// reference PTW templates (Hot Work, Lifting Operations, Working at Height,
// generic PTW) so the app's forms/PDFs carry the same hazard identification,
// pre-authorisation gate, standards references, and emergency guidance that
// the paper/Word versions did.
// =========================================================================

export type PermitTypeKey = 'hot_work' | 'cold_work' | 'lifting' | 'general_work' | 'work_at_height';

// ---------------------------------------------------------------------
// Identified Hazards — distinct from Safety Controls: this documents what
// could hurt someone, not what mitigates it.
// ---------------------------------------------------------------------
export const HOT_WORK_HAZARDS: ControlDef[] = [
  { key: 'fire_ignition_combustibles', label: 'Fire / ignition of nearby combustible materials' },
  { key: 'explosion_flammable_gases', label: 'Explosion from flammable gases or vapours' },
  { key: 'burns_hot_surfaces_sparks', label: 'Burns from hot surfaces, sparks, and spatter' },
  { key: 'inhalation_fumes', label: 'Inhalation of welding fumes and toxic gases' },
  { key: 'eye_injury_uv', label: 'Eye injury from UV radiation / arc flash' },
  { key: 'uncontrolled_heat_spread', label: 'Uncontrolled heat spread causing structural damage' }
];

export const LIFTING_HAZARDS: ControlDef[] = [
  { key: 'load_falling', label: 'Load falling from height — crush or fatal injury to persons below' },
  { key: 'structural_failure_equipment', label: 'Structural failure of lifting equipment or accessories' },
  { key: 'crane_overturning', label: 'Crane or equipment overturning — ground conditions or overload' },
  { key: 'collision_overhead_lines', label: 'Collision with overhead power lines or nearby structures' },
  { key: 'persons_in_load_path', label: 'Persons entering the load path or exclusion zone during lift' },
  { key: 'adverse_weather_wind', label: 'Adverse weather — wind gusts causing loss of load control' }
];

export const WORK_AT_HEIGHT_HAZARDS: ControlDef[] = [
  { key: 'falls_from_height', label: 'Falls from height — serious injury or death' },
  { key: 'falling_objects', label: 'Falling objects striking personnel below' },
  { key: 'platform_collapse', label: 'Collapse or instability of working platform or scaffold' },
  { key: 'adverse_weather', label: 'Adverse weather — wind, rain, or ice increasing fall risk' },
  { key: 'fall_protection_failure', label: 'Failure of personal fall protection equipment' },
  { key: 'manual_handling_fatigue', label: 'Manual handling fatigue and overreaching at height' }
];

export const COLD_WORK_HAZARDS: ControlDef[] = [
  { key: 'stored_energy_release', label: 'Unexpected release of stored electrical/mechanical/pressure energy' },
  { key: 'confined_space_atmosphere', label: 'Hazardous or oxygen-deficient atmosphere (confined space)' },
  { key: 'falls_same_level', label: 'Slips, trips, and falls from work-area obstructions' },
  { key: 'chemical_exposure_hazard', label: 'Exposure to chemicals, dust, or hazardous substances' },
  { key: 'struck_by_moving_plant', label: 'Struck by moving plant, vehicles, or equipment' },
  { key: 'simops_conflict', label: 'Conflict with simultaneous operations (SIMOPS) nearby' }
];

export const GENERAL_WORK_HAZARDS: ControlDef[] = [
  { key: 'uncontrolled_scope_deviation', label: 'Work proceeding outside the approved method statement/risk assessment' },
  { key: 'environmental_release', label: 'Environmental release (spill, dust, noise) affecting site or public' },
  { key: 'struck_by_moving_plant_gw', label: 'Struck by moving plant, vehicles, or equipment' },
  { key: 'uninducted_personnel', label: 'Personnel working without site-specific induction/briefing' },
  { key: 'poor_housekeeping', label: 'Poor housekeeping creating slip/trip/fire hazards' }
];

export const HAZARDS_BY_TYPE: Record<PermitTypeKey, ControlDef[]> = {
  hot_work: HOT_WORK_HAZARDS,
  cold_work: COLD_WORK_HAZARDS,
  lifting: LIFTING_HAZARDS,
  general_work: GENERAL_WORK_HAZARDS,
  work_at_height: WORK_AT_HEIGHT_HAZARDS
};

// ---------------------------------------------------------------------
// Pre-Authorisation Checks — the final go/no-go gate immediately before
// approval, kept separate from the working "Safety Controls" checklist.
// Seeded into permit_controls with is_pre_authorization = true; approval
// is blocked until every item here is checked (mirrors the crane-checklist
// "critical item" gating pattern already used elsewhere in the app).
// ---------------------------------------------------------------------
export const HOT_WORK_PRE_AUTH: ControlDef[] = [
  { key: 'preauth_area_cleared_3m', label: 'Area cleared of combustibles within 3 metres' },
  { key: 'preauth_extinguisher_ready', label: 'Fire extinguisher present, charged, and accessible' },
  { key: 'preauth_fire_watch_arranged', label: 'Fire watch arranged — duration + 60 min post-completion' },
  { key: 'preauth_area_inspected', label: 'Hot work area inspected and approved by supervisor' },
  { key: 'preauth_ignition_sources_isolated', label: 'Gas / fuel / ignition sources isolated or removed' },
  { key: 'preauth_emergency_comms', label: 'Emergency procedures communicated to all personnel' }
];

export const LIFTING_PRE_AUTH: ControlDef[] = [
  { key: 'preauth_lift_plan_signed', label: 'Lift plan reviewed and signed by Appointed Person' },
  { key: 'preauth_loler_certs_onsite', label: 'Lifting equipment and all accessories checked — LOLER certificates on site' },
  { key: 'preauth_ground_outriggers', label: 'Ground bearing capacity assessed — outrigger mats correctly positioned' },
  { key: 'preauth_exclusion_zone_clear', label: 'Exclusion zone established and all non-essential persons clear of lift zone' },
  { key: 'preauth_wind_within_limit', label: 'Wind speed checked and confirmed within equipment rated operating limit' },
  { key: 'preauth_banksman_comms', label: 'Banksman in position; two-way communication with operator confirmed' }
];

export const WORK_AT_HEIGHT_PRE_AUTH: ControlDef[] = [
  { key: 'preauth_platform_signed_off', label: 'Platform / scaffold inspected and signed off — inspection sheet on site' },
  { key: 'preauth_rescue_plan_documented', label: 'Rescue plan documented and rescue team identified' },
  { key: 'preauth_fall_protection_fit_checked', label: 'Personal fall protection inspected and fit-checked' },
  { key: 'preauth_anchor_points_verified', label: 'Anchor points verified and load-rated for intended use' },
  { key: 'preauth_weather_acceptable', label: 'Weather assessed and confirmed acceptable for work' },
  { key: 'preauth_exclusion_zone_wah', label: 'Exclusion zone established and communicated to all personnel' }
];

// Generic PTW template's "Controls in place" gate, applied to Cold Work and
// General Work — the two permit types without a dedicated prefilled template.
export const GENERIC_PRE_AUTH: ControlDef[] = [
  { key: 'preauth_isolation_confirmed', label: 'Isolation / Lock-out / Tag-out (LOTO) confirmed where applicable' },
  { key: 'preauth_standby_fire_watch', label: 'Standby person / fire watch assigned where required' },
  { key: 'preauth_rescue_emergency_plan', label: 'Rescue / emergency plan in place' },
  { key: 'preauth_barricades_signage', label: 'Barricades / signage erected' },
  { key: 'preauth_comms_tested', label: 'Communication system tested' },
  { key: 'preauth_equipment_inspected_tagged', label: 'Equipment inspected and tagged' },
  { key: 'preauth_work_area_cleared', label: 'Work area cleaned / cleared and ready' }
];

export const PRE_AUTH_BY_TYPE: Record<PermitTypeKey, ControlDef[]> = {
  hot_work: HOT_WORK_PRE_AUTH,
  cold_work: GENERIC_PRE_AUTH,
  lifting: LIFTING_PRE_AUTH,
  general_work: GENERIC_PRE_AUTH,
  work_at_height: WORK_AT_HEIGHT_PRE_AUTH
};

// ---------------------------------------------------------------------
// Default reference text — prefilled on the create form when a permit type
// is chosen, always editable afterwards. Copied verbatim from the templates.
// ---------------------------------------------------------------------
export const DEFAULT_STANDARDS_BY_TYPE: Record<PermitTypeKey, string> = {
  hot_work: 'DSEAR 2002; Regulatory Reform (Fire Safety) Order 2005; BS 6266:2011',
  cold_work: 'Permit to Work (PTW) general procedure; site HSE management system',
  lifting: 'Lifting Operations and Lifting Equipment Regulations (LOLER) 1998; PUWER 1998; BS 7121 (Safe Use of Cranes); LEEA Standards',
  general_work: 'Permit to Work (PTW) general procedure; site HSE management system',
  work_at_height: 'Work at Height Regulations 2005; PUWER 1998; BS EN 363:2008; HSE INDG401'
};

export const DEFAULT_EQUIPMENT_BY_TYPE: Record<PermitTypeKey, string> = {
  hot_work: 'Welding machine / oxy-acetylene torch, angle grinder, flashback arrestors, fire-resistant blankets, dry powder & CO₂ extinguisher, gas detector (LEL/O₂)',
  cold_work: 'Task-specific tools and equipment; isolation/LOTO devices; barricades and signage as required',
  lifting: 'Crane / MEWP / telehandler / chain hoist; certified lifting accessories (slings, shackles, hooks, spreader beams); load chart; outrigger mats; banksman signalling equipment; anemometer; exclusion zone barriers and signage',
  general_work: 'Task-specific tools and equipment as identified in the method statement',
  work_at_height: 'Mobile elevated work platform (MEWP) / scaffold / ladder, full-body harness and energy-absorbing lanyard, certified anchor points, toe boards, debris netting, rescue kit'
};

export const DEFAULT_PPE_BY_TYPE: Record<PermitTypeKey, string> = {
  hot_work: 'Welding helmet with ADF; FFP3 respirator; chrome leather gauntlet gloves; flame-resistant overalls; welding apron; steel toe-cap boots',
  cold_work: 'Hard hat; high-visibility vest; safety footwear; gloves; safety glasses appropriate to task',
  lifting: 'Hard hat (EN 397); high-visibility vest; safety footwear; gloves; banksman hi-viz tabard; safety glasses if load aloft near face',
  general_work: 'Hard hat; high-visibility vest; safety footwear; gloves appropriate to task',
  work_at_height: 'Full-body harness (EN 361) and energy-absorbing lanyard; hard hat (EN 397); safety footwear; high-visibility vest; gloves appropriate to task'
};

export const DEFAULT_EMERGENCY_PROCEDURE_BY_TYPE: Record<PermitTypeKey, string> = {
  hot_work: 'In the event of fire: raise the alarm immediately. Evacuate the area and call the site emergency number. Do not attempt to fight fire unless trained and safe to do so. Assemble at the designated muster point and notify the permit authoriser.',
  cold_work: 'In the event of an incident: stop work, make the area safe, raise the alarm and call the site emergency number. Do not disturb the scene. Notify the permit authoriser immediately.',
  lifting: 'In the event of a dropped load or equipment failure: clear the area immediately and call the site emergency number. Do not approach the load, equipment, or any person in contact with it. Notify the Appointed Person and permit authoriser immediately. Preserve the scene — do not move equipment or accessories until the incident investigation is complete.',
  general_work: 'In the event of an incident: stop work, make the area safe, raise the alarm and call the site emergency number. Notify the permit authoriser immediately.',
  work_at_height: 'In the event of a fall: call the site emergency number immediately. Do not move the casualty unless in immediate danger. Apply first aid if trained. Clear the area of unauthorised persons. Do not disturb equipment or the scene. Notify the responsible person and rescue team immediately.'
};
