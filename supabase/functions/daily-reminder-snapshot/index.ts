import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

interface ProgressRow {
  readonly task_id: string;
  readonly percent: number;
}

interface TaskRow {
  readonly id: string;
  readonly nhom: string | null;
  readonly don_vi: string | null;
  readonly is_cancelled: boolean;
}

const getReportDate = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Saigon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
};

const incrementGroup = (
  target: Record<string, { done: number; total: number }>,
  name: string,
  done: boolean
): void => {
  const current = target[name] ?? { done: 0, total: 0 };
  target[name] = {
    done: current.done + (done ? 1 : 0),
    total: current.total + 1
  };
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response("Missing Supabase env", { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const reportDate = getReportDate();
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, nhom, don_vi, is_cancelled");
  if (tasksError) {
    console.error("[daily-reminder-snapshot.tasks]", tasksError.message);
    return new Response(tasksError.message, { status: 500 });
  }

  const { data: progress, error: progressError } = await supabase
    .from("progress")
    .select("task_id, percent")
    .eq("report_date", reportDate);
  if (progressError) {
    console.error("[daily-reminder-snapshot.progress]", progressError.message);
    return new Response(progressError.message, { status: 500 });
  }

  const progressMap = new Map(
    ((progress ?? []) as ProgressRow[]).map((row) => [row.task_id, row.percent])
  );
  const activeTasks = ((tasks ?? []) as TaskRow[]).filter(
    (task) => !task.is_cancelled
  );
  const byGroup: Record<string, { done: number; total: number }> = {};
  const byUnit: Record<string, { done: number; total: number }> = {};
  let completed = 0;
  let inProgress = 0;
  let totalPercent = 0;

  activeTasks.forEach((task) => {
    const percent = progressMap.get(task.id) ?? 0;
    const done = percent === 100;
    completed += done ? 1 : 0;
    inProgress += percent > 0 && percent < 100 ? 1 : 0;
    totalPercent += percent;
    incrementGroup(byGroup, task.nhom ?? "Chưa phân loại", done);
    incrementGroup(byUnit, task.don_vi ?? "Chưa phân loại", done);
  });

  const totalTasks = activeTasks.length;
  const { error: snapshotError } = await supabase.from("daily_snapshots").upsert({
    snapshot_date: reportDate,
    total_tasks: totalTasks,
    completed,
    in_progress: inProgress,
    not_started: totalTasks - completed - inProgress,
    overall_pct: totalTasks === 0 ? 0 : totalPercent / totalTasks,
    by_group: byGroup,
    by_unit: byUnit,
    captured_at: new Date().toISOString()
  });
  if (snapshotError) {
    console.error("[daily-reminder-snapshot.snapshot]", snapshotError.message);
    return new Response(snapshotError.message, { status: 500 });
  }

  return Response.json({ reportDate, totalTasks, completed });
});
