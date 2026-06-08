import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PASSWORD = "123456";
const INTERNAL_AUTH_DOMAIN = "bdtt.local";
const ACCOUNT_SOURCE = "lib/accounts.ts";

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const shouldResetPassword = args.has("--reset-password");

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    [
      "Missing required environment variables.",
      "Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.",
      "Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.",
      "",
      "Example:",
      "$env:SUPABASE_URL='https://xxxx.supabase.co'",
      "$env:SUPABASE_SECRET_KEY='sb_secret_xxx'",
      "npm run seed:supabase-users -- --dry-run"
    ].join("\n")
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const getUsername = (email) => email.split("@")[0]?.trim().toLowerCase() ?? email;
const getInternalEmail = (username) => `${username}@${INTERNAL_AUTH_DOMAIN}`;
const toResourceName = (fullName) => fullName.toUpperCase();

const extractBlock = (source, name) => {
  const start = source.indexOf(`const ${name}`);
  if (start === -1) {
    throw new Error(`Cannot find ${name} in ${ACCOUNT_SOURCE}`);
  }

  const end = source.indexOf("];", start);
  if (end === -1) {
    throw new Error(`Cannot find end of ${name} in ${ACCOUNT_SOURCE}`);
  }

  return source.slice(start, end);
};

const parseSeedRows = (block) => {
  const rows = [];
  const rowPattern =
    /\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"(?:\s*,\s*"([^"]+)")?\s*\]/g;

  for (const match of block.matchAll(rowPattern)) {
    rows.push({
      fullName: match[1],
      employeeCode: match[2],
      sourceEmail: match[3],
      explicitRole: match[4] ?? null
    });
  }

  return rows;
};

const parseAdminUsernames = (source) => {
  const start = source.indexOf("const adminUsernames");
  if (start === -1) return new Set();

  const end = source.indexOf("].map", start);
  if (end === -1) return new Set();

  const block = source.slice(start, end);
  return new Set(
    [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1].toLowerCase())
  );
};

const loadAccounts = async () => {
  const source = await readFile(path.join(process.cwd(), ACCOUNT_SOURCE), "utf8");
  const resourceSeeds = parseSeedRows(extractBlock(source, "resourceSeeds"));
  const adminSeeds = parseSeedRows(extractBlock(source, "adminSeeds"));
  const adminUsernames = parseAdminUsernames(source);

  return [...resourceSeeds, ...adminSeeds].map((seed) => {
    const username = getUsername(seed.sourceEmail);
    const role = adminUsernames.has(username)
      ? "admin"
      : seed.explicitRole ?? "worker";

    return {
      authEmail: getInternalEmail(username),
      username,
      employeeCode: seed.employeeCode,
      fullName: seed.fullName,
      resourceName: toResourceName(seed.fullName),
      nhom: role === "admin" ? "Supervisor" : "Chưa phân nhóm",
      nhomTruong: "",
      role,
      sourceEmail: seed.sourceEmail.toLowerCase()
    };
  });
};

const listAllUsers = async () => {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
};

const createOrUpdateAuthUser = async (account, existingUser) => {
  if (isDryRun) {
    return {
      id: existingUser?.id ?? "dry-run-user-id",
      action: existingUser ? "exists" : "create"
    };
  }

  if (existingUser) {
    if (!shouldResetPassword) {
      return { id: existingUser.id, action: "exists" };
    }

    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: account.username,
        full_name: account.fullName
      }
    });

    if (error) {
      throw new Error(`Failed to reset password for ${account.username}: ${error.message}`);
    }

    return { id: data.user.id, action: "reset-password" };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.authEmail,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: {
      username: account.username,
      full_name: account.fullName
    }
  });

  if (error) {
    throw new Error(`Failed to create ${account.username}: ${error.message}`);
  }

  return { id: data.user.id, action: "create" };
};

const upsertProfile = async (account, authUserId) => {
  const profile = {
    id: authUserId,
    email: account.authEmail,
    username: account.username,
    employee_code: account.employeeCode,
    full_name: account.fullName,
    resource_name: account.resourceName,
    nhom: account.nhom,
    nhom_truong: account.nhomTruong,
    role: account.role,
    must_change_password: true,
    is_active: true
  };

  if (isDryRun) return;

  const { error } = await supabase.from("profiles").upsert(profile, {
    onConflict: "id"
  });

  if (error) {
    throw new Error(`Failed to upsert profile ${account.username}: ${error.message}`);
  }
};

const main = async () => {
  const accounts = await loadAccounts();
  const duplicateUsernames = accounts
    .map((account) => account.username)
    .filter((username, index, usernames) => usernames.indexOf(username) !== index);

  if (duplicateUsernames.length > 0) {
    throw new Error(`Duplicate usernames: ${[...new Set(duplicateUsernames)].join(", ")}`);
  }

  const existingUsers = await listAllUsers();
  const usersByEmail = new Map(
    existingUsers.map((user) => [user.email?.toLowerCase(), user])
  );

  const summary = {
    create: 0,
    exists: 0,
    "reset-password": 0
  };

  for (const account of accounts) {
    const existingUser = usersByEmail.get(account.authEmail);
    const result = await createOrUpdateAuthUser(account, existingUser);
    await upsertProfile(account, result.id);
    summary[result.action] += 1;

    console.log(
      `${isDryRun ? "[dry-run] " : ""}${result.action.padEnd(14)} ${account.username.padEnd(
        10
      )} ${account.role.padEnd(6)} ${account.authEmail}`
    );
  }

  console.log("");
  console.log(
    `Done. total=${accounts.length}, create=${summary.create}, exists=${summary.exists}, reset-password=${summary["reset-password"]}`
  );
  if (isDryRun) {
    console.log("Dry run only. No Auth users or profiles were changed.");
  }
};

main().catch((error) => {
  console.error("[seed-supabase-users]", error);
  process.exit(1);
});
