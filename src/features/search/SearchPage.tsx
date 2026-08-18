import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import StatusBadge from '@/components/StatusBadge';
import { searchPermits, type SearchFilters } from './searchService';
import type { Permit } from '@/types';

export default function SearchPage() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<Permit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      setResults(await searchPermits(filters));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:border-brand focus:ring-1 focus:ring-brand';
  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Search</h1>

      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelClass}>Permit Number</label>
            <input className={inputClass} value={filters.permitNumber ?? ''} onChange={e => setFilters(f => ({ ...f, permitNumber: e.target.value }))} /></div>
          <div><label className={labelClass}>Location</label>
            <input className={inputClass} value={filters.location ?? ''} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} /></div>
          <div><label className={labelClass}>Supervisor</label>
            <input className={inputClass} value={filters.supervisor ?? ''} onChange={e => setFilters(f => ({ ...f, supervisor: e.target.value }))} /></div>
          <div><label className={labelClass}>Crane Type/ID</label>
            <input className={inputClass} value={filters.craneId ?? ''} onChange={e => setFilters(f => ({ ...f, craneId: e.target.value }))} /></div>
          <div><label className={labelClass}>Permit Type</label>
            <select className={inputClass} value={filters.permitType ?? ''} onChange={e => setFilters(f => ({ ...f, permitType: (e.target.value || undefined) as any }))}>
              <option value="">Any</option><option value="hot_work">Hot Work</option><option value="cold_work">Cold Work</option><option value="lifting">General Lifting</option><option value="general_work">General Work</option><option value="work_at_height">Working at Height</option>
            </select></div>
          <div><label className={labelClass}>Status</label>
            <select className={inputClass} value={filters.status ?? ''} onChange={e => setFilters(f => ({ ...f, status: (e.target.value || undefined) as any }))}>
              <option value="">Any</option>
              {['draft', 'submitted', 'under_review', 'approved', 'active', 'expiring_soon', 'suspended', 'completed', 'closed', 'expired', 'rejected', 'cancelled'].map(s =>
                <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select></div>
          <div><label className={labelClass}>From Date</label>
            <input type="date" className={inputClass} value={filters.dateFrom ?? ''} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} /></div>
          <div><label className={labelClass}>To Date</label>
            <input type="date" className={inputClass} value={filters.dateTo ?? ''} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} /></div>
        </div>
        {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
        <button onClick={runSearch} disabled={loading} className="w-full bg-brand text-white font-semibold py-3 rounded-lg disabled:opacity-60">
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {results !== null && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400">{results.length} result{results.length === 1 ? '' : 's'}</div>
          {results.map(p => (
            <Link key={p.id} to={`/permits/${p.id}`} className="block bg-white rounded-xl shadow-sm p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-navy text-sm">{p.permit_number}</span>
                <StatusBadge status={p.status} />
              </div>
              <div className="text-sm text-slate-600">{p.activity}</div>
              <div className="text-xs text-slate-400 mt-1">{p.location} · {format(new Date(p.created_at), 'dd MMM yyyy')}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
