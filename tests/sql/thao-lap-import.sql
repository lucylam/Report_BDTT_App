-- Runs only in the disposable local DB created by scripts/test-thao-lap-import-db.mjs.
begin;
insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002'), ('00000000-0000-4000-8000-000000000003');
insert into public.profiles(id, username, email, role, resource_name, org_group, org_role, subgroup) values
  ('00000000-0000-4000-8000-000000000001', 'vinhlpp', 'admin@test.invalid', 'admin', 'Admin test', null, null, null),
  ('00000000-0000-4000-8000-000000000002', 'triendv', 'team@test.invalid', 'admin', 'Đinh Văn Triển', null, null, null),
  ('00000000-0000-4000-8000-000000000003', 'other', 'other@test.invalid', 'worker', 'Người khác', 'TB Đo lường', 'member', 'PN1');
insert into public.tasks(id, wo, tagname, task_name, nhom, assigned_to, reporter_id, task_source, cancel_reason) values
  ('00000000-0000-4000-8000-000000000011', 'WO-PLAN', 'TAG-PLAN', 'Kế hoạch gốc', 'Tháo/Lắp TB ĐK', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'plan', ''),
  ('00000000-0000-4000-8000-000000000012', 'WO-OTHER', 'TAG-OTHER', 'Nhóm khác', 'TB Đo lường', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'plan', ''),
  ('00000000-0000-4000-8000-000000000013', 'WO-MISSING', 'TAG-MISSING', 'Vắng khỏi Sheet', 'Tháo/Lắp TB ĐK', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'plan', '');
insert into public.progress(task_id, user_id, report_date, percent, note, photo_path, photo_paths) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000002', '2026-09-07', 25, 'Ghi chú gốc', 'photo-a', array['photo-a', 'photo-b']);

do $$
declare
  actor uuid := '00000000-0000-4000-8000-000000000001';
  person uuid := '00000000-0000-4000-8000-000000000002';
  other uuid := '00000000-0000-4000-8000-000000000003';
  version text;
  before_state jsonb;
  result jsonb;
  base jsonb;
  existing jsonb;
  outside jsonb;
  task_count integer;
