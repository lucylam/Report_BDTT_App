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

Do not disable RLS. The migrations enable RLS and add policies.

## 3. Configure Auth

Open `Authentication > Providers > Email`.

Recommended settings for this internal app:

- Email provider: enabled.
- Confirm email: disabled for the first internal rollout.
- Secure email change: enabled if available.

The app can keep the username login UX by converting local-part usernames to
PVCFC email addresses, for example `thanhcm` to `thanhcm@pvcfc.com.vn`.

## 4. Create worker/admin users

For each worker:

1. Open `Authentication > Users`.
2. Click `Add user`.
3. Email: full PVCFC email, for example `thanhcm@pvcfc.com.vn`.
4. Password: `123456`.
5. Auto confirm user: enabled.

Then insert or import the matching row in `public.profiles`.

Important profile fields:

- `id`: must equal the auth user id.
- `email`: full email.
- `username`: email local-part in lowercase.
- `role`: `admin` or `worker`.
- `must_change_password`: `true` for initial accounts.

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

Do not expose the Supabase service role key in client code.
