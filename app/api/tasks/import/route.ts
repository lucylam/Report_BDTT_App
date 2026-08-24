import { NextResponse } from "next/server";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { getAuthenticatedDataAdmin } from "@/lib/api/session";
import { getActiveBdttTrialRun } from "@/lib/api/demoMode";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Task } from "@/types/domain";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ImportTasksBody {
  readonly fileName?: string;
  readonly importedByUsername?: string;
  readonly tasks?: Task[];
}

interface DbProfile {
  readonly id: string;
  readonly username: string | null;
  readonly resource_name: string | null;
}

interface DbTaskKey {
  readonly id: string;
  readonly wo: string | null;
  readonly tagname: string | null;
  readonly resource_name: string | null;
}

const DB_PAGE_SIZE = 1000;
const WRITE_CHUNK_SIZE = 300;

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeResourceName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

const chunkArray = <T,>(items: readonly T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const getResourceNameSuffix = (value: string): string => {
  const parts = value.split("_");
  return normalizeResourceName(parts[parts.length - 1] ?? value);
};

const createTaskKey = (task: {
  readonly tagname: string | null;
  readonly wo: string | null;
  readonly resource_name: string | null;
}): string =>
  [
    normalizeText(task.tagname).toUpperCase(),
    normalizeText(task.wo).toUpperCase(),
    normalizeResourceName(normalizeText(task.resource_name))
  ].join("|");

const describeTaskKey = (key: string): string => {
  const [tagname, wo, resourceName] = key.split("|");
  return `${tagname || "NO_TAG"} / ${wo || "NO_WO"} / ${resourceName || "NO_RESOURCE"}`;
};

const findAssignedProfileId = (
  profiles: readonly DbProfile[],
  resourceName: string
): string | null => {
  const normalizedResource = normalizeResourceName(resourceName);
  const resourceSuffix = getResourceNameSuffix(resourceName);
  return (
    profiles.find((profile) => {
      const profileResource = normalizeResourceName(profile.resource_name ?? "");
      return (
        profileResource === normalizedResource ||
        profileResource === resourceSuffix ||
        normalizedResource.endsWith(`_${profileResource}`)
      );
    })?.id ?? null
  );
};

const toTaskRow = (
  task: Task,
  importBatchId: string | null,
  assignedTo: string | null
) => ({
  import_batch_id: importBatchId,
  stt: task.stt,
  wo: task.wo,
  tagname: task.tagname,
  task_name: task.taskName,
  nhom: task.nhom,
  don_vi: task.donVi,
  section: task.section,
  duration: task.duration,
  priority: task.priority,
  start_date: task.startDate || null,
  finish_date: task.finishDate || null,
  resource_name: task.resourceName,
  nhom_truong: task.nhomTruong,
  assigned_to: assignedTo,
  reporter_id: assignedTo,
  task_source: "plan",
  progress_mode: task.progressMode === "binary" ? "binary" : "continuous",
  is_cancelled: task.isCancelled,
  cancel_reason: task.cancelReason,
  updated_at: new Date().toISOString()
});

const listExistingTasks = async (
  supabase: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>
): Promise<{ readonly tasks: DbTaskKey[]; readonly error: string | null }> => {
  const tasks: DbTaskKey[] = [];
  let page = 0;

  while (true) {
    const from = page * DB_PAGE_SIZE;
    const to = from + DB_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("tasks")
      .select("id, wo, tagname, resource_name")
      .range(from, to);

    if (error) return { tasks: [], error: error.message };

    tasks.push(...((data ?? []) as DbTaskKey[]));
    if (!data || data.length < DB_PAGE_SIZE) break;
    page += 1;
  }

  return { tasks, error: null };
};

export const POST = async (request: Request): Promise<NextResponse> => {
  try {
    if (!isAllowedRequestOrigin(request)) {
      return NextResponse.json({ error: forbiddenOriginMessage }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            "Chưa cấu hình Supabase server env trên Vercel. Cần NEXT_PUBLIC_SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY, hoặc BDTT_SERVER_CONFIG_JSON."
        },
        { status: 503 }
      );
    }

    const auth = await getAuthenticatedDataAdmin(request, supabase);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }
    if (await getActiveBdttTrialRun(supabase)) {
      return NextResponse.json(
        { ok: false, error: "Hãy kết thúc Demo Mode trước khi import task kế hoạch." },
        { status: 409 }
      );
    }

    const body = (await request.json()) as ImportTasksBody;
    const tasks = body.tasks ?? [];
    if (tasks.length === 0) {
      return NextResponse.json(
        { error: "Không có hạng mục để import vào database." },
        { status: 400 }
      );
    }

    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, username, resource_name");
    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const dbProfiles = (profiles ?? []) as DbProfile[];
    const importedBy = auth.profile.id;

    const { data: batch, error: batchError } = await supabase
      .from("import_batches")
      .insert({
        file_name: normalizeText(body.fileName) || "DATA.xlsx",
        sheet_name: "DATA",
        imported_by: importedBy,
        row_count: tasks.length,
        status: "applied"
      })
      .select("id")
      .single();
    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 });
    }

    const importBatchId = batch?.id ?? null;
    const existingTaskResult = await listExistingTasks(supabase);
    if (existingTaskResult.error) {
      return NextResponse.json({ error: existingTaskResult.error }, { status: 500 });
    }

    const existingByKey = new Map<string, string>();
    const existingIdsByKey = new Map<string, string[]>();
    existingTaskResult.tasks.forEach((task) => {
      const key = createTaskKey(task);
      existingIdsByKey.set(key, [...(existingIdsByKey.get(key) ?? []), task.id]);
      if (!existingByKey.has(key)) existingByKey.set(key, task.id);
    });

    const incomingCountsByKey = new Map<string, number>();
    tasks.forEach((task) => {
      const key = createTaskKey({
        tagname: task.tagname,
        wo: task.wo,
        resource_name: task.resourceName
      });
      incomingCountsByKey.set(key, (incomingCountsByKey.get(key) ?? 0) + 1);
    });
    const duplicateIncomingKeys = Array.from(incomingCountsByKey.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key);
    if (duplicateIncomingKeys.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `File import co key hang muc bi trung: ${duplicateIncomingKeys
            .slice(0, 8)
            .map(describeTaskKey)
            .join("; ")}. Hay kiem tra DATA truoc khi ghi database.`
        },
        { status: 409 }
      );
    }

    const { count: existingTaskCount, error: countError } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true });
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }
    if ((existingTaskCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            "Database đã có kế hoạch. Import chỉ được dùng cho lần khởi tạo đầu tiên; các thay đổi sau đó thực hiện trên WebApp."
        },
        { status: 409 }
      );
    }

    const duplicateExistingKeys = Array.from(incomingCountsByKey.keys()).filter(
      (key) => (existingIdsByKey.get(key)?.length ?? 0) > 1
    );
    if (duplicateExistingKeys.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `Database dang co nhieu hang muc cung key import: ${duplicateExistingKeys
            .slice(0, 8)
            .map(describeTaskKey)
            .join("; ")}. Can lam sach du lieu truoc khi upsert.`
        },
        { status: 409 }
      );
    }

    let inserted = 0;
    let updated = 0;
    const rowsToInsert: ReturnType<typeof toTaskRow>[] = [];
    const rowsToUpdate: Array<ReturnType<typeof toTaskRow> & { readonly id: string }> = [];

    tasks.forEach((task) => {
      const assignedTo = findAssignedProfileId(dbProfiles, task.resourceName);
      const row = toTaskRow(task, importBatchId, assignedTo);
      const existingId = existingByKey.get(
        createTaskKey({
          tagname: task.tagname,
          wo: task.wo,
          resource_name: task.resourceName
        })
      );
      if (existingId) {
        rowsToUpdate.push({ id: existingId, ...row });
      } else {
        rowsToInsert.push(row);
      }
    });

    for (const rows of chunkArray(rowsToInsert, WRITE_CHUNK_SIZE)) {
      const { error: insertError } = await supabase.from("tasks").insert(rows);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
      inserted += rows.length;
    }

    for (const rows of chunkArray(rowsToUpdate, WRITE_CHUNK_SIZE)) {
      const { error: updateError } = await supabase
        .from("tasks")
        .upsert(rows, { onConflict: "id" });
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      updated += rows.length;
    }

    return NextResponse.json({
      ok: true,
      inserted,
      updated,
      rowCount: tasks.length
    });
  } catch (error) {
    console.error("[api/tasks/import]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Lỗi import DATA vào database."
      },
      { status: 500 }
    );
  }
};
