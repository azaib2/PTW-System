import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------
// Attachments (certificates, drawings, load charts, method statements...)
// Stored under permit-attachments/{permit_id}/{timestamp}-{filename}
// Path convention matches the Storage RLS policies in migration 0004.
// ---------------------------------------------------------------------
export interface AttachmentInput {
  permit_id: string;
  file: File;
  doc_type?: string;
  doc_number?: string;
  issue_date?: string;
  expiry_date?: string;
  uploaded_by: string;
}

function computeDocStatus(expiryDate?: string): 'valid' | 'expiring' | 'expired' | undefined {
  if (!expiryDate) return undefined;
  const expiry = new Date(expiryDate);
  if (expiry < new Date()) return 'expired';
  if (expiry < new Date(Date.now() + 30 * 86400000)) return 'expiring';
  return 'valid';
}

export async function uploadAttachment(input: AttachmentInput) {
  const path = `${input.permit_id}/${Date.now()}-${input.file.name}`;
  const { error: uploadErr } = await supabase.storage.from('permit-attachments').upload(path, input.file);
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data, error } = await supabase.from('permit_attachments').insert({
    permit_id: input.permit_id,
    file_name: input.file.name,
    storage_path: path,
    doc_type: input.doc_type || null,
    doc_number: input.doc_number || null,
    issue_date: input.issue_date || null,
    expiry_date: input.expiry_date || null,
    status: computeDocStatus(input.expiry_date),
    uploaded_by: input.uploaded_by
  }).select().single();

  if (error) {
    // Roll back the uploaded file if the DB row failed, so storage doesn't
    // accumulate orphaned files with no matching record.
    await supabase.storage.from('permit-attachments').remove([path]);
    throw new Error(error.message);
  }
  return data;
}

export async function fetchAttachments(permitId: string) {
  const { data, error } = await supabase.from('permit_attachments').select('*').eq('permit_id', permitId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getAttachmentDownloadUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from('permit-attachments').createSignedUrl(storagePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteAttachment(id: string, storagePath: string) {
  const { error: storageErr } = await supabase.storage.from('permit-attachments').remove([storagePath]);
  if (storageErr) throw new Error(storageErr.message);
  const { error } = await supabase.from('permit_attachments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
// Photos — camera evidence attached to a permit (and optionally a related
// checklist row via related_table/related_id).
// Stored under permit-photos/{permit_id}/{timestamp}-{filename}
// ---------------------------------------------------------------------
export interface PhotoInput {
  permit_id: string;
  file: File;
  caption?: string;
  related_table?: string;
  related_id?: string;
  taken_by: string;
}

export async function uploadPhoto(input: PhotoInput) {
  const path = `${input.permit_id}/${Date.now()}-${input.file.name}`;
  const { error: uploadErr } = await supabase.storage.from('permit-photos').upload(path, input.file);
  if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

  const { data, error } = await supabase.from('permit_photos').insert({
    permit_id: input.permit_id,
    storage_path: path,
    caption: input.caption || null,
    related_table: input.related_table || null,
    related_id: input.related_id || null,
    taken_by: input.taken_by
  }).select().single();

  if (error) {
    await supabase.storage.from('permit-photos').remove([path]);
    throw new Error(error.message);
  }
  return data;
}

export async function fetchPhotos(permitId: string) {
  const { data, error } = await supabase.from('permit_photos').select('*').eq('permit_id', permitId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function getPhotoUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from('permit-photos').createSignedUrl(storagePath, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deletePhoto(id: string, storagePath: string) {
  const { error: storageErr } = await supabase.storage.from('permit-photos').remove([storagePath]);
  if (storageErr) throw new Error(storageErr.message);
  const { error } = await supabase.from('permit_photos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
