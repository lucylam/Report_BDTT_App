import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActiveBdttTrialRun {
  readonly id: string;
  readonly name: string;
  readonly startedAt: string;
  readonly createdBy: string;
}

interface DbTrialRun {
  readonly id: string;
  readonly name: string;
  readonly started_at: string;
  readonly created_by: string;
}

export const getActiveBdttTrialRun = async (
  supabase: SupabaseClient
): Promise<ActiveBdttTrialRun | null> => {
  const { data, error } = await supabase
    .from("bdtt_trial_runs")
    .select("id, name, started_at, created_by")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as DbTrialRun | null;
  return row
    ? {
        id: row.id,
        name: row.name,
        startedAt: row.started_at,
        createdBy: row.created_by
      }
    : null;
};

export const saveBdttTrialTaskBackup = async (
  supabase: SupabaseClient,
  trialRunId: string | null,
  taskId: string
): Promise<void> => {
  if (!trialRunId) return;
  const { error } = await supabase.rpc("save_bdtt_trial_task_backup", {
    p_trial_run_id: trialRunId,
    p_task_id: taskId
  });
  if (error) throw new Error(error.message);
};

export const isTrialRunContextCurrent = (
  requestedTrialRunId: unknown,
  activeTrialRunId: string | null
): boolean => {
  const requested =
    typeof requestedTrialRunId === "string" && requestedTrialRunId.trim()
      ? requestedTrialRunId.trim()
      : null;
  return requested === activeTrialRunId;
};
