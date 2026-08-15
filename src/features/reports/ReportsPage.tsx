import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { EXPORT_PRESETS } from './exportPresets';
import type { PermitStatus, PermitType } from '@/types';

interface Kpis {
  total: number; active: number; closed: number; expired: number; suspended: number;
  rejected: number; criticalLifts: number; complianceRate: number;
}

const TYPE_PRESETS: { label: string; type: PermitType }[] = [
  { label: 'Hot Work Register', type: 'hot_work' },
  { label: 'Cold Work Register', type: 'cold_work' },
  { label: 'Lifting Register', type: 'lifting' }
];

export default function ReportsPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportingLabel, setExportingLabel] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const queries = await Promise.all([
        supabase.from('permits').select('id', { count: 'exact', head: true }),
        supabase.from('permits').select('id', { count: 'exact', head: true }).in('status', ['active', 'expiring_soon']),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('is_critical_lift', true)
      ]);
      const err = queries.find(q => q.error);
      if (err?.error) { setError(err.error.message); return; }
      const [total, active, closed, expired, suspended, rejected, criticalLifts] = queries.map(q => q.count ?? 0);
      const complianceRate = total > 0 ? Math.round(((total - rejected - expired) / total) * 100) : 0;
      setKpis({ total, active, closed, expired, suspended, rejected, criticalLifts, complianceRate });
    }
    load().catch(e => setError(e instanceof Error ? e.message : 'Failed to load KPIs.'));
  }, []);

  async function exportPreset(label: string, statuses?: PermitStatus[], type?: PermitType) {
    setExportingLabel(label);
    setError(null);
    try {
      const { exportPermitsToExcel } = await import('./excelExport');
      if (type) {
        const { fetchPermits } = await import('@/features/permits/permitService');
        const all = await fetchPermits(statuses ? { status: statuses } : {});
        const filtered = all.filter(p => p.permit_type === type);
        const XLSX = await import('xlsx');
        const rows = filtered.map(p => ({
          'Permit Number': p.permit_number, Location: p.location, Activity: p.activity,
          Supervisor: p.supervisor_name ?? '', Status: p.status
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Register');
        XLSX.writeFile(wb, `${label.replace(/\s+/g, '-')}.xlsx`);
      } else {
        await exportPermitsToExcel({ statuses, label });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setExportingLabel(null);
    }
  }

  const kpiCards = kpis ? [
    { label: 'Total Permits', value: kpis.total, color: 'text-navy' },
    { label: 'Active', value: kpis.active, color: 'text-success' },
    { label: 'Closed', value: kpis.closed, color: 'text-slate-600' },
    { label: 'Expired', value: kpis.expired, color: 'text-danger' },
    { label: 'Suspended', value: kpis.suspended, color: 'text-slate-600' },
    { label: 'Rejected', value: kpis.rejected, color: 'text-danger' },
    { label: 'Critical Lifts', value: kpis.criticalLifts, color: 'text-danger' },
    { label: 'Compliance Rate', value: `${kpis.complianceRate}%`, color: 'text-success' }
  ] : [];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Reports</h1>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.length === 0 && !error && <div className="col-span-2 md:col-span-4 text-slate-400 text-sm">Loading…</div>}
        {kpiCards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Registers & Exports</h2>
        {TYPE_PRESETS.map(p => (
          <button key={p.label} onClick={() => exportPreset(p.label, undefined, p.type)} disabled={exportingLabel === p.label}
            className="w-full text-left text-sm bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2.5 font-medium text-slate-700 disabled:opacity-60">
            {exportingLabel === p.label ? 'Exporting…' : `📊 ${p.label}`}
          </button>
        ))}
        {EXPORT_PRESETS.map(p => (
          <button key={p.label} onClick={() => exportPreset(p.label, p.statuses)} disabled={exportingLabel === p.label}
            className="w-full text-left text-sm bg-slate-50 hover:bg-slate-100 rounded-lg px-3 py-2.5 font-medium text-slate-700 disabled:opacity-60">
            {exportingLabel === p.label ? 'Exporting…' : `📊 ${p.label} Report`}
          </button>
        ))}
      </div>
    </div>
  );
}
