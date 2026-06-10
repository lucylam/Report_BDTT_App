import { readFile } from "node:fs/promises";

interface GoogleServiceAccountConfig {
  readonly type?: string;
  readonly client_email?: string;
  readonly private_key?: string;
}

interface SupabaseServiceConfig {
  readonly service_role?: string;
  readonly supabase_url?: string;
  readonly url?: string;
}

interface ServerConfigFile {
  readonly googleServiceAccount: GoogleServiceAccountConfig | null;
  readonly supabase: SupabaseServiceConfig | null;
}

const extractTopLevelJsonObjects = (raw: string): readonly string[] => {
  const objects: string[] = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(raw.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return objects;
};

let cachedConfig: Promise<ServerConfigFile | null> | null = null;

const parseServerConfig = (raw: string): ServerConfigFile => {
  const parsedObjects = extractTopLevelJsonObjects(raw).map((value) => JSON.parse(value) as unknown);
  const googleServiceAccount =
    parsedObjects.find((value): value is GoogleServiceAccountConfig => {
      const config = value as GoogleServiceAccountConfig;
      return config.type === "service_account" && Boolean(config.client_email && config.private_key);
    }) ?? null;
  const supabase =
    parsedObjects.find((value): value is SupabaseServiceConfig => {
      const config = value as SupabaseServiceConfig;
      return Boolean(config.service_role);
    }) ?? null;

  return { googleServiceAccount, supabase };
};

export const readServerConfigFile = async (): Promise<ServerConfigFile | null> => {
  const configJson = process.env.BDTT_SERVER_CONFIG_JSON;
  if (configJson) return parseServerConfig(configJson);

  const configPath = process.env.BDTT_SERVER_CONFIG_PATH;
  if (!configPath) return null;

  if (!cachedConfig) {
    cachedConfig = readFile(configPath, "utf8").then(parseServerConfig);
  }

  return cachedConfig;
};

export const readGoogleServiceAccountFromJson = (
  raw: string
): GoogleServiceAccountConfig => {
  return parseServerConfig(raw).googleServiceAccount ?? (JSON.parse(raw) as GoogleServiceAccountConfig);
};

export const readGoogleServiceAccountFromPath = async (
  jsonPath: string
): Promise<GoogleServiceAccountConfig> => {
  return JSON.parse(await readFile(jsonPath, "utf8")) as GoogleServiceAccountConfig;
};
