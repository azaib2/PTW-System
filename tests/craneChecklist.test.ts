import { describe, it, expect } from 'vitest';
import { computeCraneResult } from '@/features/lifting/liftingService';

describe('computeCraneResult (crane checklist critical-item gate)', () => {
  it('returns pass when every item is checked', () => {
    const items = [
      { is_critical: true, is_checked: true },
      { is_critical: false, is_checked: true }
    ];
    expect(computeCraneResult(items)).toBe('pass');
  });

  it('returns fail when ANY critical item is unchecked, even if others pass', () => {
    const items = [
      { is_critical: true, is_checked: false },
      { is_critical: true, is_checked: true },
      { is_critical: false, is_checked: true }
    ];
    expect(computeCraneResult(items)).toBe('fail');
  });

  it('returns pass_with_action when only non-critical items are unchecked', () => {
    const items = [
      { is_critical: true, is_checked: true },
      { is_critical: false, is_checked: false }
    ];
    expect(computeCraneResult(items)).toBe('pass_with_action');
  });

  it('fail takes priority over pass_with_action when both conditions are present', () => {
    const items = [
      { is_critical: true, is_checked: false },
      { is_critical: false, is_checked: false }
    ];
    expect(computeCraneResult(items)).toBe('fail');
  });

  it('an empty checklist is treated as pass — caller must not invoke before items are seeded', () => {
    expect(computeCraneResult([])).toBe('pass');
  });
});
