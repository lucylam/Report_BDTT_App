import { describe, expect, it } from "vitest";
import {
  isPercentAllowedForMode,
  normalizeProgressMode,
  toProgressModeCell
} from "@/lib/progressMode";

describe("progress mode", () => {
  it("maps cột AG sang chế độ nội bộ và xuất ngược đúng hợp đồng", () => {
    expect(normalizeProgressMode("0-100")).toBe("continuous");
    expect(normalizeProgressMode("0/100")).toBe("binary");
    expect(toProgressModeCell("continuous")).toBe("0-100");
    expect(toProgressModeCell("binary")).toBe("0/100");
  });

  it("chỉ cho phép 0 hoặc 100 ở chế độ binary", () => {
    expect(isPercentAllowedForMode(0, "binary")).toBe(true);
    expect(isPercentAllowedForMode(100, "binary")).toBe(true);
    expect(isPercentAllowedForMode(50, "binary")).toBe(false);
    expect(isPercentAllowedForMode(37, "continuous")).toBe(true);
    expect(isPercentAllowedForMode(101, "continuous")).toBe(false);
  });
});
