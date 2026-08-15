import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/AuthContext';
import type { AppRole } from '@/types';

interface UserRow { id: string; full_name: string; email: string; role: AppRole; contractor_id: string | null; is_active: boolean; }

const ROLES: AppRole[] = [
  'contractor_user', 'contractor_supervisor', 'lifting_supervisor', 'hse_officer',
  'hse_manager', 'client_hse', 'permit_approver', 'administrator'
];

export default function UsersPage() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase.from('users').select('*').order('full_name');
    if (error) setError(error.message);
    else setUsers(data as UserRow[]);
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
          </div>
        ))}
      </div>
    </div>
  );
}
