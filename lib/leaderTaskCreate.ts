import { getOrgTaskSubgroup } from "@/lib/org2026";
import type { Profile, Task } from "@/types/domain";

export interface LeaderTaskCreateRequiredInput {
  readonly taskName: unknown;
  readonly tagname?: unknown;
  readonly wo: unknown;
  readonly donVi: unknown;
  readonly section: unknown;
  readonly startDate: unknown;
  readonly finishDate: unknown;
  readonly priority: unknown;
  readonly progressMode: unknown;
  readonly assigneeUsername: unknown;
  readonly reporterUsername: unknown;
}

const hasText = (value: unknown): boolean =>
  typeof value === "string" && value.trim().length > 0;

type TaskOrgPerson = Pick<Profile, "fullName" | "username" | "orgGroup" | "subgroup" | "orgRole">;

export const inferLeaderTaskOrg = (
  assignee: TaskOrgPerson | null,
  reporter: TaskOrgPerson | null,
  people: readonly TaskOrgPerson[]
): { readonly orgGroup: string; readonly subgroup: string; readonly leaderName: string | null } | null => {
  if (!assignee || !reporter) return null;
  const orgGroup = assignee.orgGroup.trim();
  if (!orgGroup || orgGroup !== reporter.orgGroup.trim()) return null;

  const assigneeSubgroup = getOrgTaskSubgroup(assignee.username, assignee.subgroup);
  const reporterSubgroup = getOrgTaskSubgroup(reporter.username, reporter.subgroup);
  if (assigneeSubgroup && reporterSubgroup && assigneeSubgroup !== reporterSubgroup) {
    return null;
  }

  const leader = people.find((person) =>
    person.orgGroup.trim() === orgGroup && person.orgRole === "nhomTruong"
  );
  return {
    orgGroup,
    subgroup: assigneeSubgroup || reporterSubgroup,
    leaderName: leader?.fullName.trim() || null
  };
};

export const getLeaderTaskLocations = (
  tasks: readonly Pick<Task, "donVi" | "section">[]
): { readonly unit: string; readonly sections: readonly string[] }[] => {
  const sectionsByUnit = new Map<string, Set<string>>();
  tasks.forEach((task) => {
    const unit = task.donVi.trim();
    const section = task.section.trim();
    if (!unit || !section) return;
    const sections = sectionsByUnit.get(unit) ?? new Set<string>();
    sections.add(section);
    sectionsByUnit.set(unit, sections);
  });
  return [...sectionsByUnit].sort(([left], [right]) => left.localeCompare(right, "vi"))
    .map(([unit, sections]) => ({
      unit,
      sections: [...sections].sort((left, right) => left.localeCompare(right, "vi"))
    }));
};

export const getMissingLeaderTaskCreateFields = (
  input: LeaderTaskCreateRequiredInput
): string[] => {
  const missingFields: string[] = [];

  if (!hasText(input.taskName)) missingFields.push("Tên công việc");
  if (!hasText(input.wo)) missingFields.push("WorkOrder");
  if (!hasText(input.donVi)) missingFields.push("Đơn vị chủ quản");
  if (!hasText(input.section)) missingFields.push("Section");
  if (!hasText(input.startDate)) missingFields.push("Ngày bắt đầu");
  if (!hasText(input.finishDate)) missingFields.push("Ngày kết thúc");
  if (![1, 2, 3].includes(Number(input.priority))) missingFields.push("Mức ưu tiên");
  if (input.progressMode !== "continuous" && input.progressMode !== "binary") {
    missingFields.push("Chế độ tiến độ");
  }
  if (!hasText(input.assigneeUsername)) missingFields.push("Người thực hiện");
  if (!hasText(input.reporterUsername)) missingFields.push("Người báo cáo");

  return missingFields;
};
