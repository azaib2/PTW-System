import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Permit, PermitStatus } from '@/types';
import { fetchPermits } from '@/features/permits/permitService';
import { EXPORT_PRESETS } from './exportPresets';

export { EXPORT_PRESETS };


interface ExportRow {
  'Permit Number': string; Type: string; Location: string; Activity: string;
  Supervisor: string; Start: string; Expiry: string; Status: string; Closed: string;
}

function toRow(p: Permit): ExportRow {
  return {
    'Permit Number': p.permit_number,
    Type: p.permit_type.replace('_', ' '),
    Location: p.location,
    Activity: p.activity,
    Supervisor: p.supervisor_name ?? '',
    Start: p.start_time ? format(new Date(p.start_time), 'yyyy-MM-dd HH:mm') : '',
    Expiry: p.expiry_time ? format(new Date(p.expiry_time), 'yyyy-MM-dd HH:mm') : '',
    Status: p.status,
    Closed: ''
  };
}

function downloadWorkbook(rows: ExportRow[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 18 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Permits');
  XLSX.writeFile(wb, filename);
}

export async function exportPermitsToExcel(options: { statuses?: PermitStatus[]; label: string }) {
  const permits = await fetchPermits(options.statuses ? { status: options.statuses } : {});
  const rows = permits.map(toRow);
  downloadWorkbook(rows, `${options.label}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  return permits.length;
}
