import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------
// Permit QR (section 32) — encodes the public verification URL, not
// permit data directly, so scanning always pulls live status rather than
// a stale snapshot baked into the code itself.
// ---------------------------------------------------------------------
export async function getOrCreatePermitQr(permitId: string, userId: string): Promise<string> {
  const { data: existing, error: fetchErr } = await supabase
    .from('qr_codes').select('code').eq('permit_id', permitId).eq('qr_kind', 'permit').maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);

  const code = existing?.code ?? permitId;
  if (!existing) {
    // Best-effort: only HSE/admin roles can write qr_codes per RLS. A
    // contractor user viewing their own approved permit should still see a
    // working QR (it just encodes /verify/{permitId} directly), even if the
    // qr_codes bookkeeping row doesn't get created until an HSE user visits.
    const { error } = await supabase.from('qr_codes').insert({ code, qr_kind: 'permit', permit_id: permitId, created_by: userId });
    if (error) console.warn('QR record not saved (requires HSE/admin role); the QR code itself still works:', error.message);
  }
  return code;
}

export async function generateQrDataUrl(verifyPath: string): Promise<string> {
  const url = `${window.location.origin}/verify/${verifyPath}`;
  return QRCode.toDataURL(url, { width: 320, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } });
}

// ---------------------------------------------------------------------
// Location QR (section 34) — a fixed printable code tied to a physical
// spot (e.g. QR-HOT-B1-001) that pre-fills the location when creating a
// permit, rather than pointing at a specific permit.
// ---------------------------------------------------------------------
export async function createLocationQr(codeLabel: string, defaultLocation: string, userId: string) {
  const { data, error } = await supabase.from('qr_codes').insert({
    code: codeLabel, qr_kind: 'location', location_label: codeLabel, default_location: defaultLocation, created_by: userId
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchLocationQrs() {
  const { data, error } = await supabase.from('qr_codes').select('*').eq('qr_kind', 'location').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function generateLocationQrDataUrl(codeLabel: string): Promise<string> {
  const url = `${window.location.origin}/permits/new?location=${encodeURIComponent(codeLabel)}`;
  return QRCode.toDataURL(url, { width: 320, margin: 2, color: { dark: '#0F172A', light: '#FFFFFF' } });
}

export async function resolveScannedCode(rawValue: string): Promise<{ kind: 'permit' | 'location' | 'unknown'; target: string }> {
  try {
    const url = new URL(rawValue);
    const verifyMatch = url.pathname.match(/^\/verify\/(.+)$/);
    if (verifyMatch) return { kind: 'permit', target: verifyMatch[1] };
    const locationMatch = url.searchParams.get('location');
    if (locationMatch) return { kind: 'location', target: locationMatch };
  } catch {
    // Not a URL — fall through to treating it as a raw code.
  }
  const { data } = await supabase.from('qr_codes').select('qr_kind, permit_id, location_label').eq('code', rawValue).maybeSingle();
  if (data?.qr_kind === 'permit' && data.permit_id) return { kind: 'permit', target: data.permit_id };
  if (data?.qr_kind === 'location' && data.location_label) return { kind: 'location', target: data.location_label };
  return { kind: 'unknown', target: rawValue };
}
