import type { PermitStatus } from '@/types';

// Pre-defined export presets matching section 40
export const EXPORT_PRESETS: { label: string; statuses?: PermitStatus[] }[] = [
  { label: 'All Permits' },
  { label: 'Active', statuses: ['active', 'expiring_soon'] },
  { label: 'Expired', statuses: ['expired'] },
  { label: 'Suspended', statuses: ['suspended'] },
  { label: 'Closed', statuses: ['closed'] },
  { label: 'Rejected', statuses: ['rejected'] }
];
