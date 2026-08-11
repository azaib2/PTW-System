export interface ChecklistItemDef { category: string; key: string; label: string; critical?: boolean; }

// Crane Checklist — items marked critical=true block clearance on FAIL (section 20)
export const CRANE_CHECKLIST_ITEMS: ChecklistItemDef[] = [
  // Documentation
  { category: 'Documentation', key: 'crane_certificate_valid', label: 'Crane certificate valid', critical: true },
  { category: 'Documentation', key: 'inspection_certificate_valid', label: 'Inspection certificate valid', critical: true },
  { category: 'Documentation', key: 'operator_competency_valid', label: 'Operator competency valid', critical: true },
  { category: 'Documentation', key: 'load_chart_available', label: 'Load chart available', critical: true },
  { category: 'Documentation', key: 'manufacturer_manual_available', label: 'Manufacturer manual available' },
  { category: 'Documentation', key: 'maintenance_records_available', label: 'Maintenance records available' },
  // Condition
  { category: 'Crane Condition', key: 'engine', label: 'Engine' },
  { category: 'Crane Condition', key: 'hydraulic_system', label: 'Hydraulic system' },
  { category: 'Crane Condition', key: 'hydraulic_hoses', label: 'Hydraulic hoses' },
  { category: 'Crane Condition', key: 'brakes', label: 'Brakes', critical: true },
  { category: 'Crane Condition', key: 'steering', label: 'Steering' },
  { category: 'Crane Condition', key: 'tires_tracks', label: 'Tires/tracks' },
  { category: 'Crane Condition', key: 'lights', label: 'Lights' },
  { category: 'Crane Condition', key: 'horn', label: 'Horn' },
  { category: 'Crane Condition', key: 'reverse_alarm', label: 'Reverse alarm' },
  { category: 'Crane Condition', key: 'mirrors_camera', label: 'Mirrors/camera' },
  { category: 'Crane Condition', key: 'emergency_stop', label: 'Emergency stop', critical: true },
  { category: 'Crane Condition', key: 'seat_belt', label: 'Seat belt' },
  // Lifting components
  { category: 'Lifting Components', key: 'hook', label: 'Hook', critical: true },
  { category: 'Lifting Components', key: 'hook_safety_latch', label: 'Hook safety latch', critical: true },
  { category: 'Lifting Components', key: 'wire_rope', label: 'Wire rope', critical: true },
  { category: 'Lifting Components', key: 'sheaves', label: 'Sheaves' },
  { category: 'Lifting Components', key: 'boom', label: 'Boom', critical: true },
  { category: 'Lifting Components', key: 'boom_extension', label: 'Boom extension' },
  { category: 'Lifting Components', key: 'limit_switches', label: 'Limit switches', critical: true },
  { category: 'Lifting Components', key: 'anti_two_block', label: 'Anti-two-block', critical: true },
  { category: 'Lifting Components', key: 'rated_capacity_indicator', label: 'Rated capacity indicator', critical: true },
  { category: 'Lifting Components', key: 'load_moment_indicator', label: 'Load moment indicator', critical: true },
  // Outriggers
  { category: 'Outriggers', key: 'operational', label: 'Operational', critical: true },
  { category: 'Outriggers', key: 'pads_available', label: 'Pads available' },
  { category: 'Outriggers', key: 'pads_suitable', label: 'Pads suitable' },
  { category: 'Outriggers', key: 'correct_deployment', label: 'Correct deployment', critical: true },
  { category: 'Outriggers', key: 'crane_level_verified', label: 'Crane level verified', critical: true },
  // Safety
  { category: 'Safety', key: 'fire_extinguisher', label: 'Fire extinguisher' },
  { category: 'Safety', key: 'emergency_equipment', label: 'Emergency equipment' },
  { category: 'Safety', key: 'communication_equipment', label: 'Communication equipment', critical: true },
  { category: 'Safety', key: 'warning_signs', label: 'Warning signs' }
];

