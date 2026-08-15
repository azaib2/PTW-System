import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { fetchPermit, fetchPermitControls, fetchPermitApprovals } from '@/features/permits/permitService';
import {
  fetchLiftingPlan, fetchLiftingPlanSteps, fetchCompetencyDocuments, fetchLatestFieldVerification
} from '@/features/lifting/liftingService';
import { fetchPhotos, getPhotoUrl } from '@/features/documents/documentService';

const MARGIN = 50;
const PAGE_W = 595.28; // A4 portrait, points
const PAGE_H = 841.89;

interface Ctx { doc: PDFDocument; font: PDFFont; bold: PDFFont; page: PDFPage; y: number; pageNum: number; permitNumber: string; }

function newPage(ctx: Ctx) {
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN;
  ctx.pageNum += 1;
  header(ctx);
}

function header(ctx: Ctx) {
  ctx.page.drawText('DIGITAL HSE PTW', { x: MARGIN, y: ctx.y, size: 14, font: ctx.bold, color: rgb(0.06, 0.09, 0.16) });
  ctx.page.drawText(ctx.permitNumber, { x: PAGE_W - MARGIN - 120, y: ctx.y, size: 11, font: ctx.bold, color: rgb(0.15, 0.39, 0.92) });
  ctx.y -= 20;
  ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y }, end: { x: PAGE_W - MARGIN, y: ctx.y }, thickness: 1, color: rgb(0.85, 0.87, 0.9) });
  ctx.y -= 20;
}

function footer(ctx: Ctx) {
  ctx.page.drawText(`Page ${ctx.pageNum}`, { x: PAGE_W / 2 - 15, y: 25, size: 9, font: ctx.font, color: rgb(0.5, 0.5, 0.5) });
  ctx.page.drawText('Digital verification does not replace competent-person inspection or approved project procedures.',
    { x: MARGIN, y: 15, size: 6.5, font: ctx.font, color: rgb(0.6, 0.6, 0.6) });
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < 60) newPage(ctx);
}

function sectionTitle(ctx: Ctx, text: string) {
  ensureSpace(ctx, 30);
  ctx.page.drawText(text, { x: MARGIN, y: ctx.y, size: 12, font: ctx.bold, color: rgb(0.06, 0.09, 0.16) });
  ctx.y -= 18;
}

function fieldLine(ctx: Ctx, label: string, value: string) {
  ensureSpace(ctx, 16);
  ctx.page.drawText(`${label}:`, { x: MARGIN, y: ctx.y, size: 9.5, font: ctx.bold, color: rgb(0.35, 0.4, 0.48) });
  ctx.page.drawText(value || '—', { x: MARGIN + 140, y: ctx.y, size: 9.5, font: ctx.font, color: rgb(0.1, 0.12, 0.16) });
  ctx.y -= 15;
}

function checklistLine(ctx: Ctx, label: string, checked: boolean) {
  ensureSpace(ctx, 15);
  ctx.page.drawText(checked ? '[X]' : '[ ]', { x: MARGIN, y: ctx.y, size: 9.5, font: ctx.bold, color: checked ? rgb(0.09, 0.64, 0.29) : rgb(0.6, 0.6, 0.6) });
  ctx.page.drawText(label, { x: MARGIN + 30, y: ctx.y, size: 9.5, font: ctx.font, color: rgb(0.1, 0.12, 0.16) });
  ctx.y -= 14;
}

function paragraph(ctx: Ctx, text: string) {
  const words = text.split(' ');
  let line = '';
  const maxWidth = PAGE_W - MARGIN * 2;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.font.widthOfTextAtSize(test, 9.5) > maxWidth) {
      ensureSpace(ctx, 14);
      ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 9.5, font: ctx.font, color: rgb(0.1, 0.12, 0.16) });
      ctx.y -= 13;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) { ensureSpace(ctx, 14); ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 9.5, font: ctx.font, color: rgb(0.1, 0.12, 0.16) }); ctx.y -= 13; }
}

async function initDoc(permitNumber: string): Promise<Ctx> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, font, bold, page: null as unknown as PDFPage, y: 0, pageNum: 0, permitNumber };
  newPage(ctx);
  return ctx;
}

function finishPage(ctx: Ctx) { footer(ctx); }

function downloadBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------
// Hot Work / Cold Work PDF (section 39)
// ---------------------------------------------------------------------
export async function generateHotColdWorkPdf(permitId: string) {
  const [permit, controls, approvals, photos] = await Promise.all([
    fetchPermit(permitId), fetchPermitControls(permitId), fetchPermitApprovals(permitId), fetchPhotos(permitId)
  ]);

  const ctx = await initDoc(permit.permit_number);
  sectionTitle(ctx, `${permit.permit_type === 'hot_work' ? 'Hot Work' : 'Cold Work'} Permit`);
  fieldLine(ctx, 'Status', permit.status.toUpperCase());
  fieldLine(ctx, 'Location', permit.location);
  fieldLine(ctx, 'Activity', permit.activity);
  fieldLine(ctx, 'Supervisor', permit.supervisor_name ?? '—');
  fieldLine(ctx, 'Start', permit.start_time ? format(new Date(permit.start_time), 'dd MMM yyyy HH:mm') : '—');
  fieldLine(ctx, 'Expiry', permit.expiry_time ? format(new Date(permit.expiry_time), 'dd MMM yyyy HH:mm') : '—');
  if (permit.description) { ctx.y -= 4; paragraph(ctx, permit.description); }
  ctx.y -= 10;

  sectionTitle(ctx, 'Field Controls');
  for (const c of controls as any[]) checklistLine(ctx, c.control_label, c.is_checked);
  ctx.y -= 10;

  sectionTitle(ctx, 'Approval History');
  for (const a of approvals as any[]) {
    fieldLine(ctx, a.action, `${a.actor?.full_name ?? 'Unknown'} · ${format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}`);
    if (a.remarks) paragraph(ctx, `"${a.remarks}"`);
  }

  if ((photos as any[]).length) {
    ctx.y -= 10;
    sectionTitle(ctx, 'Photo Evidence');
    await embedPhotos(ctx, photos as any[]);
  }

  finishPage(ctx);
  const bytes = await ctx.doc.save();
  downloadBlob(bytes, `${permit.permit_number}.pdf`);
}

