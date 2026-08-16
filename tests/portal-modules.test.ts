import { describe, expect, it } from "vitest";
import {
  PORTAL_MODULES,
  getNotificationHref,
  getPortalModule,
  getPortalModuleHref
} from "@/lib/portalModules";

describe("portal module registry", () => {
  it("khai báo khóa công tác duy nhất", () => {
    const keys = PORTAL_MODULES.map((module) => module.key);

    expect(keys).toEqual(["bdtt", "am"]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(getPortalModule("am")?.label).toBe("Công tác AM");
  });

  it("điều hướng BDTT theo vai trò tài khoản", () => {
    expect(getPortalModuleHref("bdtt", "admin")).toBe("/admin");
    expect(getPortalModuleHref("bdtt", "worker")).toBe("/worker");
    expect(getPortalModuleHref("am", "admin")).toBe("/am");
  });

  it("tạo đường dẫn thông báo theo công tác", () => {
    expect(getNotificationHref("am", "task 01")).toBe("/am?task=task%2001");
    expect(getNotificationHref("bdtt", "task-01")).toBe("/");
    expect(getNotificationHref("future", undefined, "/future/items/1")).toBe("/future/items/1");
    expect(getNotificationHref("future")).toBe("/future");
  });
});