export const SITE_PREPARATION_ITEMS: ChecklistItemDef[] = [
  { category: 'Access', key: 'access_route_inspected', label: 'Crane access route inspected' },
  { category: 'Access', key: 'access_width_sufficient', label: 'Access width sufficient' },
  { category: 'Access', key: 'turning_radius_sufficient', label: 'Turning radius sufficient' },
  { category: 'Access', key: 'overhead_clearance_checked', label: 'Overhead clearance checked', critical: true },
  { category: 'Access', key: 'obstructions_removed', label: 'Obstructions removed' },
  { category: 'Access', key: 'traffic_management', label: 'Traffic management established' },
  { category: 'Ground', key: 'ground_stable', label: 'Ground stable', critical: true },
  { category: 'Ground', key: 'ground_bearing_verified', label: 'Ground bearing verified where required', critical: true },
  { category: 'Ground', key: 'underground_services_identified', label: 'Underground services identified', critical: true },
  { category: 'Ground', key: 'excavations_identified', label: 'Excavations identified' },
  { category: 'Ground', key: 'voids_protected', label: 'Voids/openings protected' },
  { category: 'Ground', key: 'manholes_checked', label: 'Manholes/drainage checked' },
  { category: 'Ground', key: 'outrigger_mats_available', label: 'Outrigger mats available' },
  { category: 'Crane Setup', key: 'correct_crane_position', label: 'Correct crane position' },
  { category: 'Crane Setup', key: 'crane_level', label: 'Crane level', critical: true },
  { category: 'Crane Setup', key: 'outriggers_deployed', label: 'Outriggers correctly deployed', critical: true },
  { category: 'Crane Setup', key: 'mats_installed', label: 'Mats installed' },
  { category: 'Crane Setup', key: 'excavation_clearance', label: 'Excavation clearance' },
  { category: 'Crane Setup', key: 'structure_clearance', label: 'Structure clearance' },
  { category: 'Lifting Zone', key: 'exclusion_zone_established', label: 'Exclusion zone established', critical: true },
  { category: 'Lifting Zone', key: 'barricades_installed', label: 'Barricades installed', critical: true },
  { category: 'Lifting Zone', key: 'warning_signs_installed', label: 'Warning signs installed' },
  { category: 'Lifting Zone', key: 'unauthorized_access_controlled', label: 'Unauthorized access controlled' },
  { category: 'Lifting Zone', key: 'suspended_load_zone_controlled', label: 'Suspended-load zone controlled' },
  { category: 'Electrical', key: 'power_lines_identified', label: 'Power lines identified' },
  { category: 'Electrical', key: 'clearance_verified', label: 'Required clearance verified', critical: true },
  { category: 'Electrical', key: 'isolation_obtained', label: 'Isolation obtained where required' },
  { category: 'Electrical', key: 'spotter_assigned', label: 'Spotter assigned where required' },
  { category: 'Environment', key: 'wind_checked', label: 'Wind checked', critical: true },
  { category: 'Environment', key: 'weather_acceptable', label: 'Weather acceptable', critical: true },
  { category: 'Environment', key: 'visibility_adequate', label: 'Visibility adequate' },
  { category: 'Environment', key: 'lighting_adequate', label: 'Lighting adequate' },
  { category: 'Environment', key: 'dust_controlled', label: 'Dust controlled' },
  { category: 'SIMOPS', key: 'other_lifting_checked', label: 'Other lifting operations checked' },
  { category: 'SIMOPS', key: 'vehicle_movement_controlled', label: 'Vehicle movement controlled' },
  { category: 'SIMOPS', key: 'work_at_height_checked', label: 'Work at height checked' },
  { category: 'SIMOPS', key: 'hot_work_checked', label: 'Hot work checked' },
  { category: 'SIMOPS', key: 'scaffolding_checked', label: 'Scaffolding checked' },
  { category: 'SIMOPS', key: 'personnel_movement_controlled', label: 'Personnel movement controlled' }
];

export const RIGGING_ITEMS: ChecklistItemDef[] = [
  { category: 'Rigging', key: 'slings', label: 'Slings', critical: true },
  { category: 'Rigging', key: 'shackles', label: 'Shackles', critical: true },
  { category: 'Rigging', key: 'hooks', label: 'Hooks', critical: true },
  { category: 'Rigging', key: 'spreader_beam', label: 'Spreader beam' },
  { category: 'Rigging', key: 'lifting_beam', label: 'Lifting beam' },
  { category: 'Rigging', key: 'wll_swl', label: 'WLL/SWL confirmed', critical: true },
  { category: 'Rigging', key: 'inspection_tags', label: 'Inspection tags present', critical: true },
  { category: 'Rigging', key: 'no_damage', label: 'No damage found', critical: true },
  { category: 'Rigging', key: 'correct_configuration', label: 'Correct configuration' },
  { category: 'Rigging', key: 'sling_angle', label: 'Sling angle correct', critical: true },
  { category: 'Rigging', key: 'connection_points', label: 'Connection points secure' },
  { category: 'Rigging', key: 'safety_latches', label: 'Safety latches functional', critical: true }
];

export const DEFAULT_LIFT_SEQUENCE = [
  'Crane setup', 'Barricade area', 'Rigging', 'Rigging inspection', 'Trial lift',
  'Main lift', 'Positioning', 'De-rigging', 'Crane demobilization'
];
