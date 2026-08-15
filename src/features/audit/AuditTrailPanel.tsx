import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface AuditRow {
  id: string; action: string; old_status: string | null; new_status: string | null;
  remarks: string | null; created_at: string; actor: { full_name: string } | null;
}

export default function AuditTrailPanel({ permitId }: { permitId: string }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase.from('audit_logs').select('*, actor:users(full_name)')
      .eq('entity_table', 'permits').eq('entity_id', permitId).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows(data as unknown as AuditRow[]);
      });
  }, [open, permitId]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between text-sm font-semibold text-slate-700">
        Audit Trail <span className="text-xs text-slate-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-xs p-2">{error}</div>}
          {rows.length === 0 && !error && <div className="text-xs text-slate-400">No audit entries yet.</div>}
          {rows.map(r => (
            <div key={r.id} className="text-xs border-l-2 border-slate-200 pl-3 py-1">
              <div className="font-medium text-slate-700">{r.action.replace(/_/g, ' ')}
                {r.old_status && r.new_status && <span className="text-slate-400"> ({r.old_status} → {r.new_status})</span>}
              </div>
              <div className="text-slate-400">{r.actor?.full_name ?? 'System'} · {format(new Date(r.created_at), 'dd MMM yyyy HH:mm')}</div>
              {r.remarks && <div className="text-slate-500 mt-0.5">"{r.remarks}"</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
