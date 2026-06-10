import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readServerConfigFile } from "@/lib/serverConfig";

const decodeBase64UrlJson = (value: string): { readonly ref?: string } | null => {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { readonly ref?: string };
  } catch {
    return null;
  }
};

const inferSupabaseUrlFromServiceRoleKey = (serviceRoleKey: string): string | null => {
  const [, payload] = serviceRoleKey.split(".");
  if (!payload) return null;
  const decoded = decodeBase64UrlJson(payload);
  return decoded?.ref ? `https://${decoded.ref}.supabase.co` : null;
};

const getSupabaseServerConfig = async (): Promise<
  { readonly url: string; readonly serviceRoleKey: string } | null
> => {
  const serverConfig = await readServerConfigFile();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    serverConfig?.supabase?.service_role;
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    serverConfig?.supabase?.supabase_url ??
    serverConfig?.supabase?.url ??
    (serviceRoleKey ? inferSupabaseUrlFromServiceRoleKey(serviceRoleKey) : null);

  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
};

export const createServerSupabaseClient = async (): Promise<SupabaseClient | null> => {
  const config = await getSupabaseServerConfig();
  if (!config) return null;
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
