import type { PermitStatus } from '@/types';

// The database's stored status is only refreshed by a scheduled job
// (refresh_permit_health(), typically every 15 minutes via pg_cron). This
// computes what the status SHOULD be right now for display purposes only —
// it never writes to the database, so it can't be used to bypass the real
// expiry enforcement, only to avoid showing a stale "ACTIVE" badge to a
// person looking at the screen between cron runs.
export function getEffectiveStatus(status: PermitStatus, expiryTime: string | null): PermitStatus {
  if (!expiryTime) return status;
  if (status !== 'active' && status !== 'approved' && status !== 'expiring_soon') return status;

  const expiry = new Date(expiryTime).getTime();
  const now = Date.now();
  if (now >= expiry) return 'expired';
  if (now >= expiry - 60 * 60 * 1000) return 'expiring_soon';
  return status;
}
