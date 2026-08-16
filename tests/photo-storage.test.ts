import { describe, expect, it } from "vitest";
import {
  canAccessPhotoPath,
  createTaskPhotoPath,
  parsePhotoDataUrl
} from "@/lib/api/photoStorage";
import {
  getPhotoDataUrlSizeBytes,
  MAX_COMPRESSED_PHOTO_BYTES,
  MAX_SOURCE_PHOTO_BYTES,
  MAX_SOURCE_PHOTO_MEGABYTES
} from "@/lib/photo";

describe("photo storage helpers", () => {
  it("parses compressed JPEG data URLs", () => {
    const parsed = parsePhotoDataUrl("data:image/jpeg;base64,/9j/4AAQSkZJRg==");
    expect(parsed.mimeType).toBe("image/jpeg");
    expect(parsed.bytes.length).toBeGreaterThan(0);
  });

  it("allows large source photos while keeping the compressed upload budget smaller", () => {
    expect(MAX_SOURCE_PHOTO_BYTES).toBe(MAX_SOURCE_PHOTO_MEGABYTES * 1024 * 1024);
    expect(MAX_COMPRESSED_PHOTO_BYTES).toBe(Math.round(1.25 * 1024 * 1024));
    expect(getPhotoDataUrlSizeBytes("data:image/jpeg;base64,AQIDBA==")).toBe(4);
  });

  it("rejects non-JPEG data URLs", () => {
    expect(() =>
      parsePhotoDataUrl("data:image/png;base64,iVBORw0KGgo=")
    ).toThrow("JPEG");
  });

  it("creates deterministic task photo paths", () => {
    expect(
      createTaskPhotoPath({
        profileId: "profile 1",
        taskId: "task/abc",
        reportDate: "2026-07-08",
        timestamp: new Date("2026-07-08T01:02:03.456Z")
      })
    ).toBe("profile-1/task-abc/2026-07-08-2026-07-08T01-02-03-456Z.jpg");
  });

  it("limits worker access to their own photo folder and lets admin view all", () => {
    expect(
      canAccessPhotoPath({ id: "profile-1", role: "worker" }, "profile-1/task/a.jpg")
    ).toBe(true);
    expect(
      canAccessPhotoPath({ id: "profile-1", role: "worker" }, "profile-2/task/a.jpg")
    ).toBe(false);
    expect(
      canAccessPhotoPath({ id: "admin-1", role: "admin" }, "profile-2/task/a.jpg")
    ).toBe(true);
  });
});
