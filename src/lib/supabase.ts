import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Entry {
  id: string;
  timestamp: string;
  username: string;
  amount: string;
  image: string;
  prize: number;
  created_at?: string;
}

export interface EntriesPage {
  data: Entry[];
  total: number;
}

// Entry operations
export async function saveEntry(entry: Omit<Entry, 'created_at'>) {
  const { data, error } = await supabase
    .from('entries')
    .insert([entry])
    .select();

  if (error) {
    console.error('Error saving entry:', error);
    throw error;
  }

  return data;
}

export async function getEntries() {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching entries:', error);
    throw error;
  }

  return data as Entry[];
}

export async function getEntriesPaged({
  page,
  pageSize,
  search,
  amount,
  dateFrom,
  dateTo,
}: {
  page: number;
  pageSize: number;
  search?: string;
  amount?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<EntriesPage> {
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  let query = supabase
    .from('entries')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false });

  if (search && search.trim()) {
    query = query.ilike('username', `%${search.trim()}%`);
  }
  if (amount && amount !== 'all') {
    query = query.eq('amount', amount);
  }
  if (dateFrom) {
    query = query.gte('timestamp', dateFrom);
  }
  if (dateTo) {
    query = query.lte('timestamp', dateTo);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('Error fetching paged entries:', error);
    throw error;
  }

  return {
    data: (data as Entry[]) || [],
    total: count || 0,
  };
}

export async function deleteEntry(id: string) {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting entry:', error);
    throw error;
  }

  return true;
}

export async function clearAllEntries() {
  const { error } = await supabase
    .from('entries')
    .delete()
    .neq('id', '');

  if (error) {
    console.error('Error clearing entries:', error);
    throw error;
  }

  return true;
}

export async function getTodayEntries() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .gte('timestamp', today.toISOString())
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching today entries:', error);
    throw error;
  }

  return data as Entry[];
}

export async function getTodayCount(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .gte('timestamp', today.toISOString());

  if (error) {
    console.error('Error counting today entries:', error);
    return 0;
  }
  return count || 0;
}
