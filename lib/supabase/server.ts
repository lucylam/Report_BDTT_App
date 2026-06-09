import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const getSupabaseServerConfig = ():
  | { readonly url: string; readonly serviceRoleKey: string }
  | null => {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
};

export const createServerSupabaseClient = (): SupabaseClient | null => {
  const config = getSupabaseServerConfig();
  if (!config) return null;
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
