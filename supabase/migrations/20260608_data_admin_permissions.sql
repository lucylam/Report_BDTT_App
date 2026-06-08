-- Restrict DATA import/write permissions to the dedicated data admin account.
-- Admin users can still read dashboard/task/progress data through select policies.

create or replace function public.is_data_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and username = 'vinhlpp'
      and role = 'admin'
      and is_active = true
  );
$$;

grant execute on function public.is_data_admin() to authenticated;

drop policy if exists "tasks_admin_write" on public.tasks;
drop policy if exists "tasks_data_admin_write" on public.tasks;
create policy "tasks_data_admin_write"
on public.tasks for all
using (public.is_data_admin())
with check (public.is_data_admin());

drop policy if exists "import_batches_admin_all" on public.import_batches;
drop policy if exists "import_batches_data_admin_all" on public.import_batches;
create policy "import_batches_data_admin_all"
on public.import_batches for all
using (public.is_data_admin())
with check (public.is_data_admin());
