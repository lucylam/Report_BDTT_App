-- A WorkOrder identifies one BDTT task inside the live plan or one demo run.
-- Tagname is descriptive data and may be shared by multiple WorkOrders.
begin;

do $$
begin
  if exists (
    select 1
    from public.tasks
    group by trial_run_id, upper(trim(wo))
    having count(*) > 1
  ) then
    raise exception 'Không thể áp dụng ràng buộc: database đang có WO trùng trong cùng phạm vi live/demo.';
  end if;
  if exists (select 1 from public.tasks where wo is null or length(trim(wo)) = 0) then
    raise exception 'Không thể áp dụng ràng buộc: database đang có WO trống.';
  end if;
end
$$;

alter table public.tasks drop constraint if exists tasks_wo_required;
alter table public.tasks add constraint tasks_wo_required
  check (wo is not null and length(trim(wo)) > 0);

create unique index if not exists tasks_live_wo_unique_idx
  on public.tasks ((upper(trim(wo))))
  where trial_run_id is null;

create unique index if not exists tasks_trial_wo_unique_idx
  on public.tasks (trial_run_id, (upper(trim(wo))))
  where trial_run_id is not null;

create or replace function public.import_bdtt_thao_lap(
  p_actor_id uuid, p_checksum text, p_expected_version text, p_sheet_name text, p_rows jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_report jsonb;
  v_task public.tasks%rowtype;
  v_next public.tasks%rowtype;
  v_previous public.progress%rowtype;
  v_previous_reports jsonb;
  v_task_id uuid;
  v_run_id uuid;
  v_now timestamptz;
  v_added integer := 0;
  v_updated integer := 0;
  v_reports integer := 0;
  v_cancelled integer := 0;
  v_max_stt integer;
  v_percent integer;
  v_date date;
  v_note text;
  v_existing_count integer;
begin
  -- One transaction for validation, all rows, history and the import receipt.
  -- These locks also serialize imports against ordinary task/report writes.
  lock table public.bdtt_trial_runs, public.profiles, public.tasks, public.progress in share row exclusive mode;
  if not exists (select 1 from public.profiles where id = p_actor_id
      and username = 'vinhlpp' and role = 'admin' and is_active) then
    raise exception 'Chỉ DATA admin được import nhóm.' using errcode = '42501';
  end if;
  if exists (select 1 from public.bdtt_trial_runs where status = 'active') then
    raise exception 'Hãy kết thúc Demo Mode trước khi import nhóm.' using errcode = '40001';
  end if;
  if p_expected_version is null or p_expected_version <> (public.get_bdtt_thao_lap_import_state()->>'version') then
    raise exception 'Dữ liệu web đã thay đổi. Hãy xem trước lại.' using errcode = '40001';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Danh sách import không hợp lệ.'; end if;
  if jsonb_array_length(p_rows) > 10000 or coalesce(p_checksum, '') !~ '^[0-9a-f]{64}$'
     or length(trim(coalesce(p_sheet_name, ''))) = 0 then
    raise exception 'Thông tin import không hợp lệ.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) r
    group by upper(trim(r->>'wo')) having count(*) > 1) then
    raise exception 'Trùng WO trong đợt import. Tagname được phép trùng nhưng WO phải duy nhất.';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    return jsonb_build_object('added', 0, 'updated', 0, 'progress', 0, 'cancelled', 0);
  end if;
  select coalesce(max(stt), 0) into v_max_stt from public.tasks;
  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_task := null;
    v_next := jsonb_populate_record(null::public.tasks, v_row);
    if nullif(trim(v_next.tagname), '') is null or nullif(trim(v_next.wo), '') is null
      or nullif(trim(v_next.task_name), '') is null or nullif(trim(v_next.duration), '') is null
      or nullif(trim(v_next.nhom_truong), '') is null or v_next.start_date is null or v_next.finish_date is null
      or v_next.finish_date < v_next.start_date or v_next.priority is null or v_next.priority not in (1, 2, 3)
      or v_next.progress_mode is null or v_next.progress_mode not in ('continuous', 'binary')
      or v_next.is_cancelled is null then raise exception 'Dòng import thiếu dữ liệu hợp lệ.'; end if;
    if not exists (select 1 from public.profiles p where id = v_next.assigned_to and is_active and public.is_bdtt_thao_lap_profile(p))
      or not exists (select 1 from public.profiles p where id = v_next.reporter_id and is_active and public.is_bdtt_thao_lap_profile(p)) then
      raise exception 'Nhân sự import nằm ngoài nhóm Tháo/Lắp TB ĐK.' using errcode = '42501';
    end if;
    if v_next.is_cancelled and length(trim(coalesce(v_next.cancel_reason, ''))) < 3 then
      raise exception 'WO hủy phải có lý do.';
    end if;
    select count(*) into v_existing_count from public.tasks
      where upper(trim(wo)) = upper(trim(v_next.wo));
    if v_next.id is null then
      if v_existing_count <> 0 then raise exception 'WO đã tồn tại. Hãy xem trước lại.' using errcode = '40001'; end if;
      if v_next.nhom is distinct from 'Tháo/Lắp TB ĐK' then raise exception 'Nhóm import không hợp lệ.' using errcode = '42501'; end if;
      v_max_stt := v_max_stt + 1;
      insert into public.tasks (stt, wo, tagname, task_name, nhom, don_vi, section, duration, priority,
        start_date, finish_date, resource_name, nhom_truong, assigned_to, reporter_id,
        task_source, progress_mode, is_cancelled, cancel_reason, created_by, updated_by)
      values (v_max_stt, v_next.wo, v_next.tagname, v_next.task_name, v_next.nhom, v_next.don_vi,
        v_next.section, v_next.duration, v_next.priority, v_next.start_date, v_next.finish_date,
        v_next.resource_name, v_next.nhom_truong, v_next.assigned_to, v_next.reporter_id,
        'ad_hoc', v_next.progress_mode, v_next.is_cancelled, v_next.cancel_reason, p_actor_id, p_actor_id)
      returning id into v_task_id;
      v_added := v_added + 1;
    else
      select * into v_task from public.tasks where id = v_next.id;
      if not found or v_existing_count <> 1 or public.is_bdtt_thao_lap_task(v_task) is not true
        or upper(trim(v_task.wo)) is distinct from upper(trim(v_next.wo))
        or v_task.nhom is distinct from v_next.nhom then
        raise exception 'Công việc không thuộc phạm vi import hoặc đã thay đổi.' using errcode = '42501';
      end if;
      if v_task.is_cancelled and not v_next.is_cancelled then raise exception 'Import không tự mở lại WO đã hủy.'; end if;
      if v_next.progress_mode = 'binary' and exists (select 1 from public.progress where task_id = v_task.id and percent not in (0, 100)) then
        raise exception 'Không thể đổi sang 0/100 khi đã có tiến độ trung gian.';
      end if;
      v_task_id := v_task.id;
      update public.tasks set tagname = v_next.tagname, task_name = v_next.task_name, don_vi = v_next.don_vi, section = v_next.section,
        duration = v_next.duration, priority = v_next.priority, start_date = v_next.start_date, finish_date = v_next.finish_date,
        resource_name = v_next.resource_name, nhom_truong = v_next.nhom_truong, assigned_to = v_next.assigned_to,
        reporter_id = v_next.reporter_id, progress_mode = v_next.progress_mode, is_cancelled = v_next.is_cancelled,
        cancel_reason = v_next.cancel_reason, updated_by = p_actor_id, updated_at = clock_timestamp()
      where id = v_task_id;
      v_updated := v_updated + 1;
    end if;
    if v_next.is_cancelled and not coalesce(v_task.is_cancelled, false) then v_cancelled := v_cancelled + 1; end if;
    insert into public.bdtt_task_events(task_id, event_type, actor_id, details)
    values (v_task_id, 'sheet_imported', p_actor_id, jsonb_build_object('sheet', p_sheet_name, 'checksum', p_checksum,
      'sheet_row', v_row->'sheetRow', 'previous_task', to_jsonb(v_task), 'imported_task', v_row - 'reports'));
    if jsonb_typeof(v_row->'reports') is distinct from 'array' then raise exception 'Tiến độ import không hợp lệ.'; end if;
    if exists (select 1 from jsonb_array_elements(v_row->'reports') r group by r->>'report_date' having count(*) > 1) then
      raise exception 'Trùng ngày báo cáo trong một công việc.';
    end if;
    for v_report in select value from jsonb_array_elements(v_row->'reports') loop
      if coalesce(v_report->>'percent', '') !~ '^\d{1,3}$' or coalesce(v_report->>'report_date', '') !~ '^20\d{2}-\d{2}-\d{2}$' then
        raise exception 'Ngày hoặc phần trăm tiến độ không hợp lệ.';
      end if;
      v_percent := (v_report->>'percent')::integer;
      v_date := (v_report->>'report_date')::date;
      if v_percent not between 0 and 100 or (v_next.progress_mode = 'binary' and v_percent not in (0, 100)) then
        raise exception 'Phần trăm tiến độ không hợp lệ.';
      end if;
      select * into v_previous from public.progress where task_id = v_task_id and report_date = v_date and trial_run_id is null
        order by submitted_at desc, id desc limit 1;
      v_note := coalesce(v_report->>'note', v_previous.note, '');
      if v_previous.id is not null and v_previous.percent = v_percent and coalesce(v_previous.note, '') = v_note then continue; end if;
      select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) into v_previous_reports
        from public.progress p where task_id = v_task_id and report_date = v_date and trial_run_id is null;
      v_now := clock_timestamp();
      -- Update the current report in place, preserving its author and all photos.
      -- The actor and the previous version remain available in the report event.
      if v_previous.id is not null then
        update public.progress set percent = v_percent, note = v_note, submitted_by = p_actor_id,
          submitted_at = v_now, updated_at = v_now where id = v_previous.id;
      else
        insert into public.progress(task_id, user_id, report_date, percent, note, submitted_by, submitted_at, updated_at)
        values (v_task_id, v_next.reporter_id, v_date, v_percent, v_note, p_actor_id, v_now, v_now);
      end if;
      insert into public.bdtt_task_events(task_id, event_type, actor_id, details)
      values (v_task_id, 'report_updated', p_actor_id, jsonb_build_object('previous_reports', v_previous_reports,
        'reporter_id', coalesce(v_previous.user_id, v_next.reporter_id), 'submitted_by', p_actor_id,
        'report_date', v_date, 'percent', v_percent, 'note', v_note,
        'photo_paths', coalesce(to_jsonb(v_previous.photo_paths), '[]'::jsonb), 'source', p_sheet_name, 'checksum', p_checksum));
      v_reports := v_reports + 1;
    end loop;
  end loop;
  insert into public.google_sheet_sync_runs(run_type, status, checksum, actor_id, row_count, stats, completed_at)
  values ('group_import', 'success', p_checksum, p_actor_id, jsonb_array_length(p_rows),
    jsonb_build_object('sheet', p_sheet_name, 'group', 'Tháo/Lắp TB ĐK', 'added', v_added, 'updated', v_updated,
      'progress', v_reports, 'cancelled', v_cancelled), clock_timestamp()) returning id into v_run_id;
  return jsonb_build_object('runId', v_run_id, 'added', v_added, 'updated', v_updated, 'progress', v_reports, 'cancelled', v_cancelled);
end;
$$;

revoke all on function public.import_bdtt_thao_lap(uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.import_bdtt_thao_lap(uuid, text, text, text, jsonb)
  to service_role;

commit;
