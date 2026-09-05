import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import type { AppRole } from '@/types';

interface UserRow { id: string; full_name: string; email: string; role: AppRole; contractor_id: string | null; is_active: boolean; }
interface ContractorRow { id: string; company_name: string; status: string; }

const ROLES: AppRole[] = [
  'contractor_user', 'contractor_supervisor', 'lifting_supervisor', 'hse_officer',
  'hse_manager', 'client_hse', 'permit_approver', 'administrator'
];

// Roles that represent an internal/HSE/client/admin function rather than a
// contractor's own staff — these normally have no company at all.
const CONTRACTOR_ROLES: AppRole[] = ['contractor_user', 'contractor_supervisor'];

export default function UsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [contractors, setContractors] = useState<ContractorRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const [usersRes, contractorsRes] = await Promise.all([
      supabase.from('users').select('*').order('full_name'),
      supabase.from('contractors').select('id, company_name, status').order('company_name')
    ]);
    if (usersRes.error) setError(usersRes.error.message);
    else setUsers(usersRes.data as UserRow[]);
    if (!contractorsRes.error) setContractors(contractorsRes.data as ContractorRow[]);
  }
  useEffect(() => { load(); }, []);

  async function updateRole(id: string, role: AppRole) {
    setSavingId(id);
    setError(null);
    try {
      const { error } = await supabase.from('users').update({ role }).eq('id', id);
      if (error) throw new Error(error.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role.');
    } finally {
      setSavingId(null);
    }
  }

  async function updateContractor(id: string, contractorId: string) {
    setSavingId(id);
    setError(null);
    try {
      const { error } = await supabase.from('users').update({ contractor_id: contractorId || null }).eq('id', id);
      if (error) throw new Error(error.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update company.');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    setSavingId(id);
    try {
      const { error } = await supabase.from('users').update({ is_active: !isActive }).eq('id', id);
      if (error) throw new Error(error.message);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update.');
    } finally {
      setSavingId(null);
    }
  }

  if (profile?.role !== 'administrator') {
    return <div className="bg-white rounded-xl shadow-sm p-6 text-sm text-slate-500">Only administrators can manage users.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-navy">Users</h1>
      <p className="text-xs text-slate-400">
        New accounts must first be created in Supabase Authentication (Dashboard → Authentication → Add User) —
        this app can't create login credentials itself. Once an account exists, assign its role here.
      </p>
      {error && <div className="rounded-lg bg-red-50 border border-danger text-red-800 text-sm p-3">{error}</div>}

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="bg-white rounded-xl shadow-sm p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800 text-sm">{u.full_name}</div>
                <div className="text-xs text-slate-500">{u.email}</div>
              </div>
              <button onClick={() => toggleActive(u.id, u.is_active)} disabled={savingId === u.id}
                className={`text-xs font-semibold px-2 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                {u.is_active ? 'Active' : 'Inactive'}
              </button>
            </div>
            <select value={u.role} disabled={savingId === u.id} onChange={e => updateRole(u.id, e.target.value as AppRole)}
              className="w-full mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>

            <label className="block mt-2">
              <span className="text-xs text-slate-400">Company</span>
              <select value={u.contractor_id ?? ''} disabled={savingId === u.id}
                onChange={e => updateContractor(u.id, e.target.value)}
                className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="">— No company (internal / HSE / client / admin) —</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}{c.status === 'inactive' ? ' (inactive)' : ''}</option>
                ))}
              </select>
              {CONTRACTOR_ROLES.includes(u.role) && !u.contractor_id && (
                <span className="text-xs text-amber-600">A contractor-side role usually needs a company assigned.</span>
              )}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
