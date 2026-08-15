import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface PublicPermit {
  permit_number: string; permit_type: string; contractor_name: string;
  location: string; activity: string; status: string;
  issue_time: string | null; expiry_time: string | null;
  lifting_plan_number: string | null; crane_id: string | null; ready_to_lift: boolean;
}

const STATUS_STYLE: Record<string, string> = {
  approved: 'bg-green-100 text-green-700', active: 'bg-green-100 text-green-700',
  expiring_soon: 'bg-amber-100 text-amber-700', suspended: 'bg-slate-200 text-slate-700',
  expired: 'bg-red-100 text-red-700', rejected: 'bg-red-100 text-red-700',
  closed: 'bg-slate-200 text-slate-700', completed: 'bg-green-100 text-green-700'
};

export default function PublicVerifyPage() {
  const { permitId } = useParams<{ permitId: string }>();
  const [permit, setPermit] = useState<PublicPermit | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!permitId) return;
    supabase.rpc('public_verify_permit', { p_permit_id: permitId }).then(({ data, error }) => {
      if (error) { setError(error.message); return; }
      if (!data || data.length === 0) { setNotFound(true); return; }
      setPermit(data[0] as PublicPermit);
    });
  }, [permitId]);

  return (
    <div className="min-h-screen bg-bgapp flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-navy font-bold text-lg">DIGITAL HSE PTW</div>
          <div className="text-xs text-slate-500">Public Permit Verification</div>
        </div>

        {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}
        {notFound && !error && (
          <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-4 text-center font-semibold">
            🔴 Permit not found or no longer valid.
          </div>
        )}

        {permit && (
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <div className="text-center">
              <div className="font-bold text-navy text-lg">{permit.permit_number}</div>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_STYLE[permit.status] ?? 'bg-slate-200 text-slate-700'}`}>
                {permit.status.replace(/_/g, ' ')}
              </span>
            </div>

            <dl className="space-y-2 text-sm border-t border-slate-100 pt-3">
              <div className="flex justify-between"><dt className="text-slate-400">Activity</dt><dd className="text-slate-800 font-medium">{permit.activity}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Location</dt><dd className="text-slate-800 font-medium">{permit.location}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-400">Contractor</dt><dd className="text-slate-800 font-medium">{permit.contractor_name}</dd></div>
              {permit.lifting_plan_number && (
                <div className="flex justify-between"><dt className="text-slate-400">Lifting Plan</dt><dd className="text-slate-800 font-medium">{permit.lifting_plan_number}</dd></div>
              )}
              {permit.crane_id && (
                <div className="flex justify-between"><dt className="text-slate-400">Crane</dt><dd className="text-slate-800 font-medium">{permit.crane_id}</dd></div>
              )}
              {permit.issue_time && (
                <div className="flex justify-between"><dt className="text-slate-400">Issued</dt><dd className="text-slate-800 font-medium">{format(new Date(permit.issue_time), 'dd MMM HH:mm')}</dd></div>
              )}
              {permit.expiry_time && (
                <div className="flex justify-between"><dt className="text-slate-400">Valid Until</dt><dd className="text-slate-800 font-medium">{format(new Date(permit.expiry_time), 'dd MMM HH:mm')}</dd></div>
              )}
            </dl>

            {permit.permit_type === 'lifting' && (
              <div className={`rounded-lg p-2.5 text-center font-bold text-sm ${permit.ready_to_lift ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'}`}>
                {permit.ready_to_lift ? '🟢 READY TO LIFT' : '🔴 NOT READY TO LIFT'}
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 text-center mt-6">
          Digital verification does not replace competent-person inspection or approved project procedures.
        </p>
      </div>
    </div>
  );
}
