import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Edge function helpers ────────────────────────────────────────────────────

const BASE = `${SUPABASE_URL}/functions/v1`;

export async function callEdgeFunction<T>(name: string, body: object): Promise<T> {
  const res = await fetch(`${BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Edge function "${name}" failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

export function edgeFunctionUrl(name: string, params: Record<string, string> = {}): string {
  const qs = new URLSearchParams(params).toString();
  return `${BASE}/${name}${qs ? `?${qs}` : ''}`;
}
