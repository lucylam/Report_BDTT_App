-- Complete the BDTT 2026 operational workflow.
-- Apply after 20260721_bdtt_leader_task_management.sql.

alter table public.tasks
  add column if not exists progress_mode text not null default 'continuous';

alter table public.tasks
  drop constraint if exists tasks_progress_mode_check;
alter table public.tasks
  add constraint tasks_progress_mode_check
  check (progress_mode in ('continuous', 'binary'));

-- task_source already represents the planned/ad-hoc origin. Keep one source of truth.
alter table public.tasks
  add column if not exists task_source text not null default 'plan';

alter table public.tasks
  drop constraint if exists tasks_task_source_check;
alter table public.tasks
  add constraint tasks_task_source_check
  check (task_source in ('plan', 'ad_hoc'));

create table if not exists public.bdtt_team_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('group_leader', 'group_deputy', 'subgroup_leader')),
  scope_type text not null check (scope_type in ('group', 'subgroup')),
  group_key text not null,
  subgroup_key text not null default '',
  is_active boolean not null default true,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, scope_type, group_key, subgroup_key)
);

create index if not exists bdtt_team_roles_profile_scope_idx
  on public.bdtt_team_roles (profile_id, is_active, scope_type, group_key, subgroup_key);

create table if not exists public.google_sheet_sync_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null check (run_type in ('bootstrap', 'outbound')),
  status text not null check (status in ('preview', 'success', 'failed')),
  checksum text not null,
  actor_id uuid not null references public.profiles(id),
  row_count integer not null default 0,
  stats jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists google_sheet_sync_runs_type_created_idx
  on public.google_sheet_sync_runs (run_type, created_at desc);
create index if not exists google_sheet_sync_runs_status_created_idx
  on public.google_sheet_sync_runs (status, created_at desc);

-- Create the first plan and its audit row in one database transaction. This
-- prevents a failed large import from leaving a partially initialized plan.
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
begin
  lock table public.tasks in share row exclusive mode;
  if exists (select 1 from public.tasks where task_source = 'plan' limit 1) then
    raise exception 'BDTT plan has already been initialized';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  insert into public.import_batches (
    file_name, sheet_name, imported_by, row_count, status, notes
  ) values (
    'Google Sheet DATA', 'DATA', p_actor_id, v_row_count, 'applied',
    'Khởi tạo một lần từ Google Sheet; checksum ' || p_checksum
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
    jsonb_build_object('source', 'Google Sheet DATA'), now()
  );

  return query select v_batch_id, v_row_count;
end
$$;

revoke all on function public.bootstrap_bdtt_plan(uuid, text, jsonb) from public;
revoke all on function public.bootstrap_bdtt_plan(uuid, text, jsonb) from anon;
revoke all on function public.bootstrap_bdtt_plan(uuid, text, jsonb) from authenticated;
grant execute on function public.bootstrap_bdtt_plan(uuid, text, jsonb) to service_role;

alter table public.data_issue_reports
  add column if not exists review_started_at timestamptz,
  add column if not exists resolution_note text not null default '';

create table if not exists public.bdtt_abnormalities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete set null,
  title text not null check (length(trim(title)) between 3 and 200),
  description text not null default '',
  location text not null default '',
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'resolved', 'closed')),
  reported_by uuid not null references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  resolution_note text not null default '',
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bdtt_abnormality_photos (
  id uuid primary key default gen_random_uuid(),
  abnormality_id uuid not null references public.bdtt_abnormalities(id) on delete cascade,
  storage_path text not null unique,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.bdtt_abnormality_events (
  id uuid primary key default gen_random_uuid(),
  abnormality_id uuid not null references public.bdtt_abnormalities(id) on delete cascade,
  event_type text not null check (
    event_type in ('created', 'assigned', 'status_changed', 'photo_added', 'note_updated')
  ),
  actor_id uuid not null references public.profiles(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bdtt_abnormalities_status_created_idx
  on public.bdtt_abnormalities (status, severity, created_at desc);
create index if not exists bdtt_abnormalities_task_idx
  on public.bdtt_abnormalities (task_id, created_at desc);
create index if not exists bdtt_abnormalities_assignee_idx
  on public.bdtt_abnormalities (assigned_to, status, created_at desc);
create index if not exists bdtt_abnormality_photos_parent_idx
  on public.bdtt_abnormality_photos (abnormality_id, created_at);
create index if not exists bdtt_abnormality_events_parent_idx
  on public.bdtt_abnormality_events (abnormality_id, created_at desc);

alter table public.bdtt_team_roles enable row level security;
alter table public.google_sheet_sync_runs enable row level security;
alter table public.bdtt_abnormalities enable row level security;
alter table public.bdtt_abnormality_photos enable row level security;
alter table public.bdtt_abnormality_events enable row level security;

-- Repair the optional FK if the field-reporting migration ran before app_modules.
do $$
begin
  if to_regclass('public.app_modules') is not null
    and to_regclass('public.data_issue_reports') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'data_issue_reports_module_fkey'
        and conrelid = 'public.data_issue_reports'::regclass
    ) then
    alter table public.data_issue_reports
      add constraint data_issue_reports_module_fkey
      foreign key (module) references public.app_modules(key) on update cascade;
  end if;
end
$$;

-- APIs use the service-role client after validating the internal session.
-- No direct anon/authenticated policies are intentionally added.
