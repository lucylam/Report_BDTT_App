create table if not exists public.bdtt_trial_runs (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Dùng thử trước vận hành'
    check (length(trim(name)) between 3 and 120),
  status text not null default 'active'
    check (status in ('active', 'closed')),
  created_by uuid not null references public.profiles(id),
  ended_by uuid references public.profiles(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  cleanup_summary jsonb not null default '{}'::jsonb
);

create unique index if not exists bdtt_trial_runs_single_active_idx
  on public.bdtt_trial_runs (status)
  where status = 'active';

alter table public.bdtt_trial_runs enable row level security;

alter table public.tasks
  add column if not exists trial_run_id uuid references public.bdtt_trial_runs(id);
alter table public.progress
  add column if not exists trial_run_id uuid references public.bdtt_trial_runs(id);
alter table public.data_issue_reports
  add column if not exists trial_run_id uuid references public.bdtt_trial_runs(id);
alter table public.bdtt_task_events
  add column if not exists trial_run_id uuid references public.bdtt_trial_runs(id);
alter table public.bdtt_abnormalities
  add column if not exists trial_run_id uuid references public.bdtt_trial_runs(id);
alter table public.app_notifications
  add column if not exists trial_run_id uuid references public.bdtt_trial_runs(id);

create index if not exists tasks_trial_run_idx on public.tasks (trial_run_id);
create index if not exists progress_trial_run_idx on public.progress (trial_run_id);
create index if not exists data_issue_reports_trial_run_idx
  on public.data_issue_reports (trial_run_id);
create index if not exists bdtt_task_events_trial_run_idx
  on public.bdtt_task_events (trial_run_id);
create index if not exists bdtt_abnormalities_trial_run_idx
  on public.bdtt_abnormalities (trial_run_id);
create index if not exists app_notifications_trial_run_idx
  on public.app_notifications (trial_run_id);

alter table public.progress
  drop constraint if exists progress_task_id_user_id_report_date_key;
alter table public.progress
  drop constraint if exists progress_scope_unique;
alter table public.progress
  add constraint progress_scope_unique
  unique nulls not distinct (task_id, user_id, report_date, trial_run_id);

drop index if exists public.data_issue_reports_open_duplicate_idx;
create unique index if not exists data_issue_reports_live_open_duplicate_idx
  on public.data_issue_reports (task_id, reported_by, issue_type)
  where status in ('open', 'reviewing') and trial_run_id is null;
create unique index if not exists data_issue_reports_trial_open_duplicate_idx
  on public.data_issue_reports (task_id, reported_by, issue_type, trial_run_id)
  where status in ('open', 'reviewing') and trial_run_id is not null;

create table if not exists public.bdtt_trial_task_backups (
  trial_run_id uuid not null references public.bdtt_trial_runs(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  reporter_id uuid references public.profiles(id),
  resource_name text,
  is_cancelled boolean not null,
  cancel_reason text not null default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null,
  captured_at timestamptz not null default now(),
  primary key (trial_run_id, task_id)
);

alter table public.bdtt_trial_task_backups enable row level security;

create or replace function public.save_bdtt_trial_task_backup(
  p_trial_run_id uuid,
  p_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.bdtt_trial_runs
    where id = p_trial_run_id and status = 'active'
  ) then
    raise exception 'Đợt dùng thử không còn hoạt động.';
  end if;

  insert into public.bdtt_trial_task_backups (
    trial_run_id,
    task_id,
    assigned_to,
    reporter_id,
    resource_name,
    is_cancelled,
    cancel_reason,
    updated_by,
    updated_at
  )
  select
    p_trial_run_id,
    task.id,
    task.assigned_to,
    task.reporter_id,
    task.resource_name,
    task.is_cancelled,
    coalesce(task.cancel_reason, ''),
    task.updated_by,
    task.updated_at
  from public.tasks task
  where task.id = p_task_id
    and task.trial_run_id is null
  on conflict (trial_run_id, task_id) do nothing;
end;
$$;

create or replace function public.cleanup_bdtt_trial_run(
  p_trial_run_id uuid,
  p_ended_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.bdtt_trial_runs
    where id = p_trial_run_id and status = 'active'
  ) then
    raise exception 'Đợt dùng thử không tồn tại hoặc đã kết thúc.';
  end if;

  select jsonb_build_object(
    'tasks', (select count(*) from public.tasks where trial_run_id = p_trial_run_id),
    'taskChanges', (select count(*) from public.bdtt_trial_task_backups where trial_run_id = p_trial_run_id),
    'progress', (select count(*) from public.progress where trial_run_id = p_trial_run_id),
    'dataIssues', (select count(*) from public.data_issue_reports where trial_run_id = p_trial_run_id),
    'abnormalities', (select count(*) from public.bdtt_abnormalities where trial_run_id = p_trial_run_id),
    'events', (select count(*) from public.bdtt_task_events where trial_run_id = p_trial_run_id),
    'notifications', (select count(*) from public.app_notifications where trial_run_id = p_trial_run_id)
  ) into result;

  update public.tasks task
  set
    assigned_to = backup.assigned_to,
    reporter_id = backup.reporter_id,
    resource_name = backup.resource_name,
    is_cancelled = backup.is_cancelled,
    cancel_reason = backup.cancel_reason,
    updated_by = backup.updated_by,
    updated_at = backup.updated_at
  from public.bdtt_trial_task_backups backup
  where backup.trial_run_id = p_trial_run_id
    and backup.task_id = task.id
    and task.trial_run_id is null;

  delete from public.bdtt_abnormalities where trial_run_id = p_trial_run_id;
  delete from public.data_issue_reports where trial_run_id = p_trial_run_id;
  delete from public.progress where trial_run_id = p_trial_run_id;
  delete from public.bdtt_task_events where trial_run_id = p_trial_run_id;
  delete from public.app_notifications where trial_run_id = p_trial_run_id;
  delete from public.tasks where trial_run_id = p_trial_run_id;
  delete from public.bdtt_trial_task_backups where trial_run_id = p_trial_run_id;

  update public.bdtt_trial_runs
  set
    status = 'closed',
    ended_by = p_ended_by,
    ended_at = now(),
    cleanup_summary = result
  where id = p_trial_run_id;

  return result;
end;
$$;

revoke all on function public.save_bdtt_trial_task_backup(uuid, uuid) from public;
revoke all on function public.cleanup_bdtt_trial_run(uuid, uuid) from public;
grant execute on function public.save_bdtt_trial_task_backup(uuid, uuid) to service_role;
grant execute on function public.cleanup_bdtt_trial_run(uuid, uuid) to service_role;
