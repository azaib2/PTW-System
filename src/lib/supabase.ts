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

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: true, autoRefreshToken: true }
});

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('YOUR_PROJECT_REF'));
