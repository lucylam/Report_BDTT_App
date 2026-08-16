-- Allow manual worker progress values while keeping percent bounded.
alter table public.progress
  drop constraint if exists progress_percent_check,
  drop constraint if exists progress_percent_range_check,
  add constraint progress_percent_range_check check (percent between 0 and 100);
