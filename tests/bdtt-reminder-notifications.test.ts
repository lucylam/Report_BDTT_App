import { describe, expect, it } from "vitest";
import {
  createBdttReminderNotificationId,
  getBdttReportActionWindow,
  getBdttReminderPhase,
  getMissingBdttReporters
} from "@/lib/api/bdttReminderNotifications";

describe("BDTT reminder notifications", () => {
  it("uses the 13:30 and 14:00 Vietnam time boundaries", () => {
    expect(getBdttReminderPhase(new Date("2026-09-15T06:29:59.000Z"))).toBe("none");
    expect(getBdttReminderPhase(new Date("2026-09-15T06:30:00.000Z"))).toBe("reporter");
    expect(getBdttReminderPhase(new Date("2026-09-15T06:59:59.000Z"))).toBe("reporter");
    expect(getBdttReminderPhase(new Date("2026-09-15T07:00:00.000Z"))).toBe("summary");
  });

  it("creates a stable unique notification id for each daily recipient context", () => {
    const first = createBdttReminderNotificationId("bdtt:live:2026-09-15:user-a");
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(createBdttReminderNotificationId("bdtt:live:2026-09-15:user-a")).toBe(first);
    expect(createBdttReminderNotificationId("bdtt:live:2026-09-15:user-b")).not.toBe(first);
  });

  it("counts report actions by the Vietnam calendar day, independent of report_date", () => {
    expect(getBdttReportActionWindow("2026-09-15")).toEqual({
      start: "2026-09-14T17:00:00.000Z",
      end: "2026-09-15T17:00:00.000Z"
    });
  });

  it("lists only missing reporting-role profiles inside the requested group", () => {
    const profiles = [
      { id: "a", fullName: "An", orgGroup: "Nhóm 1" },
      { id: "b", fullName: "Bình", orgGroup: "Nhóm 1" },
      { id: "c", fullName: "Cường", orgGroup: "Nhóm 2" }
    ];
    expect(
      getMissingBdttReporters({
        profiles,
        reportingRoleIds: new Set(["a", "b", "c"]),
        submittedReporterIds: new Set(["a"]),
        orgGroup: "Nhóm 1"
      }).map((profile) => profile.id)
    ).toEqual(["b"]);
  });
});
