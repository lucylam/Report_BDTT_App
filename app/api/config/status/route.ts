import { NextResponse } from "next/server";
import { readServerConfigFile } from "@/lib/serverConfig";

export const runtime = "nodejs";

const hasValue = (value: string | undefined): boolean =>
  Boolean(value && value.trim());

export const GET = async (): Promise<NextResponse> => {
  let configStatus:
    | {
        readonly readable: boolean;
        readonly hasGoogleServiceAccount: boolean;
        readonly hasSupabaseServiceRole: boolean;
        readonly error?: string;
      }
    | null = null;

  try {
    const config = await readServerConfigFile();
    configStatus = {
      readable: Boolean(config),
      hasGoogleServiceAccount: Boolean(
        config?.googleServiceAccount?.client_email &&
          config.googleServiceAccount.private_key
      ),
      hasSupabaseServiceRole: Boolean(config?.supabase?.service_role)
    };
  } catch (error) {
    configStatus = {
      readable: false,
      hasGoogleServiceAccount: false,
      hasSupabaseServiceRole: false,
      error: error instanceof Error ? error.message : "Không đọc được server config."
    };
  }

  const hasSupabaseUrl =
    hasValue(process.env.SUPABASE_URL) ||
    hasValue(process.env.SUPABASE_PROJECT_URL) ||
    hasValue(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
    Boolean(configStatus.hasSupabaseServiceRole);
  const hasSupabaseServiceRole =
    hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    hasValue(process.env.SUPABASE_SERVICE_ROLE) ||
    hasValue(process.env.SUPABASE_SERVICE_KEY) ||
    hasValue(process.env.SUPABASE_SECRET_KEY) ||
    configStatus.hasSupabaseServiceRole;
  const hasGoogleServiceAccount =
    (hasValue(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
      hasValue(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)) ||
    hasValue(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) ||
    hasValue(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH) ||
    configStatus.hasGoogleServiceAccount;

  return NextResponse.json({
    ok: hasSupabaseUrl && hasSupabaseServiceRole && hasGoogleServiceAccount,
    supabase: {
      hasUrl: hasSupabaseUrl,
      hasServiceRole: hasSupabaseServiceRole
    },
    googleSheets: {
      hasServiceAccount: hasGoogleServiceAccount,
      hasSpreadsheetId: hasValue(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
      sheetName: process.env.GOOGLE_SHEETS_DATA_SHEET_NAME || "DATA"
    },
    serverConfig: {
      hasJsonEnv: hasValue(process.env.BDTT_SERVER_CONFIG_JSON),
      hasPathEnv: hasValue(process.env.BDTT_SERVER_CONFIG_PATH),
      ...configStatus
    }
  });
};

