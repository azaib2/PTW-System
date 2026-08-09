import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Flame, Snowflake, Weight, AlertTriangle, QrCode } from 'lucide-react';

interface Counts {
  active: number; pending: number; expiring: number; expired: number;
  suspended: number; closedToday: number; rejected: number; criticalLifts: number;
}

const EMPTY: Counts = { active: 0, pending: 0, expiring: 0, expired: 0, suspended: 0, closedToday: 0, rejected: 0, criticalLifts: 0 };

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

      const queries = await Promise.all([
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'under_review']),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'expiring_soon'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'suspended'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'closed').gte('closed_at', todayStart.toISOString()),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('permits').select('id', { count: 'exact', head: true }).eq('is_critical_lift', true).in('status', ['active', 'approved'])
      ]);

      const err = queries.find(q => q.error);
      if (err?.error) {
        setErrorMsg(err.error.message);
      } else {
        const [active, pending, expiring, expired, suspended, closedToday, rejected, criticalLifts] = queries.map(q => q.count ?? 0);
        setCounts({ active, pending, expiring, expired, suspended, closedToday, rejected, criticalLifts });
      }
      setLoading(false);
    }
    load();
  }, []);

  const cards: { label: string; value: number; color: string }[] = [
    { label: 'Active Permits', value: counts.active, color: 'text-success' },
    { label: 'Pending Approval', value: counts.pending, color: 'text-brand' },
    { label: 'Expiring < 1 Hour', value: counts.expiring, color: 'text-warning' },
    { label: 'Expired', value: counts.expired, color: 'text-danger' },
    { label: 'Suspended', value: counts.suspended, color: 'text-slate-600' },
    { label: 'Closed Today', value: counts.closedToday, color: 'text-slate-600' },
    { label: 'Rejected', value: counts.rejected, color: 'text-danger' },
    { label: 'Critical Lifts', value: counts.criticalLifts, color: 'text-danger' }
  ];

  const quickActions = [
    { to: '/permits/new?type=hot_work', label: 'Create Hot Work', icon: Flame },
    { to: '/permits/new?type=cold_work', label: 'Create Cold Work', icon: Snowflake },
    { to: '/permits/new?type=lifting', label: 'Create Lifting', icon: Weight },
    { to: '/lifting/plans/new', label: 'Create Lifting Plan', icon: AlertTriangle },
    { to: '/qr/scan', label: 'Scan Permit QR', icon: QrCode }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-navy">PROJECT HSE CONTROL CENTER</h1>
        <p className="text-sm text-slate-500">Real-time permit and lifting operations overview</p>
      </div>

      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">
          Could not load dashboard data: {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl shadow-sm p-4">
            <div className={`text-2xl font-bold ${c.color}`}>{loading ? '—' : c.value}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickActions.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 text-center hover:shadow-md transition-shadow">
              <Icon className="text-brand" size={24} />
              <span className="text-xs font-medium text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
