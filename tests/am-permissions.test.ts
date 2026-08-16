import { describe, expect, it } from "vitest";
import { getAmPermissions } from "@/lib/api/am";

describe("AM module permissions", () => {
  it("gives the AM leader roster, assignment and review rights", () => {
    expect(getAmPermissions("leader")).toMatchObject({
      canManageTeam: true,
      canAssign: true,
      canAssignOutsideTeam: false,
      canReview: true,
      canViewAll: true
    });
  });

  it("lets the workshop manager assign outside the team and review", () => {
    expect(getAmPermissions("workshop_manager")).toMatchObject({
      canManageTeam: false,
      canAssign: true,
      canAssignOutsideTeam: true,
      canReview: true,
      canViewAll: true
    });
  });

  it("keeps web administration separate from business approval", () => {
    expect(getAmPermissions("web_admin")).toMatchObject({
      canManageTeam: false,
      canAssign: true,
      canAssignOutsideTeam: true,
      canReview: false,
      canViewAll: true
    });
  });

  it("limits members to assigned work", () => {
    expect(getAmPermissions("member")).toMatchObject({
      canAccess: true,
      canManageTeam: false,
      canAssign: false,
      canReview: false,
      canViewAll: false
    });
  });
});
