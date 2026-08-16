import { describe, it, expect } from 'vitest';
import { findMissingMandatoryFields } from '@/features/permits/permitService';
import type { Permit } from '@/types';

const BASE: Partial<Permit> = {
  location: 'Laydown Area 02',
  activity: 'Steel beam lifting',
  supervisor_name: 'A. Supervisor',
  start_time: '2026-08-16T08:00:00Z',
  expiry_time: '2026-08-16T16:00:00Z'
};

describe('findMissingMandatoryFields (blocks submit/approve on incomplete permits)', () => {
  it('returns empty array when all mandatory fields are present', () => {
    expect(findMissingMandatoryFields(BASE)).toEqual([]);
  });

  it('flags a missing location', () => {
    const p = { ...BASE, location: undefined };
    expect(findMissingMandatoryFields(p)).toContain('Location');
  });

  it('flags a missing supervisor', () => {
    const p = { ...BASE, supervisor_name: undefined };
    expect(findMissingMandatoryFields(p)).toContain('Supervisor');
  });

  it('flags missing start and expiry times together', () => {
    const p = { ...BASE, start_time: undefined, expiry_time: undefined };
    const missing = findMissingMandatoryFields(p);
    expect(missing).toContain('Start time');
    expect(missing).toContain('Expiry time');
  });

  it('flags every missing field on a bare empty permit', () => {
    const missing = findMissingMandatoryFields({});
    expect(missing.length).toBe(5);
  });
});
