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
