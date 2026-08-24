-- Allow DATA admin to replace the plan while no progress has been submitted.
-- The progress check and plan replacement stay in one locked transaction.
create or replace function public.bootstrap_bdtt_plan(
  p_actor_id uuid,
  p_checksum text,
  p_rows jsonb
)
returns table (import_batch_id uuid, inserted_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_row_count integer;
  v_replaced_count integer;
begin
  lock table public.progress in share row exclusive mode;
  lock table public.tasks in share row exclusive mode;

  if exists (select 1 from public.progress limit 1) then
    raise exception 'Không thể khởi tạo lại vì đã có báo cáo tiến độ.';
  end if;

  select count(*) into v_replaced_count
  from public.tasks
  where task_source = 'plan';

  delete from public.tasks
  where task_source = 'plan';

  v_row_count := jsonb_array_length(p_rows);
  insert into public.import_batches (
    file_name, sheet_name, imported_by, row_count, status, notes
  ) values (
    'Google Sheet DATA', 'DATA', p_actor_id, v_row_count, 'applied',
    'Khởi tạo hoặc thay thế kế hoạch từ Google Sheet; checksum ' || p_checksum
  ) returning id into v_batch_id;

  insert into public.tasks (
    import_batch_id, stt, wo, tagname, task_name, nhom, don_vi, section,
    duration, priority, start_date, finish_date, resource_name, nhom_truong,
    assigned_to, reporter_id, task_source, progress_mode, is_cancelled,
    cancel_reason
  )
  select
    v_batch_id, row.stt, row.wo, row.tagname, row.task_name, row.nhom,
    row.don_vi, row.section, row.duration, row.priority, row.start_date,
    row.finish_date, row.resource_name, row.nhom_truong, row.assigned_to,
    row.reporter_id, 'plan', row.progress_mode, false, ''
  from jsonb_to_recordset(p_rows) as row(
    stt integer,
    wo text,
    tagname text,
    task_name text,
    nhom text,
    don_vi text,
    section text,
    duration text,
    priority integer,
    start_date date,
    finish_date date,
    resource_name text,
    nhom_truong text,
    assigned_to uuid,
    reporter_id uuid,
    progress_mode text
  );

  insert into public.google_sheet_sync_runs (
    run_type, status, checksum, actor_id, row_count, stats, completed_at
  ) values (
    'bootstrap', 'success', p_checksum, p_actor_id, v_row_count,
    jsonb_build_object(
      'source', 'Google Sheet DATA',
      'replacedTasks', v_replaced_count
    ),
    now()
  );

  return query select v_batch_id, v_row_count;
end
$$;

revoke all on function public.bootstrap_bdtt_plan(uuid, text, jsonb) from public;
revoke all on function public.bootstrap_bdtt_plan(uuid, text, jsonb) from anon;
revoke all on function public.bootstrap_bdtt_plan(uuid, text, jsonb) from authenticated;
grant execute on function public.bootstrap_bdtt_plan(uuid, text, jsonb) to service_role;
