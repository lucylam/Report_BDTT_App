-- BDTT group-leader task management and report delegation.
-- Apply after 20260721_bdtt_field_reporting.sql and before deploying matching app code.

alter table public.tasks
  add column if not exists reporter_id uuid references public.profiles(id),
  add column if not exists task_source text not null default 'plan',
  add column if not exists created_by uuid references public.profiles(id),
  add column if not exists updated_by uuid references public.profiles(id);

alter table public.tasks
  drop constraint if exists tasks_task_source_check;
alter table public.tasks
  add constraint tasks_task_source_check
  check (task_source in ('plan', 'ad_hoc'));

update public.tasks
set reporter_id = assigned_to
where reporter_id is null
  and assigned_to is not null;

create index if not exists tasks_reporter_idx
  on public.tasks (reporter_id, is_cancelled, finish_date);
create index if not exists tasks_source_created_idx
  on public.tasks (task_source, created_at desc);

alter table public.progress
  add column if not exists submitted_by uuid references public.profiles(id);

update public.progress
set submitted_by = user_id
where submitted_by is null;

create table if not exists public.bdtt_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  event_type text not null check (
    event_type in ('created_ad_hoc', 'reassigned', 'cancelled', 'report_updated')
  ),
  actor_id uuid not null references public.profiles(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists bdtt_task_events_task_created_idx
  on public.bdtt_task_events (task_id, created_at desc);

alter table public.bdtt_task_events enable row level security;

-- The app uses the service-role client behind authenticated Next.js APIs.
-- No direct anon/authenticated policies are added for the event log.
