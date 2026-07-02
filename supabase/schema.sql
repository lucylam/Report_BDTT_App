-- Draft schema for the BDTT Maintenance Progress Web App.
-- Apply migrations from /supabase/migrations only after environment confirmation.

\i ./migrations/20250822_initial_schema.sql
\i ./migrations/20260608_production_persistence.sql
\i ./migrations/20260608_data_admin_permissions.sql
\i ./migrations/20260702_profile_password_hash.sql
