import type { SupabaseClient } from "@supabase/supabase-js";

export type BdttTaskEventType =
  | "created_ad_hoc"
  | "reassigned"
  | "cancelled"
  | "report_updated";

interface WriteBdttTaskEventInput {
  readonly taskId: string;
  readonly eventType: BdttTaskEventType;
  readonly actorId: string;
  readonly details: Record<string, unknown>;
  readonly trialRunId: string | null;
}

export const writeBdttTaskEvent = async (
  supabase: SupabaseClient,
  input: WriteBdttTaskEventInput
): Promise<string | null> => {
  const { error } = await supabase.from("bdtt_task_events").insert({
    task_id: input.taskId,
    event_type: input.eventType,
    actor_id: input.actorId,
    details: input.details,
    trial_run_id: input.trialRunId
  });

  return error?.message ?? null;
};
