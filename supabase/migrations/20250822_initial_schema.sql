create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  employee_code text,
  full_name text,
  resource_name text unique,
  nhom text,
  nhom_truong text,
  role text not null default 'worker' check (role in ('admin', 'worker')),
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  sheet_name text not null default 'DATA',
  imported_by uuid references public.profiles(id),
  imported_at timestamptz not null default now(),
  row_count int,
  status text not null default 'draft' check (status in ('draft', 'applied', 'failed')),
  notes text
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references public.import_batches(id),
  stt int,
  wo text,
  tagname text not null,
  task_name text,
  nhom text,
  don_vi text,
  section text,
  duration text,
  priority int not null default 2 check (priority in (1, 2, 3)),
  start_date date,
  finish_date date,
  resource_name text,
  nhom_truong text,
  assigned_to uuid references public.profiles(id),
  is_cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  report_date date not null,
  percent int not null check (percent in (0, 25, 50, 75, 100)),
  note text,
  photo_path text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, user_id, report_date)
);

create table if not exists public.daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date unique not null,
  total_tasks int,
  completed int,
  in_progress int,
  not_started int,
  overall_pct numeric(5,2),
  by_group jsonb,
  by_unit jsonb,
  by_worker jsonb,
  captured_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.import_batches enable row level security;
alter table public.tasks enable row level security;
alter table public.progress enable row level security;
alter table public.daily_snapshots enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create policy "profiles_self_or_admin_select"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

create policy "tasks_worker_assigned_select"
on public.tasks for select
using (assigned_to = auth.uid() or public.is_admin());

create policy "tasks_admin_write"
on public.tasks for all
using (public.is_admin())
with check (public.is_admin());

create policy "progress_worker_select_own"
on public.progress for select
using (user_id = auth.uid() or public.is_admin());

create policy "progress_worker_insert_own"
on public.progress for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks
    where tasks.id = task_id
      and tasks.assigned_to = auth.uid()
  )
);

create policy "progress_worker_update_own"
on public.progress for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "progress_admin_all"
on public.progress for all
using (public.is_admin())
with check (public.is_admin());

create policy "import_batches_admin_all"
on public.import_batches for all
using (public.is_admin())
with check (public.is_admin());

create policy "daily_snapshots_admin_select"
on public.daily_snapshots for select
using (public.is_admin());
