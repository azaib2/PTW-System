import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginPage() {
  const { signIn, sessionKickedOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
    else navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bgapp px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/branding/dar-logo.png" alt="DAR" className="h-10 mx-auto mb-3" />
          <div className="text-slate-500 text-sm">Permit to Work & Lifting Management System</div>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-warning text-amber-800 text-sm p-3">
            Supabase is not configured yet. Set VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY in <code>.env.local</code> — see README.md.
            Login will not work until this is done.
          </div>
        )}

        {sessionKickedOut && (
          <div className="mb-4 rounded-lg bg-amber-50 border border-warning text-amber-800 text-sm p-3">
            You were signed out because this account was logged in on another device.
            If that wasn't you, contact your administrator — accounts must not be shared between people.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-brand focus:ring-1 focus:ring-brand"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:border-brand focus:ring-1 focus:ring-brand"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="text-danger text-sm">{error}</div>}
          <button
            type="submit" disabled={submitting}
            className="w-full bg-brand text-white font-semibold py-3 rounded-lg text-base disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Digital verification does not replace competent-person inspection or approved project procedures.
        </p>
      </div>
    </div>
  );
}
