import { NextResponse } from "next/server";
import { forbiddenOriginMessage, isAllowedRequestOrigin } from "@/lib/api/security";
import { getAuthenticatedPersonnelAdmin } from "@/lib/api/session";
import {
  ORG_GROUP_NAMES,
  getOrgSubgroups,
  isOrgRole
} from "@/lib/org2026";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface PersonnelUpdateBody {
  readonly username?: string;
  readonly orgGroup?: string;
  readonly subgroup?: string;
  readonly orgRole?: string;
}

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const errorResponse = (error: string, status: number): NextResponse =>
  NextResponse.json({ ok: false, error }, { status });

export const PATCH = async (request: Request): Promise<NextResponse> => {
  if (!isAllowedRequestOrigin(request)) {
    return errorResponse(forbiddenOriginMessage, 403);
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return errorResponse("Chưa cấu hình Supabase server.", 503);
  }

  const auth = await getAuthenticatedPersonnelAdmin(request, supabase);
  if (!auth.ok) return errorResponse(auth.error, auth.status);

  const body = (await request.json().catch(() => null)) as PersonnelUpdateBody | null;
  const username = text(body?.username).toLowerCase();
  const orgGroup = text(body?.orgGroup);
  let subgroup = text(body?.subgroup);
  const orgRole = text(body?.orgRole);

  if (!username) return errorResponse("Thiếu nhân sự cần cập nhật.", 400);
  if (!ORG_GROUP_NAMES.some((group) => group === orgGroup)) {
    return errorResponse("Nhóm nhân sự không hợp lệ.", 400);
  }
  if (!isOrgRole(orgRole) || orgRole === "placeholder") {
    return errorResponse("Vai trò nhân sự không hợp lệ.", 400);
  }

  if (["toTruong", "nhomTruong", "nhomPho", "supervisor"].includes(orgRole)) {
    subgroup = "";
  }

  const allowedSubgroups = getOrgSubgroups(orgGroup);
  if (subgroup && !allowedSubgroups.includes(subgroup)) {
    return errorResponse("Phân nhóm không thuộc nhóm đã chọn.", 400);
  }
  if (orgRole === "pnt" && !subgroup) {
    return errorResponse("Vai trò PNT bắt buộc chọn phân nhóm.", 400);
  }

  const { data, error } = await supabase.rpc("update_bdtt_personnel_org", {
    actor_profile_id: auth.profile.id,
    target_username: username,
    next_org_group: orgGroup,
    next_subgroup: subgroup,
    next_org_role: orgRole
  });

  if (error) {
    const missingMigration =
      error.message.toLowerCase().includes("update_bdtt_personnel_org") ||
      error.message.toLowerCase().includes("schema cache");
    return errorResponse(
      missingMigration
        ? "Chưa áp dụng migration 20260822_bdtt_personnel_org_management.sql."
        : error.message,
      missingMigration ? 503 : 400
    );
  }

  return NextResponse.json({ ok: true, profile: data });
};
