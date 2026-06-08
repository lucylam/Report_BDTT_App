# Supabase Production Setup

Use this guide when creating the real database from the Supabase web UI.

## 1. Create project

1. Go to https://supabase.com/dashboard.
2. Create a new organization or use an existing one.
3. Create a new project named `bdtt-webapp`.
4. Choose the nearest region for the plant users.
5. Save the database password in a secure place.

## 2. Apply SQL migrations

Open `SQL Editor` and run the migration files in this order:

1. `supabase/migrations/20250822_initial_schema.sql`
2. `supabase/migrations/20260608_production_persistence.sql`
3. `supabase/migrations/20260608_data_admin_permissions.sql`

Do not disable RLS. The migrations enable RLS and add policies.

Only `vinhlpp` can import/export DATA. Other admin accounts can view the
dashboard and task lists, but cannot access the DATA import/export screen.

## 3. Configure Auth

Open `Authentication > Providers > Email`.

Recommended settings for this internal app:

- Email provider: enabled.
- Confirm email: disabled for the first internal rollout.
- Secure email change: enabled if available.

The app should keep the username login UX by converting local-part usernames to
internal Supabase-only auth identifiers.

Use this convention:

```text
{username}@bdtt.local
```

Example:

```text
thanhcm -> thanhcm@bdtt.local
```

This address is only an internal Supabase Auth identifier. It is not connected to
PVCFC email, does not receive email, and should not be used as a real contact
address.

## 4. Create worker/admin users

Preferred method: run the local seed script after applying the SQL migrations.

Set environment variables in PowerShell:

```powershell
$env:SUPABASE_URL='https://your-project.supabase.co'
$env:SUPABASE_SECRET_KEY='sb_secret_xxx'
```

Preview what the script will do:

```powershell
npm run seed:supabase-users -- --dry-run
```

Create missing Auth users and upsert matching `public.profiles` rows:

```powershell
npm run seed:supabase-users
```

The script is idempotent. Existing Auth users are not duplicated and existing
passwords are not reset by default. To force all seeded accounts back to the
default password, run:

```powershell
npm run seed:supabase-users -- --reset-password
```

Manual method for a quick single-user test:

1. Open `Authentication > Users`.
2. Click `Add user`.
3. Email: internal auth identifier, for example `thanhcm@bdtt.local`.
4. Password: `123456`.
5. Auto confirm user: enabled.

Then insert or import the matching row in `public.profiles`.

Important profile fields:

- `id`: must equal the auth user id.
- `email`: use the same internal auth identifier, for example `thanhcm@bdtt.local`.
- `username`: email local-part in lowercase.
- `role`: `admin` or `worker`.
- `must_change_password`: `true` for initial accounts.

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY` in client-side
code or Vercel public environment variables.

## 5. Storage

The second migration creates private bucket `task-photos`.

Photo paths should use this convention:

```text
{auth_user_id}/{task_id}/{file_name}
```

This keeps RLS simple: workers can manage files only in their own folder, while
admins can read all task photos.

## 6. Vercel environment variables

Set these in Vercel Project Settings > Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Use the publishable key (`sb_publishable_xxx`) as
`NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Do not expose the Supabase secret key (`sb_secret_xxx`) in client code.
