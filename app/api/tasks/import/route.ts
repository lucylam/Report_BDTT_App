import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Task } from "@/types/domain";

export const runtime = "nodejs";

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

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeResourceName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toUpperCase();

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
  const importedBy =
    dbProfiles.find(
      (profile) =>
        normalizeText(profile.username).toLowerCase() ===
        normalizeText(body.importedByUsername).toLowerCase()
    )?.id ?? null;

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
  existingTaskResult.tasks.forEach((task) => {
    const key = createTaskKey(task);
    if (!existingByKey.has(key)) existingByKey.set(key, task.id);
  });

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

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase.from("tasks").insert(rowsToInsert);
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    inserted = rowsToInsert.length;
  }

  if (rowsToUpdate.length > 0) {
    const { error: updateError } = await supabase
      .from("tasks")
      .upsert(rowsToUpdate, { onConflict: "id" });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    updated = rowsToUpdate.length;
  }

  return NextResponse.json({
    ok: true,
    inserted,
    updated,
    rowCount: tasks.length
  });
};
