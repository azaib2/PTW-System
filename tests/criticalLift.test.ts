import { describe, it, expect } from 'vitest';
import { computeCriticalLift } from '@/features/permits/criticalLift';

describe('computeCriticalLift (75% capacity threshold + manual flags)', () => {
  it('is critical when load exceeds 75% of rated capacity', () => {
    expect(computeCriticalLift(76, 100)).toBe(true);
  });

  it('is NOT critical at exactly 75% (threshold is strictly greater than)', () => {
    expect(computeCriticalLift(75, 100)).toBe(false);
  });

  it('is not critical when well under capacity and no manual flags', () => {
    expect(computeCriticalLift(40, 100)).toBe(false);
  });

  it('is critical if any manual critical-lift answer is true, regardless of load ratio', () => {
    expect(computeCriticalLift(10, 100, { tandem_lift: true })).toBe(true);
  });

  it('is not critical when manual answers are all false and load is low', () => {
    expect(computeCriticalLift(10, 100, { tandem_lift: false, personnel_lifting: false })).toBe(false);
  });

  it('handles missing load/capacity values without throwing', () => {
    expect(computeCriticalLift(undefined, undefined)).toBe(false);
    expect(computeCriticalLift(50, undefined)).toBe(false);
    expect(computeCriticalLift(undefined, 100)).toBe(false);
  });
});
