-- BDTT field-reporting improvements.
-- Apply after 20260718_portal_modules.sql and before deploying the matching app code.

alter table public.progress
  add column if not exists photo_paths text[] not null default '{}'::text[];

update public.progress
set photo_paths = array[photo_path]
where photo_path is not null
  and length(trim(photo_path)) > 0
  and cardinality(photo_paths) = 0;

alter table public.progress
  drop constraint if exists progress_photo_paths_limit;
alter table public.progress
  add constraint progress_photo_paths_limit
  check (cardinality(photo_paths) <= 5);

create table if not exists public.data_issue_reports (
  id uuid primary key default gen_random_uuid(),
  module text not null default 'bdtt',
  task_id uuid not null references public.tasks(id) on delete cascade,
  reported_by uuid not null references public.profiles(id),
  issue_type text not null check (issue_type in ('wrong_tag', 'wrong_wo', 'wrong_assignment', 'other')),
  current_value text not null default '',
  suggested_value text not null default '',
  note text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_issue_reports_status_created_idx
  on public.data_issue_reports (status, created_at desc);
create index if not exists data_issue_reports_task_idx
  on public.data_issue_reports (task_id, created_at desc);
create unique index if not exists data_issue_reports_open_duplicate_idx
  on public.data_issue_reports (task_id, reported_by, issue_type)
  where status in ('open', 'reviewing');

alter table public.data_issue_reports enable row level security;

-- Keep this migration runnable even if the portal catalogue has not been
-- applied yet. The FK is added automatically when app_modules is available.
do $$
begin
  if to_regclass('public.app_modules') is not null
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

-- The application accesses this table through authenticated Next.js APIs
-- using the server-side service-role client. No direct anon/authenticated policy.
