# Internal Account Seed Notes

Production should create Supabase Auth email/password users for each account in `lib/accounts.ts`.

Rules:
- Username shown in the UI is the internal account name, for example `thanhcm`.
- Supabase Auth email uses an internal identifier: `{username}@bdtt.local`.
- PVCFC email from the seed list is reference/contact data only, not the login account.
- Initial password is `123456`.
- `profiles.must_change_password` starts as `true`.
- After first login, user must change password and the app sets `must_change_password = false`.
- Do not store plaintext passwords in `profiles`; internal login uses `profiles.password_hash`.
- Do not place the Supabase service role key in client code.

Suggested server-side creation flow:
1. Admin uploads/maintains account CSV.
2. A server-only script uses `SUPABASE_SERVICE_ROLE_KEY`.
3. For each row, call `auth.admin.createUser`.
4. Insert/update `profiles` with `email`, `username`, `employee_code`, `full_name`, `resource_name`, and `role`.
5. Force password change by checking `profiles.must_change_password` after login.
