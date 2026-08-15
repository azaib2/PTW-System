import { supabase } from '@/lib/supabase';
import type { Permit, PermitType, PermitStatus } from '@/types';

export interface SearchFilters {
  permitNumber?: string;
  location?: string;
  supervisor?: string;
  permitType?: PermitType;
  craneId?: string;
  status?: PermitStatus;
  dateFrom?: string;
  dateTo?: string;
}

export async function searchPermits(filters: SearchFilters): Promise<Permit[]> {
  let query = supabase.from('permits').select('*').order('created_at', { ascending: false }).limit(100);

  if (filters.permitNumber) query = query.ilike('permit_number', `%${filters.permitNumber}%`);
  if (filters.location) query = query.ilike('location', `%${filters.location}%`);
  if (filters.supervisor) query = query.ilike('supervisor_name', `%${filters.supervisor}%`);
  if (filters.permitType) query = query.eq('permit_type', filters.permitType);
  if (filters.craneId) query = query.ilike('crane_type', `%${filters.craneId}%`);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Permit[];
}
