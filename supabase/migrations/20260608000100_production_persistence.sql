-- Production persistence additions for BDTT.
-- Apply after 20250822_initial_schema.sql.

alter table public.tasks
  add column if not exists cancel_reason text not null default '';

create or replace function public.cancel_assigned_task(
  target_task_id uuid,
  reason text
)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_task public.tasks;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if length(trim(coalesce(reason, ''))) < 3 then
    raise exception 'Cancel reason is required';
  end if;

  update public.tasks
  set
    is_cancelled = true,
    cancel_reason = trim(reason),
    updated_at = now()
  where id = target_task_id
    and assigned_to = auth.uid()
  returning * into updated_task;

  if updated_task.id is null then
    raise exception 'Task not found or not assigned to current user';
  end if;

  return updated_task;
end;
$$;

grant execute on function public.cancel_assigned_task(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-photos',
  'task-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "task_photos_worker_select" on storage.objects;
create policy "task_photos_worker_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'task-photos'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "task_photos_worker_insert" on storage.objects;
create policy "task_photos_worker_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'task-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "task_photos_worker_update" on storage.objects;
create policy "task_photos_worker_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'task-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'task-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "task_photos_worker_delete" on storage.objects;
create policy "task_photos_worker_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'task-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
