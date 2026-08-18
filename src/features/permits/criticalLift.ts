import { supabase } from '@/lib/supabase';

export function computeCriticalLift(loadWeightTon: number | undefined, capacityTon: number | undefined, manualAnswers?: Record<string, boolean>): boolean {
  const manualFlag = manualAnswers ? Object.values(manualAnswers).some(Boolean) : false;
  const overThreshold = !!(loadWeightTon && capacityTon && capacityTon > 0 && loadWeightTon / capacityTon > 0.75);
  return manualFlag || overThreshold;
}

// Only ever ESCALATES a permit to critical — never silently un-flags one,
// since that would be a safety downgrade nobody explicitly reviewed.
export async function escalateToCriticalIfNeeded(permitId: string, isCritical: boolean) {
  if (!isCritical) return;
  const { error } = await supabase.from('permits').update({ is_critical_lift: true }).eq('id', permitId);
  if (error) console.error('Could not update critical-lift flag (non-blocking):', error.message);
}
