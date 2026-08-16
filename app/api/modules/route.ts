import { NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/api/session";
import {
  PORTAL_MODULES,
  getPortalModuleHref,
  type AccessiblePortalModule,
  type PortalModuleDefinition
} from "@/lib/portalModules";
import { isIconName } from "@/components/ui/Icon";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toErrorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

interface DbModule {
  readonly key: string;
  readonly label: string;
  readonly short_label: string;
  readonly description: string;
  readonly icon: string;
  readonly admin_href: string;
  readonly worker_href: string;
  readonly default_access: boolean;
}

interface DbMembership {
  readonly module_key: string;
  readonly role: string;
}

const toModule = (row: DbModule): PortalModuleDefinition => ({
  key: row.key,
  label: row.label,
  shortLabel: row.short_label,
  description: row.description,
  icon: isIconName(row.icon) ? row.icon : "workorder",
  adminHref: row.admin_href,
  workerHref: row.worker_href,
  defaultAccess: row.default_access
});

export const GET = async (request: Request): Promise<NextResponse> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return toErrorResponse("Chua cau hinh Supabase server env cho cong tac.", 503);
  }
  const auth = await getAuthenticatedProfile(request, supabase);
  if (!auth.ok) return toErrorResponse(auth.error, auth.status);

  const [moduleResult, membershipResult] = await Promise.all([
    supabase
      .from("app_modules")
      .select("key, label, short_label, description, icon, admin_href, worker_href, default_access")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("app_module_memberships")
      .select("module_key, role")
      .eq("profile_id", auth.profile.id)
      .eq("is_active", true)
  ]);

  const migrationMissing = moduleResult.error?.message.toLowerCase().includes("app_modules");
  let definitions: readonly PortalModuleDefinition[];
  let roleByModule = new Map<string, string>();

  if (migrationMissing) {
    definitions = PORTAL_MODULES;
    const { data: amRole, error: amRoleError } = await supabase
      .from("am_module_roles")
      .select("role")
      .eq("profile_id", auth.profile.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!amRoleError && amRole) roleByModule.set("am", String(amRole.role));
  } else {
    if (moduleResult.error) return toErrorResponse(moduleResult.error.message, 500);
    if (membershipResult.error) return toErrorResponse(membershipResult.error.message, 500);
    definitions = ((moduleResult.data ?? []) as DbModule[]).map(toModule);
    roleByModule = new Map(
      ((membershipResult.data ?? []) as DbMembership[]).map((row) => [row.module_key, row.role])
    );
  }

  const modules: AccessiblePortalModule[] = definitions
    .filter((module) => module.defaultAccess || roleByModule.has(module.key))
    .map((module) => ({
      ...module,
      href: getPortalModuleHref(module, auth.profile.role),
      role: roleByModule.get(module.key)
    }));

  return NextResponse.json({ ok: true, modules });
};
