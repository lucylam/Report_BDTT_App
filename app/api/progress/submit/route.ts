import { NextResponse } from "next/server";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProgressPercent, Task } from "@/types/domain";

export const runtime = "nodejs";

interface SubmitProgressBody {
  readonly update?: {
    readonly taskId?: string;
    readonly userId?: string;
    readonly reportDate?: string;
    readonly percent?: number;
    readonly note?: string;
    readonly photoPath?: string;
  };
  readonly task?: Task;
  readonly worker?: {
    readonly username?: string;
    readonly fullName?: string;
    readonly resourceName?: string;
  };
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const isProgressPercent = (value: unknown): value is ProgressPercent => {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 100
  );
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
};

export const POST = async (request: Request): Promise<NextResponse> => {
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

  const body = (await request.json()) as SubmitProgressBody;
  const update = body.update;
  const task = body.task;
  const username = normalizeText(body.worker?.username);

  if (!update || !task || !username) {
    return NextResponse.json(
      { error: "Thiếu update, task hoặc worker username." },
      { status: 400 }
    );
  }

  const reportDate = normalizeText(update.reportDate);
  if (!reportDate || !isProgressPercent(update.percent)) {
    return NextResponse.json(
      { error: "Dữ liệu tiến độ không hợp lệ." },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  if (!profile?.id) {
    return NextResponse.json(
      { error: `Không tìm thấy profile DB cho username ${username}.` },
      { status: 409 }
    );
  }

  let dbTaskId = isUuid(task.id) ? task.id : "";
  if (!dbTaskId) {
    let query = supabase
      .from("tasks")
      .select("id")
      .eq("tagname", task.tagname)
      .eq("assigned_to", profile.id)
      .limit(1);

    if (task.wo) {
      query = query.eq("wo", task.wo);
    }

    const { data: existingTasks, error: taskLookupError } = await query;
    if (taskLookupError) {
      return NextResponse.json({ error: taskLookupError.message }, { status: 500 });
    }

    dbTaskId = existingTasks?.[0]?.id ?? "";
  }

  if (!dbTaskId) {
    const { data: insertedTask, error: insertTaskError } = await supabase
      .from("tasks")
      .insert({
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
        assigned_to: profile.id,
        is_cancelled: task.isCancelled,
        cancel_reason: task.cancelReason
      })
      .select("id")
      .single();

    if (insertTaskError) {
      return NextResponse.json({ error: insertTaskError.message }, { status: 500 });
    }
    dbTaskId = insertedTask.id;
  }

  const { error: progressError } = await supabase.from("progress").upsert(
    {
      task_id: dbTaskId,
      user_id: profile.id,
      report_date: reportDate,
      percent: update.percent,
      note: normalizeText(update.note),
      photo_path: update.photoPath ?? null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    { onConflict: "task_id,user_id,report_date" }
  );

  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, taskId: dbTaskId });
};
