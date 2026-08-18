import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fetchPermits } from './permitService';
import StatusBadge from '@/components/StatusBadge';
import { PERMIT_TYPE_LABEL } from '@/types';
import type { Permit, PermitStatus } from '@/types';

export default function PermitListPage({ title, statuses }: { title: string; statuses: PermitStatus[] }) {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchPermits({ status: statuses })
      .then(setPermits)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load permits.'))
      .finally(() => setLoading(false));
  }, [statuses]);

  async function handleExport() {
    setExporting(true);
    try {
      const { exportPermitsToExcel } = await import('@/features/reports/excelExport');
      await exportPermitsToExcel({ statuses, label: title.replace(/\s+/g, '-') });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-navy">{title}</h1>
        <span className="text-xs text-slate-400">{permits.length} record{permits.length === 1 ? '' : 's'}</span>
      </div>

      <button onClick={handleExport} disabled={exporting || permits.length === 0}
        className="w-full text-sm bg-slate-50 hover:bg-slate-100 rounded-lg py-2.5 font-medium text-slate-700 disabled:opacity-60">
        {exporting ? 'Exporting…' : '📊 Export to Excel'}
      </button>


      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
      {loading && <div className="text-slate-400 text-sm">Loading…</div>}
      {!loading && permits.length === 0 && !error && (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-sm text-slate-400">No permits found.</div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {permits.map(p => (
          <Link key={p.id} to={`/permits/${p.id}`} className="block bg-white rounded-xl shadow-sm p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-navy text-sm">{p.permit_number}</span>
              <StatusBadge status={p.status} />
            </div>
            <div className="text-sm text-slate-600">{p.activity}</div>
            <div className="text-xs text-slate-400 mt-1">{p.location} · {p.expiry_time ? format(new Date(p.expiry_time), 'dd MMM HH:mm') : 'no expiry set'}</div>
            {p.is_critical_lift && <div className="text-xs text-danger font-semibold mt-1">🔴 CRITICAL LIFT</div>}
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Permit #</th>
              <th className="text-left px-4 py-2.5">Type</th>
              <th className="text-left px-4 py-2.5">Activity</th>
              <th className="text-left px-4 py-2.5">Location</th>
              <th className="text-left px-4 py-2.5">Expiry</th>
              <th className="text-left px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {permits.map(p => (
              <tr key={p.id} onClick={() => window.location.assign(`/permits/${p.id}`)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                <td className="px-4 py-2.5 font-medium text-navy">{p.permit_number}</td>
                <td className="px-4 py-2.5">{PERMIT_TYPE_LABEL[p.permit_type]}</td>
                <td className="px-4 py-2.5">{p.activity}</td>
                <td className="px-4 py-2.5">{p.location}</td>
                <td className="px-4 py-2.5">{p.expiry_time ? format(new Date(p.expiry_time), 'dd MMM HH:mm') : '—'}</td>
                <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
