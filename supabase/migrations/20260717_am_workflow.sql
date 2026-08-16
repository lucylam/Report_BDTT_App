-- Server-side persistence for the AM work module.
-- Apply after 20260708_progress_percent_range.sql.

create table if not exists public.am_module_roles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('leader', 'member', 'workshop_manager', 'web_admin')),
  is_active boolean not null default true,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.am_tasks (
  id uuid primary key default gen_random_uuid(),
  request_content text not null check (length(trim(request_content)) > 0),
  location_tag text not null default '',
  scheduled_date date not null,
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'submitted', 'needs_revision', 'approved')),
  performer_note text not null default '',
  supervisor_note text not null default '',
  created_by uuid not null references public.profiles(id),
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.am_task_assignees (
  task_id uuid not null references public.am_tasks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (task_id, profile_id)
);

create table if not exists public.am_task_photos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.am_tasks(id) on delete cascade,
  kind text not null check (kind in ('before', 'after')),
  storage_path text not null unique,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.am_task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.am_tasks(id) on delete cascade,
  event_type text not null,
  actor_id uuid not null references public.profiles(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  module text not null check (module in ('am', 'bdtt')),
  event_type text not null,
  entity_id uuid,
  title text not null,
  message text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists am_tasks_status_date_idx
  on public.am_tasks (status, scheduled_date desc);
create index if not exists am_task_assignees_profile_idx
  on public.am_task_assignees (profile_id, assigned_at desc);
create index if not exists am_task_photos_task_idx
  on public.am_task_photos (task_id, kind, created_at);
create index if not exists am_task_events_task_idx
  on public.am_task_events (task_id, created_at desc);
create index if not exists app_notifications_recipient_idx
  on public.app_notifications (recipient_id, read_at, created_at desc);

alter table public.am_module_roles enable row level security;
alter table public.am_tasks enable row level security;
alter table public.am_task_assignees enable row level security;
alter table public.am_task_photos enable row level security;
alter table public.am_task_events enable row level security;
alter table public.app_notifications enable row level security;

-- The application uses the service-role client behind authenticated Next.js APIs.
-- No anon/authenticated policies are intentionally added for these tables.

insert into public.am_module_roles (profile_id, role, assigned_by)
select id, 'leader', id
from public.profiles
where lower(username) = 'haint'
on conflict (profile_id) do update
set role = excluded.role, is_active = true, updated_at = now();

insert into public.am_module_roles (profile_id, role, assigned_by)
select id, 'workshop_manager', id
from public.profiles
where lower(username) = 'kiaq'
on conflict (profile_id) do update
set role = excluded.role, is_active = true, updated_at = now();

insert into public.am_module_roles (profile_id, role, assigned_by)
select id, 'web_admin', id
from public.profiles
where lower(username) = 'vinhlpp'
on conflict (profile_id) do update
set role = excluded.role, is_active = true, updated_at = now();
