import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';
import type { Permit, PermitStatus } from '@/types';

const ARCHIVE_STATUSES: PermitStatus[] = ['closed', 'expired', 'rejected', 'cancelled'];

export default function ArchivePage() {
  const [permits, setPermits] = useState<Permit[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('permits').select('*').in('status', ARCHIVE_STATUSES).order('updated_at', { ascending: false }).limit(200);
      if (error) setError(error.message);
      else setPermits(data as Permit[]);
      setLoading(false);
    })();
  }, []);

  const filtered = permits.filter(p =>
    !query ||
    p.permit_number.toLowerCase().includes(query.toLowerCase()) ||
    p.location.toLowerCase().includes(query.toLowerCase()) ||
    p.activity.toLowerCase().includes(query.toLowerCase())
  );

  async function downloadPdf(p: Permit) {
    setPdfBusyId(p.id);
    try {
      const { generateHotColdWorkPdf, generateLiftingPackagePdf } = await import('@/features/pdf/pdfService');
      if (p.permit_type === 'lifting') await generateLiftingPackagePdf(p.id);
      else await generateHotColdWorkPdf(p.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'PDF generation failed.');
    } finally {
      setPdfBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Permit Archive</h1>
      <p className="text-xs text-slate-400">Closed, expired, rejected and cancelled permits. Retention period is configurable in Settings.</p>

      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by permit number, location, activity…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" />

      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
      {loading && <div className="text-slate-400 text-sm">Loading…</div>}
      {!loading && filtered.length === 0 && <div className="bg-white rounded-xl shadow-sm p-6 text-center text-sm text-slate-400">No archived permits found.</div>}

      <div className="space-y-2">
        {filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow-sm p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-navy text-sm">{p.permit_number}</span>
              <StatusBadge status={p.status} />
            </div>
            <div className="text-sm text-slate-600">{p.activity}</div>
            <div className="text-xs text-slate-400 mt-1">{p.location} · updated {format(new Date(p.updated_at), 'dd MMM yyyy')}</div>
            <div className="flex gap-3 mt-2">
              <Link to={`/permits/${p.id}`} className="text-xs font-medium text-brand">View</Link>
              <button onClick={() => downloadPdf(p)} disabled={pdfBusyId === p.id} className="text-xs font-medium text-brand disabled:opacity-60">
                {pdfBusyId === p.id ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
