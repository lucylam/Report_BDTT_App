import crypto from "node:crypto";
import type { ExportCellValue } from "@/lib/excel/exporter";
import {
  readGoogleServiceAccountFromJson,
  readGoogleServiceAccountFromPath,
  readServerConfigFile
} from "@/lib/serverConfig";

const DEFAULT_SPREADSHEET_ID = "1wknfHCcrVVvc1p8mj91yXLlcVbO3vrJjDF3mulH5N1w";
const DEFAULT_SHEET_NAME = "DATA";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const PROGRESS_CLEAR_RANGE_PATTERN = /^N3:AF(\d+)$/;
const PROGRESS_UPDATE_RANGE = "N3";

const base64UrlEncode = (value: string): string =>
  Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");

const normalizePrivateKey = (value: string): string => {
  return value.replace(/\\n/g, "\n");
};

const getServiceAccountCredential = async (): Promise<{
  readonly clientEmail: string;
  readonly privateKey: string;
}> => {
  const envClientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const envPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (envClientEmail && envPrivateKey) {
    return { clientEmail: envClientEmail, privateKey: envPrivateKey };
  }

  const jsonValue = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonValue) {
    const credential = readGoogleServiceAccountFromJson(jsonValue);
    if (credential.client_email && credential.private_key) {
      return {
        clientEmail: credential.client_email,
        privateKey: credential.private_key
      };
    }
  }

  const jsonPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;
  if (jsonPath) {
    const credential = await readGoogleServiceAccountFromPath(jsonPath);
    if (credential.client_email && credential.private_key) {
      return {
        clientEmail: credential.client_email,
        privateKey: credential.private_key
      };
    }
  }

  const serverConfig = await readServerConfigFile();
  const credential = serverConfig?.googleServiceAccount;
  if (credential?.client_email && credential.private_key) {
    return {
      clientEmail: credential.client_email,
      privateKey: credential.private_key
    };
  }

  throw new Error(
    "Chưa cấu hình Google service account. Cần GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON_PATH, BDTT_SERVER_CONFIG_JSON, hoặc BDTT_SERVER_CONFIG_PATH."
  );
};

const createJwt = (clientEmail: string, privateKey: string): string => {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT"
    })
  );
  const claim = base64UrlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      exp: now + 3600,
      iat: now
    })
  );
  const unsignedToken = `${header}.${claim}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(normalizePrivateKey(privateKey), "base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");

  return `${unsignedToken}.${signature}`;
};

const getAccessToken = async (): Promise<string> => {
  const { clientEmail, privateKey } = await getServiceAccountCredential();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createJwt(clientEmail, privateKey)
    })
  });

  const json = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !json.access_token) {
    throw new Error(
      json.error_description || json.error || "Không lấy được Google access token."
    );
  }

  return json.access_token;
};

const getSpreadsheetId = (): string =>
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;

const getSheetName = (): string =>
  process.env.GOOGLE_SHEETS_DATA_SHEET_NAME || DEFAULT_SHEET_NAME;

const sheetRange = (sheetName: string, range: string): string =>
  `${sheetName}!${range}`;

const assertProgressWriteRange = (options: {
  readonly clearRange?: string;
  readonly updateRange?: string;
}): { readonly clearRange: string; readonly updateRange: string } => {
  const clearRange = options.clearRange;
  const updateRange = options.updateRange;
  const clearRangeMatch = clearRange?.match(PROGRESS_CLEAR_RANGE_PATTERN);
  const clearEndRow = clearRangeMatch ? Number(clearRangeMatch[1]) : 0;

  if (!clearRangeMatch || clearEndRow < 3) {
    throw new Error(
      `Google Sheet sync bị chặn: clearRange phải nằm trong N3:AF..., hiện tại là "${clearRange ?? "trống"}".`
    );
  }

  if (updateRange !== PROGRESS_UPDATE_RANGE) {
    throw new Error(
      `Google Sheet sync bị chặn: updateRange phải là ${PROGRESS_UPDATE_RANGE}, hiện tại là "${updateRange ?? "trống"}".`
    );
  }

  return { clearRange: clearRangeMatch[0], updateRange };
};

export const syncDataSheetValues = async (
  values: readonly (readonly ExportCellValue[])[],
  options: {
    readonly clearRange?: string;
    readonly updateRange?: string;
  }
): Promise<{ readonly updatedRows: number; readonly updatedColumns: number }> => {
  if (values.length === 0 || values[0].length === 0) {
    throw new Error("Không có dữ liệu để ghi Google Sheet.");
  }

  const safeRange = assertProgressWriteRange(options);
  const accessToken = await getAccessToken();
  const spreadsheetId = getSpreadsheetId();
  const sheetName = getSheetName();
  const headers = {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json"
  };

  const clearRange = encodeURIComponent(sheetRange(sheetName, safeRange.clearRange));
  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`,
    {
      method: "POST",
      headers,
      body: "{}"
    }
  );
  if (!clearResponse.ok) {
    const errorText = await clearResponse.text();
    throw new Error(`Không clear được sheet DATA: ${errorText}`);
  }

  const updateRange = encodeURIComponent(sheetRange(sheetName, safeRange.updateRange));
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({
        majorDimension: "ROWS",
        values
      })
    }
  );
  const updateJson = (await updateResponse.json()) as {
    updatedRows?: number;
    updatedColumns?: number;
    error?: { message?: string };
  };
  if (!updateResponse.ok) {
    throw new Error(updateJson.error?.message || "Không ghi được Google Sheet DATA.");
  }

  return {
    updatedRows: updateJson.updatedRows ?? values.length,
    updatedColumns: updateJson.updatedColumns ?? values[0].length
  };
};
