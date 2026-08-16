import { supabase } from '@/lib/supabase';

const SESSION_KEY = 'hse_ptw_session_token';

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'Android device';
  if (/iPhone|iPad/i.test(ua)) return 'iOS device';
  if (/Windows/i.test(ua)) return 'Windows device';
  if (/Macintosh/i.test(ua)) return 'Mac device';
  return 'Unknown device';
}

export async function claimSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, token);
  const { error } = await supabase.from('active_sessions').upsert({
    user_id: userId, session_token: token, device_label: deviceLabel(), last_seen_at: new Date().toISOString()
  });
  if (error) console.error('Could not register session (non-blocking):', error.message);
  return token;
}

export function getLocalSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export async function isSessionStillActive(userId: string): Promise<boolean> {
  const local = getLocalSessionToken();
  if (!local) return true;
  const { data, error } = await supabase.from('active_sessions').select('session_token').eq('user_id', userId).maybeSingle();
  if (error) return true;
  if (!data) return true;
  return data.session_token === local;
}

export function clearLocalSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
