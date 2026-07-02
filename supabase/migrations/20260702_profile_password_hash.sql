-- Store internal-login password hashes without using Supabase Auth login.
alter table public.profiles
add column if not exists password_hash text;
