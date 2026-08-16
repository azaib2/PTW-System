import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey || url.includes('YOUR_PROJECT_REF')) {
  // Intentionally NOT falling back to a mock client. Per the "no fake
  // functionality" requirement, the app must not silently pretend to work
  // against a database that isn't actually connected.
  // eslint-disable-next-line no-console
  console.error(
    '[Digital HSE PTW] Supabase is not configured. Copy .env.example to ' +
    '.env.local and set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from your ' +
    'own Supabase project (Project Settings -> API).'
  );
}

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT_REF'));

// createClient() throws synchronously on an empty URL, which would crash the
// entire app at module-load time (before React even mounts) if env vars are
// ever missing in a deployment. Fall back to a syntactically valid but inert
// placeholder so the app always boots; isSupabaseConfigured (and the actual
// failed network calls) are what surface the real "not configured" state to
// the user, rather than a hard crash.
export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://not-configured.supabase.co',
  isSupabaseConfigured ? anonKey : 'not-configured',
  { auth: { persistSession: true, autoRefreshToken: true } }
);
