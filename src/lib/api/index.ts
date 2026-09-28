import { LocalAdapter } from './local';
import { SupabaseAdapter } from './supabase';
import type { TeamdexApi } from './types';

export * from './types';

const mode = import.meta.env.VITE_DATA_MODE === 'supabase' ? 'supabase' : 'local';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (mode === 'supabase' && (!url || !key)) {
  console.warn('VITE_DATA_MODE=supabase but Supabase env vars are missing. Falling back to local mode.');
}

export const dataMode: 'local' | 'supabase' = mode === 'supabase' && url && key ? 'supabase' : 'local';

export const api: TeamdexApi = dataMode === 'supabase' ? new SupabaseAdapter(url!, key!) : new LocalAdapter();
