import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface DatabaseConfig {
  readonly url: string;
  readonly anonKey: string;
}

const getSupabaseConfig = (): DatabaseConfig | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
};

export const createBrowserSupabaseClient = (): SupabaseClient | null => {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey);
};
