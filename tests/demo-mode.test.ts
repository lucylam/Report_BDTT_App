import { describe, expect, it } from "vitest";
import { isTrialRunContextCurrent } from "@/lib/api/demoMode";

describe("BDTT demo mode context", () => {
  it("chấp nhận thao tác khi mã đợt thử khớp", () => {
    expect(isTrialRunContextCurrent("trial-2026", "trial-2026")).toBe(true);
  });

  it("chặn dữ liệu offline của đợt thử cũ sau khi chuyển sang dùng thật", () => {
    expect(isTrialRunContextCurrent("trial-2026", null)).toBe(false);
  });

  it("chặn trang cũ ở chế độ thật khi admin vừa bật dùng thử", () => {
    expect(isTrialRunContextCurrent(null, "trial-2026")).toBe(false);
  });

  it("chấp nhận thao tác chính thức khi Demo Mode đang tắt", () => {
    expect(isTrialRunContextCurrent(undefined, null)).toBe(true);
  });
});
