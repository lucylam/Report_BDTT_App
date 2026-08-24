export interface LeaderTaskCreateRequiredInput {
  readonly taskName: unknown;
  readonly tagname: unknown;
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

export const getMissingLeaderTaskCreateFields = (
  input: LeaderTaskCreateRequiredInput
): string[] => {
  const missingFields: string[] = [];

  if (!hasText(input.taskName)) missingFields.push("Tên công việc");
  if (!hasText(input.tagname)) missingFields.push("Tagname");
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
