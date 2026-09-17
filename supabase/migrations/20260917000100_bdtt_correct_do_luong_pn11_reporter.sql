-- Đàm Trung Hiếu moved from PN4 to PN11 after the plan was initialized.
-- His existing WOs still point to Trần Nhựt Quang as reporter.
-- Only live WOs with that exact assignee/reporter pair are changed.
begin;

do $$
declare
  v_hieu_id uuid;
  v_quang_id uuid;
  v_tasks_updated integer;
  v_progress_updated integer;
  v_backups_updated integer;
begin
  select id into v_hieu_id
  from public.profiles
  where lower(trim(username)) = 'hieudt2';

  select id into v_quang_id
  from public.profiles
  where lower(trim(username)) = 'quangtn';

  if v_hieu_id is null or v_quang_id is null then
    if exists (select 1 from public.tasks where trial_run_id is null) then
      raise exception 'Missing Đàm Trung Hiếu or Trần Nhựt Quang profile; review WO ownership before applying.';
    end if;
    return;
  end if;

  -- Lock the affected WOs so progress and demo backups cannot change mid-repair.
  perform t.id
  from public.tasks t
  where t.trial_run_id is null
    and t.assigned_to = v_hieu_id
    and t.reporter_id = v_quang_id
  for update;

  if exists (
    select 1
    from public.tasks t
    join public.progress p on p.task_id = t.id
    where t.trial_run_id is null
      and t.assigned_to = v_hieu_id
      and t.reporter_id = v_quang_id
      and p.user_id is distinct from v_quang_id
      and p.user_id is distinct from v_hieu_id
  ) then
    raise exception 'An affected WO has progress owned by another person; review it before changing reporter_id.';
  end if;

  if exists (
    select 1
    from public.tasks t
    join public.progress old_report on old_report.task_id = t.id
    join public.progress new_report
      on new_report.task_id = old_report.task_id
      and new_report.user_id = v_hieu_id
      and new_report.report_date = old_report.report_date
      and new_report.trial_run_id is not distinct from old_report.trial_run_id
    where t.trial_run_id is null
      and t.assigned_to = v_hieu_id
      and t.reporter_id = v_quang_id
      and old_report.user_id = v_quang_id
  ) then
    raise exception 'An affected WO has reports for both people on the same date; review the conflict first.';
  end if;

  if exists (
    select 1
    from public.tasks t
    join public.bdtt_trial_task_backups b on b.task_id = t.id
    where t.trial_run_id is null
      and t.assigned_to = v_hieu_id
      and t.reporter_id = v_quang_id
      and b.reporter_id is distinct from v_quang_id
      and b.reporter_id is distinct from v_hieu_id
  ) then
    raise exception 'An affected WO has a demo backup with a different reporter; review it first.';
  end if;

  -- user_id is the report owner; submitted_by remains the actual submitter.
  update public.progress p
  set user_id = v_hieu_id
  from public.tasks t
  where p.task_id = t.id
    and t.trial_run_id is null
    and t.assigned_to = v_hieu_id
    and t.reporter_id = v_quang_id
    and p.user_id = v_quang_id;
  get diagnostics v_progress_updated = row_count;

  -- Demo reset must not restore the old reporter later.
  update public.bdtt_trial_task_backups b
  set reporter_id = v_hieu_id
  from public.tasks t
  where b.task_id = t.id
    and t.trial_run_id is null
    and t.assigned_to = v_hieu_id
    and t.reporter_id = v_quang_id
    and b.reporter_id = v_quang_id;
  get diagnostics v_backups_updated = row_count;

  update public.tasks t
  set reporter_id = v_hieu_id
  where t.trial_run_id is null
    and t.assigned_to = v_hieu_id
    and t.reporter_id = v_quang_id;

  get diagnostics v_tasks_updated = row_count;
  raise notice 'Corrected % WOs, % progress records, % demo backups from Trần Nhựt Quang to Đàm Trung Hiếu.',
    v_tasks_updated, v_progress_updated, v_backups_updated;
end;
$$;

commit;