begin
  assert not has_function_privilege('anon', 'public.import_bdtt_thao_lap(uuid,text,text,text,jsonb)', 'execute'), 'anon must not execute';
  assert not has_function_privilege('authenticated', 'public.get_bdtt_thao_lap_import_state()', 'execute'), 'authenticated must not read import state directly';
  assert has_function_privilege('service_role', 'public.import_bdtt_thao_lap(uuid,text,text,text,jsonb)', 'execute'), 'service role can execute';
  base := jsonb_build_object('id', null, 'wo', 'WO-NEW', 'tagname', 'TAG-NEW', 'task_name', 'Phát sinh độc lập',
    'nhom', 'Tháo/Lắp TB ĐK', 'don_vi', '', 'section', 'PN1', 'duration', '8 hours', 'priority', 2,
    'start_date', '2026-09-07', 'finish_date', '2026-09-08', 'resource_name', 'Đinh Văn Triển', 'nhom_truong', 'Phạm Quyết Chiến',
    'assigned_to', person, 'reporter_id', person, 'progress_mode', 'continuous', 'is_cancelled', false, 'cancel_reason', '', 'sheetRow', 3,
    'reports', jsonb_build_array(jsonb_build_object('report_date', '2026-09-07', 'percent', 50, 'note', null)));
  existing := base || jsonb_build_object('id', '00000000-0000-4000-8000-000000000011', 'wo', 'WO-PLAN', 'tagname', 'TAG-PLAN', 'is_cancelled', true, 'cancel_reason', 'Bỏ công việc theo thực tế');
  outside := base || jsonb_build_object('id', '00000000-0000-4000-8000-000000000012', 'wo', 'WO-OTHER', 'tagname', 'TAG-OTHER');
  version := public.get_bdtt_thao_lap_import_state()->>'version';
  before_state := public.get_bdtt_thao_lap_import_state();

  begin
    perform public.import_bdtt_thao_lap(other, repeat('a',64), version, 'IMPORT_THAO_LAP', jsonb_build_array(base));
    raise exception 'Expected denied actor';
  exception when insufficient_privilege then null; end;
  begin
    perform public.import_bdtt_thao_lap(actor, repeat('a',64), 'stale', 'IMPORT_THAO_LAP', jsonb_build_array(base));
    raise exception 'Expected stale version';
  exception when serialization_failure then null; end;
  -- First row is valid; second row must fail and roll back the first insert.
  begin
    perform public.import_bdtt_thao_lap(actor, repeat('a',64), version, 'IMPORT_THAO_LAP', jsonb_build_array(base, outside));
    raise exception 'Expected out-of-group rejection';
  exception when insufficient_privilege then null; end;
  assert before_state = public.get_bdtt_thao_lap_import_state(), 'failed batch must leave all data unchanged';
  assert (select count(*) from public.bdtt_task_events) = 0, 'no partial history';
  assert (select count(*) from public.google_sheet_sync_runs where run_type='group_import') = 0, 'no partial receipt';

  result := public.import_bdtt_thao_lap(actor, repeat('a',64), version, 'IMPORT_THAO_LAP', jsonb_build_array(base, existing));
  assert result->>'added' = '1' and result->>'updated' = '1' and result->>'progress' = '2' and result->>'cancelled' = '1', 'wrong import counts';
  assert (select task_source from public.tasks where wo='WO-NEW') = 'ad_hoc', 'new WO must be ad hoc';
  assert (select task_source from public.tasks where wo='WO-PLAN') = 'plan', 'original source must survive';
  assert (select is_cancelled from public.tasks where wo='WO-PLAN'), 'explicit cancellation';
  assert not (select is_cancelled from public.tasks where wo='WO-MISSING'), 'missing row must not cancel';
  assert (select task_name from public.tasks where wo='WO-OTHER') = 'Nhóm khác', 'other group changed';
  assert (select count(*) from public.progress where task_id='00000000-0000-4000-8000-000000000011') = 1, 'report duplicated';
  assert (select percent=50 and note='Ghi chú gốc' and photo_paths=array['photo-a','photo-b'] and photo_path='photo-a' and submitted_by=actor
    from public.progress where task_id='00000000-0000-4000-8000-000000000011'), 'preserve notes/photos and record actor';
  assert exists(select 1 from public.bdtt_task_events where event_type='report_updated' and details->'previous_reports'->0->>'percent'='25'), 'old progress history missing';
  before_state := public.get_bdtt_thao_lap_import_state();
  result := public.import_bdtt_thao_lap(actor, repeat('b',64), before_state->>'version', 'IMPORT_THAO_LAP', '[]');
  assert result->>'added'='0' and before_state=public.get_bdtt_thao_lap_import_state(), 'no-change import mutated data';

  -- Assignment changes invalidate a preview, and explicit org overrides beat the seed.
  update public.profiles set org_group='TB Đo lường', org_role='member' where id=person;
  assert not public.is_bdtt_thao_lap_profile((select p from public.profiles p where id=person)), 'old seed must not override reassignment';
  begin
    perform public.import_bdtt_thao_lap(actor, repeat('c',64), before_state->>'version', 'IMPORT_THAO_LAP', '[]');
    raise exception 'Expected concurrent profile change rejection';
  exception when serialization_failure then null; end;
  update public.profiles set org_group=null, org_role=null where id=person;
  insert into public.bdtt_trial_runs(name, created_by) values ('Local test demo', actor);
  begin
    perform public.import_bdtt_thao_lap(actor, repeat('c',64), public.get_bdtt_thao_lap_import_state()->>'version', 'IMPORT_THAO_LAP', '[]');
    raise exception 'Expected Demo Mode rejection';
  exception when serialization_failure then null; end;
  raise notice 'PASS: permissions, scope, atomic rollback, add/update/cancel, notes/photos/history, version checks, no-op, demo';
end $$;
rollback;
