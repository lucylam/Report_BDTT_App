-- Draft schema for the BDTT Maintenance Progress Web App.
-- Apply migrations from /supabase/migrations only after environment confirmation.

\i ./migrations/20250822_initial_schema.sql
\i ./migrations/20260608_production_persistence.sql
\i ./migrations/20260608_data_admin_permissions.sql
\i ./migrations/20260702_profile_password_hash.sql
\i ./migrations/20260708_progress_percent_range.sql
\i ./migrations/20260717_am_workflow.sql
\i ./migrations/20260718_portal_modules.sql
\i ./migrations/20260721_bdtt_field_reporting.sql
\i ./migrations/20260721_bdtt_leader_task_management.sql
