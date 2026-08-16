import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createAmActivity } from "@/lib/amActivity";
import { buildAmReportWorkbookBytes } from "@/lib/amXlsxExport";
import type { Profile } from "@/types/domain";

const tinyPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const profile: Profile = {
  id: "user-1",
  email: "user-1@example.local",
  username: "user1",
  employeeCode: "001",
  fullName: "Nguyễn Văn A",
  resourceName: "Nguyễn Văn A",
  nhom: "AM",
  nhomTruong: "",
  role: "worker",
  orgGroup: "AM",
  subgroup: "AMO",
  orgRole: "member",
  orgTitle: "Nhân sự",
  orgAssignment: "",
  managedGroups: [],
  managedSubgroups: [],
  isPlaceholder: false,
  canLogin: true,
  mustChangePassword: false
};

describe("AM XLSX export", () => {
  it("tạo file xlsx có worksheet, drawing và ảnh đính kèm", () => {
    const activity = {
      ...createAmActivity({
        requestContent: "Máng dây lỏng",
        locationTag: "AMO",
        assigneeIds: ["user-1"],
        scheduledDate: "2026-07-16",
        createdBy: "admin-1"
      }),
      beforePhotos: [{ id: "before-1", url: tinyPng, uploadedBy: "user-1", createdAt: "2026-07-16T00:00:00.000Z" }],
      afterPhotos: [{ id: "after-1", url: tinyPng, uploadedBy: "user-1", createdAt: "2026-07-16T00:00:00.000Z" }],
      status: "submitted" as const,
      performerNote: "Đã xử lý"
    };

    const bytes = buildAmReportWorkbookBytes([activity], [profile]);
    const archiveText = Buffer.from(bytes).toString("latin1");

    expect(bytes.length).toBeGreaterThan(1000);
    expect(archiveText).toContain("xl/worksheets/sheet1.xml");
    expect(archiveText).toContain("xl/drawings/drawing1.xml");
    expect(archiveText).toContain("xl/media/image1.png");
    expect(archiveText).toContain("xl/media/image2.png");
    expect(archiveText).toContain("TPM TAG");
    expect(archiveText).toContain("AMO");

    const workbook = XLSX.read(bytes, { type: "array" });
    const worksheet = workbook.Sheets["Bao cao AM"];
    expect(worksheet).toBeTruthy();
    expect(worksheet.A1?.v).toBe("XỬ LÝ TPM TAG XƯỞNG AMO");
    expect(worksheet.B3?.v).toContain("Máng dây lỏng");
    expect(worksheet.E3?.v).toBe("Chờ duyệt");
  });
});