// ---------------------------------------------------------------------
// Complete Lifting Package PDF (section 38)
// ---------------------------------------------------------------------
export async function generateLiftingPackagePdf(permitId: string) {
  const permit = await fetchPermit(permitId);
  const [controls, approvals, photos, competency, fieldVerification] = await Promise.all([
    fetchPermitControls(permitId), fetchPermitApprovals(permitId), fetchPhotos(permitId),
    fetchCompetencyDocuments(permitId), fetchLatestFieldVerification(permitId)
  ]);
  const plan = permit.lifting_plan_id ? await fetchLiftingPlan(permit.lifting_plan_id) : null;
  const steps = permit.lifting_plan_id ? await fetchLiftingPlanSteps(permit.lifting_plan_id) : [];

  const { data: craneChecklists } = await supabase.from('crane_checklists').select('*, crane_checklist_items(*)').eq('permit_id', permitId).order('created_at', { ascending: false }).limit(1);
  const { data: siteChecklists } = await supabase.from('site_preparation_checklists').select('*, site_preparation_items(*)').eq('permit_id', permitId).order('created_at', { ascending: false }).limit(1);
  const { data: riggingChecks } = await supabase.from('rigging_verifications').select('*, rigging_verification_items(*)').eq('permit_id', permitId).order('created_at', { ascending: false }).limit(1);

  const ctx = await initDoc(permit.permit_number);

  // Page 1: Lifting PTW
  sectionTitle(ctx, 'Lifting Permit to Work');
  fieldLine(ctx, 'Status', permit.status.toUpperCase());
  if (permit.is_critical_lift) fieldLine(ctx, 'Critical Lift', 'YES');
  fieldLine(ctx, 'Location', permit.location);
  fieldLine(ctx, 'Activity', permit.activity);
  fieldLine(ctx, 'Load', permit.load_weight_ton ? `${permit.load_weight_ton} t` : '—');
  fieldLine(ctx, 'Crane', `${permit.crane_type ?? '—'} (${permit.rated_capacity_ton ?? '—'} t)`);
  fieldLine(ctx, 'Start', permit.start_time ? format(new Date(permit.start_time), 'dd MMM yyyy HH:mm') : '—');
  fieldLine(ctx, 'Expiry', permit.expiry_time ? format(new Date(permit.expiry_time), 'dd MMM yyyy HH:mm') : '—');
  ctx.y -= 6;
  for (const c of controls as any[]) checklistLine(ctx, c.control_label, c.is_checked);

  // Page 2: Lifting Plan
  newPage(ctx);
  sectionTitle(ctx, 'Lifting Plan');
  if (plan) {
    fieldLine(ctx, 'Plan Number', plan.plan_number);
    fieldLine(ctx, 'Status', plan.status.toUpperCase());
    fieldLine(ctx, 'Load Description', plan.load_description ?? '—');
    fieldLine(ctx, 'Crane Type / ID', `${plan.crane_type ?? '—'} / ${plan.crane_id ?? '—'}`);
    fieldLine(ctx, 'Working Radius', plan.working_radius_m ? `${plan.working_radius_m} m` : '—');
    fieldLine(ctx, 'Sling / Shackle', `${plan.sling_type ?? '—'} / ${plan.shackle_type ?? '—'}`);
    ctx.y -= 6;
    sectionTitle(ctx, 'Lift Sequence');
    for (const s of steps as any[]) fieldLine(ctx, `${s.step_order}.`, s.step_description);
  } else {
    paragraph(ctx, 'No lifting plan was linked to this permit.');
  }

  // Page 3: Crane Checklist
  newPage(ctx);
  sectionTitle(ctx, 'Crane Checklist');
  const crane = craneChecklists?.[0];
  if (crane) {
    fieldLine(ctx, 'Crane ID', crane.crane_id);
    fieldLine(ctx, 'Result', (crane.result ?? 'pending').toUpperCase());
    ctx.y -= 6;
    for (const i of crane.crane_checklist_items ?? []) checklistLine(ctx, i.item_label + (i.is_critical ? ' (critical)' : ''), i.is_checked);
  } else paragraph(ctx, 'No crane checklist recorded.');

  // Page 4: Site Preparation
  newPage(ctx);
  sectionTitle(ctx, 'Site Preparation');
  const site = siteChecklists?.[0];
  if (site) {
    fieldLine(ctx, 'Result', (site.result ?? 'pending').toUpperCase());
    ctx.y -= 6;
    for (const i of site.site_preparation_items ?? []) checklistLine(ctx, i.item_label, i.is_checked);
  } else paragraph(ctx, 'No site preparation checklist recorded.');

  // Page 5: Rigging Verification
  newPage(ctx);
  sectionTitle(ctx, 'Rigging Verification');
  const rigging = riggingChecks?.[0];
  if (rigging) {
    fieldLine(ctx, 'Result', (rigging.result ?? 'pending').toUpperCase());
    ctx.y -= 6;
    for (const i of rigging.rigging_verification_items ?? []) checklistLine(ctx, i.item_label, i.is_checked);
  } else paragraph(ctx, 'No rigging verification recorded.');

  // Page 6: Competency
  newPage(ctx);
  sectionTitle(ctx, 'Competency Verification');
  if ((competency as any[]).length === 0) paragraph(ctx, 'No competency documents recorded.');
  for (const c of competency as any[]) {
    fieldLine(ctx, c.person_role, `${c.person_name} · #${c.certificate_number} · exp ${c.expiry_date} · ${c.status.toUpperCase()}`);
  }

  // Page 7: Field Verification
  newPage(ctx);
  sectionTitle(ctx, 'HSE Field Verification');
  if (fieldVerification) {
    fieldLine(ctx, 'Ready to Lift', fieldVerification.ready_to_lift ? 'YES' : 'NO');
    const items: [string, boolean][] = [
      ['Lifting PTW', fieldVerification.lifting_ptw_ok], ['Lifting Plan', fieldVerification.lifting_plan_ok],
      ['Crane Checklist', fieldVerification.crane_checklist_ok], ['Site Preparation', fieldVerification.site_preparation_ok],
      ['Rigging', fieldVerification.rigging_ok], ['Competency', fieldVerification.competency_ok],
      ['Barricade', fieldVerification.barricade_ok], ['Communication', fieldVerification.communication_ok],
      ['Weather', fieldVerification.weather_ok], ['Emergency Arrangements', fieldVerification.emergency_arrangements_ok]
    ];
    for (const [label, ok] of items) checklistLine(ctx, label, ok);
  } else paragraph(ctx, 'No field verification recorded.');

  // Page 8: Approval History
  newPage(ctx);
  sectionTitle(ctx, 'Approval History');
  for (const a of approvals as any[]) {
    fieldLine(ctx, a.action, `${a.actor?.full_name ?? 'Unknown'} · ${format(new Date(a.created_at), 'dd MMM yyyy HH:mm')}`);
    if (a.remarks) paragraph(ctx, `"${a.remarks}"`);
  }

  // Page 9+: Photos
  if ((photos as any[]).length) {
    newPage(ctx);
    sectionTitle(ctx, 'Photos & Supporting Documents');
    await embedPhotos(ctx, photos as any[]);
  }

  finishPage(ctx);
  const bytes = await ctx.doc.save();
  downloadBlob(bytes, `${permit.permit_number}-full-package.pdf`);
}

async function embedPhotos(ctx: Ctx, photos: { storage_path: string; caption: string | null }[]) {
  for (const p of photos.slice(0, 8)) { // cap to keep generation time/size reasonable
    try {
      const url = await getPhotoUrl(p.storage_path);
      const bytes = await (await fetch(url)).arrayBuffer();
      const isPng = p.storage_path.toLowerCase().endsWith('.png');
      const img = isPng ? await ctx.doc.embedPng(bytes) : await ctx.doc.embedJpg(bytes);
      const w = 200, h = (img.height / img.width) * 200;
      ensureSpace(ctx, h + 20);
      ctx.page.drawImage(img, { x: MARGIN, y: ctx.y - h, width: w, height: h });
      if (p.caption) ctx.page.drawText(p.caption, { x: MARGIN, y: ctx.y - h - 12, size: 8, font: ctx.font, color: rgb(0.4, 0.4, 0.4) });
      ctx.y -= h + 26;
    } catch {
      // If a specific image fails to embed (unsupported format etc.), skip it
      // rather than failing the whole package.
    }
  }
}
