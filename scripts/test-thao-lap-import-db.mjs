import { readFileSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";

// Uses only this disposable Docker container; never reads application credentials.
const container = "bdtt-thao-lap-local-test";
const database = `thao_lap_test_${Date.now()}`;
const run = (args, input) => {
  const result = spawnSync("docker", args, { input, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || result.error?.message);
  return result.stdout;
};
const info = JSON.parse(run(["inspect", container]))[0];
if (!info.Config.Image.startsWith("postgres:16") || Object.values(info.HostConfig.PortBindings ?? {}).some(Boolean)) {
  throw new Error("Expected an isolated PostgreSQL 16 test container without published ports.");
}
run(["exec", container, "createdb", "-U", "postgres", database]);
const sql = (source) => run(["exec", "-i", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", database], source);
try {
  sql(`do $$ begin
    if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
    if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
    if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
  end $$;
  create schema auth;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql as 'select null::uuid';
  create schema storage;
  create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects(id uuid primary key, bucket_id text, name text);
  create function storage.foldername(text) returns text[] language sql as 'select string_to_array($1, ''/'')';`);
  const migrations = readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort();
  for (const name of migrations) sql(readFileSync(`supabase/migrations/${name}`, "utf8"));
  // Run the new migration twice to verify repeatability.
  sql(readFileSync("supabase/migrations/20260907000100_bdtt_thao_lap_import.sql", "utf8"));
  console.log(sql(readFileSync("tests/sql/thao-lap-import.sql", "utf8")));
  console.log("PASS: existing migrations + import migration and PostgreSQL transaction checks");
} finally {
  run(["exec", container, "dropdb", "-U", "postgres", database]);
}
