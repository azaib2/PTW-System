import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AppUser } from '@/types';
import { claimSession, isSessionStillActive, clearLocalSession } from './sessionService';

interface AuthContextValue {
  session: Session | null;
  profile: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sessionKickedOut: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionKickedOut, setSessionKickedOut] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, contractor_id, is_active')
      .eq('id', userId)
      .single();
    if (error) {
      // Auth succeeded but no matching row in `users` — an admin must
      // provision this account's role before it can be used.
      console.error('No user profile found for this login:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as AppUser);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Single-active-session enforcement: once we know who's logged in, poll
  // periodically to check whether a different device has since claimed the
  // session slot for this account. If so, force a local sign-out with a
  // clear explanation rather than silently continuing.
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (!profile) return;

    async function checkSession() {
      const stillActive = await isSessionStillActive(profile!.id);
      if (!stillActive) {
        setSessionKickedOut(true);
        if (pollRef.current) clearInterval(pollRef.current);
        await supabase.auth.signOut();
        clearLocalSession();
      }
    }

    pollRef.current = setInterval(checkSession, 8000);
    // Also check immediately whenever the tab becomes visible again — catches
    // the case where a second device logged in while this tab was backgrounded,
    // without waiting for the next interval tick.
    document.addEventListener('visibilitychange', checkSession);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener('visibilitychange', checkSession);
    };
  }, [profile]);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      await claimSession(data.user.id); // claims the single-session slot, kicking any other device
      setSessionKickedOut(false);
    }
    return { error: error?.message ?? null };
  }

  async function signOut() {
    clearLocalSession();
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signIn, signOut, sessionKickedOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
