import { describe, it, expect } from 'vitest';
import { allPreAuthorizationChecked, listIncompletePreAuthorizationLabels } from '@/features/permits/permitService';

type Row = { is_pre_authorization: boolean; is_checked: boolean; control_label: string };

const ROWS: Row[] = [
  { is_pre_authorization: false, is_checked: false, control_label: 'Fire extinguisher available' },
  { is_pre_authorization: true, is_checked: true, control_label: 'Fire watch arranged' },
  { is_pre_authorization: true, is_checked: false, control_label: 'Area cleared of combustibles within 3 metres' }
];

describe('pre-authorisation gate (blocks approval until every pre-auth item is checked)', () => {
  it('is not satisfied while a pre-authorisation item is unchecked', () => {
    expect(allPreAuthorizationChecked(ROWS)).toBe(false);
  });

  it('lists only the unchecked pre-authorisation items, ignoring regular controls', () => {
    const missing = listIncompletePreAuthorizationLabels(ROWS);
    expect(missing).toEqual(['Area cleared of combustibles within 3 metres']);
  });

  it('is satisfied once every pre-authorisation item is checked, regardless of regular controls', () => {
    const rows = ROWS.map(r => r.is_pre_authorization ? { ...r, is_checked: true } : r);
    expect(allPreAuthorizationChecked(rows)).toBe(true);
    expect(listIncompletePreAuthorizationLabels(rows)).toEqual([]);
  });

  it('is vacuously satisfied for a permit type with no pre-authorisation items seeded', () => {
    expect(allPreAuthorizationChecked([])).toBe(true);
  });
});
