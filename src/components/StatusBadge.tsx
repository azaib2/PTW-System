import { STATUS_COLOR, type PermitStatus } from '@/types';

export default function StatusBadge({ status }: { status: PermitStatus }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${STATUS_COLOR[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
