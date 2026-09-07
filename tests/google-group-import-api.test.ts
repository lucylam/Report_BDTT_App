import { beforeEach, describe, expect, it, vi } from "vitest";
import { DATA_BASE_HEADERS } from "@/lib/excel/exporter";
import { GROUP_IMPORT_NAME, type GroupImportState } from "@/lib/google/groupImport";
import { GET, POST } from "@/app/api/google-sheets/import-thao-lap/route";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), server: vi.fn(), rpc: vi.fn(), sheet: vi.fn() }));
vi.mock("@/lib/api/session", () => ({ getAuthenticatedDataAdmin: mocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: mocks.server }));
vi.mock("@/lib/google/sheets", async (original) => ({ ...await original<typeof import("@/lib/google/sheets")>(), readDataSheetValues: mocks.sheet }));

const state: GroupImportState = { version: "v1", trialActive: false, tasks: [], progress: [], profiles: [{
  id: "person", username: "triendv", resource_name: "Đinh Văn Triển", org_group: null, subgroup: null, org_role: null, is_active: true
}] };
const sheet = [
  [...DATA_BASE_HEADERS, "07/09/2026", "Cancel"],
  [1, "Tháo thiết bị", "WO-1", "TAG-1", GROUP_IMPORT_NAME, "", "", "8 hours", 2, "07/09/2026", "08/09/2026", "Đinh Văn Triển", "Phạm Quyết Chiến", "50%", ""]
];
const request = (body: unknown, origin = "http://localhost:3001") => new Request("http://localhost:3001/api/google-sheets/import-thao-lap", {
  method: "POST", headers: { origin, host: "localhost:3001", "content-type": "application/json" }, body: JSON.stringify(body)
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, profile: { id: "admin" } });
  mocks.server.mockResolvedValue({ rpc: mocks.rpc });
  mocks.rpc.mockImplementation(async (name: string) => name === "get_bdtt_thao_lap_import_state"
    ? { data: state, error: null } : { data: { added: 1, updated: 0, progress: 1, cancelled: 0 }, error: null });
  mocks.sheet.mockResolvedValue(sheet);
});

describe("group import API boundaries", () => {
  it("denies cross-origin writes before accessing credentials", async () => {
    expect((await POST(request({ action: "apply" }, "https://outside.invalid"))).status).toBe(403);
    expect(mocks.server).not.toHaveBeenCalled();
  });
  it("denies non-DATA-admin before reading Sheet or import state", async () => {
    mocks.auth.mockResolvedValue({ ok: false, status: 403, error: "Không có quyền" });
    expect((await POST(request({ action: "preview" }))).status).toBe(403);
    expect((await GET(new Request("http://localhost:3001/api/google-sheets/import-thao-lap"))).status).toBe(403);
    expect(mocks.sheet).not.toHaveBeenCalled(); expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("previews without mutation and applies server-read rows only", async () => {
    const preview = await (await POST(request({ action: "preview" }))).json();
    expect(preview.hasBlockingErrors).toBe(false);
    expect(preview.stats.added).toBe(1);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const response = await POST(request({ action: "apply", expectedChecksum: preview.checksum, rows: [{ assigned_to: "attacker" }] }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenLastCalledWith("import_bdtt_thao_lap", expect.objectContaining({
      p_actor_id: "admin", p_expected_version: "v1", p_rows: [expect.objectContaining({ assigned_to: "person", reporter_id: "person" })]
    }));
    expect(mocks.sheet).toHaveBeenCalledWith("A2:ZZ10003", { sheetName: "IMPORT_THAO_LAP", unformatted: true });
  });
  it.each(["sheet", "database"])("rejects a stale preview after %s changes", async (source) => {
    const preview = await (await POST(request({ action: "preview" }))).json();
    if (source === "sheet") mocks.sheet.mockResolvedValue([...sheet, sheet[1]]);
    else mocks.rpc.mockResolvedValue({ data: { ...state, version: "v2" }, error: null });
    expect((await POST(request({ action: "apply", expectedChecksum: preview.checksum }))).status).toBe(409);
    expect(mocks.rpc.mock.calls.some(([name]) => name === "import_bdtt_thao_lap")).toBe(false);
  });
  it("does not apply any rows when one Sheet row is invalid", async () => {
    mocks.sheet.mockResolvedValue([...sheet, [...sheet[1]]]);
    const preview = await (await POST(request({ action: "preview" }))).json();
    expect(preview.hasBlockingErrors).toBe(true);
    expect((await POST(request({ action: "apply", expectedChecksum: preview.checksum }))).status).toBe(409);
    expect(mocks.rpc.mock.calls.some(([name]) => name === "import_bdtt_thao_lap")).toBe(false);
  });
  it("explains missing migration and never reads Sheet when DB is not ready", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "missing function" } });
    const response = await POST(request({ action: "preview" }));
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("20260907000100_bdtt_thao_lap_import.sql");
    expect(mocks.sheet).not.toHaveBeenCalled();
  });
  it("blocks Demo Mode on the server", async () => {
    mocks.rpc.mockResolvedValue({ data: { ...state, trialActive: true }, error: null });
    expect((await POST(request({ action: "preview" }))).status).toBe(409);
    expect(mocks.sheet).not.toHaveBeenCalled();
  });
  it("returns an actual XLSX template without mutating the database", async () => {
    const response = await GET(new Request("http://localhost:3001/api/google-sheets/import-thao-lap"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain("import-thao-lap.xlsx");
    expect(new Uint8Array(await response.arrayBuffer()).slice(0, 2)).toEqual(new Uint8Array([80, 75]));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
});
