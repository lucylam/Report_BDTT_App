-- Generic module catalogue and access model for the multi-work portal.
-- Apply after 20260717_am_workflow.sql.

create table if not exists public.app_modules (
  key text primary key check (key ~ '^[a-z][a-z0-9_-]{1,31}$'),
  label text not null check (length(trim(label)) > 0),
  short_label text not null check (length(trim(short_label)) > 0),
  description text not null default '',
  icon text not null default 'workorder',
  admin_href text not null,
  worker_href text not null,
  default_access boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_module_memberships (
  module_key text not null references public.app_modules(key) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (length(trim(role)) > 0),
  is_active boolean not null default true,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (module_key, profile_id)
);

create index if not exists app_modules_active_sort_idx
  on public.app_modules (is_active, sort_order, key);
create index if not exists app_module_memberships_profile_idx
  on public.app_module_memberships (profile_id, is_active, module_key);

alter table public.app_modules enable row level security;
alter table public.app_module_memberships enable row level security;

-- APIs use the service-role client after validating the internal session.
-- No anon/authenticated policies are intentionally added.

insert into public.app_modules (
  key, label, short_label, description, icon, admin_href, worker_href,
  default_access, sort_order
) values
  (
    'bdtt', 'Bảo dưỡng tổng thể', 'BDTT',
    'Cập nhật tiến độ, giám sát WorkOrder, nhân sự, DATA và báo cáo.',
    'workorder', '/admin', '/worker', true, 10
  ),
  (
    'am', 'Công tác AM', 'AM',
    'Giao việc, ảnh trước/sau, báo cáo, duyệt và thông báo cho Tổ AM.',
    'calendar', '/am', '/am', false, 20
  )
on conflict (key) do update set
  label = excluded.label,
  short_label = excluded.short_label,
  description = excluded.description,
  icon = excluded.icon,
  admin_href = excluded.admin_href,
  worker_href = excluded.worker_href,
  default_access = excluded.default_access,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.app_module_memberships (
  module_key, profile_id, role, is_active, assigned_by, created_at, updated_at
)
select
  'am', profile_id, role, is_active, assigned_by, created_at, updated_at
from public.am_module_roles
on conflict (module_key, profile_id) do update set
  role = excluded.role,
  is_active = excluded.is_active,
  assigned_by = excluded.assigned_by,
  updated_at = now();

-- Keep the existing AM-specific role table compatible while AM screens are
-- migrated incrementally to the generic access model.
create or replace function public.sync_am_role_to_module_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.app_module_memberships
    where module_key = 'am' and profile_id = old.profile_id;
    return old;
  end if;

  insert into public.app_module_memberships (
    module_key, profile_id, role, is_active, assigned_by, created_at, updated_at
  ) values (
    'am', new.profile_id, new.role, new.is_active, new.assigned_by,
    new.created_at, new.updated_at
  )
  on conflict (module_key, profile_id) do update set
    role = excluded.role,
    is_active = excluded.is_active,
    assigned_by = excluded.assigned_by,
    updated_at = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists sync_am_role_to_module_membership_trigger
  on public.am_module_roles;
create trigger sync_am_role_to_module_membership_trigger
after insert or update or delete on public.am_module_roles
for each row execute function public.sync_am_role_to_module_membership();

-- Replace the closed two-value check with a foreign key to the module catalogue.
alter table public.app_notifications
  drop constraint if exists app_notifications_module_check;
alter table public.app_notifications
  add column if not exists href text;
alter table public.app_notifications
  drop constraint if exists app_notifications_module_fkey;
alter table public.app_notifications
  add constraint app_notifications_module_fkey
  foreign key (module) references public.app_modules(key) on update cascade;

