import { describe, expect, it } from "vitest";
import { parseBootstrapSheet } from "@/lib/google/bootstrap";

const headers = Array.from({ length: 33 }, () => "");
headers[0] = "Stt";
headers[1] = "Task Name";
headers[2] = "WO";
headers[3] = "Tagname";
headers[11] = "Resource Names";
headers[32] = "Chế độ tiến độ";

describe("Google Sheet bootstrap", () => {
  it("đọc A:AG, ánh xạ nhân sự và phát hiện trùng Tag + WO", () => {
    const row = Array.from({ length: 33 }, () => "") as Array<string | number>;
    row[0] = 1;
    row[1] = "Bảo dưỡng";
    row[2] = "WO-01";
    row[3] = "TAG-01";
    row[11] = "Nguyễn Văn A";
    row[32] = "0/100";
    const duplicate = [...row];
    duplicate[0] = 2;
    const preview = parseBootstrapSheet(
      [headers, row, duplicate],
      [{ id: "profile-a", username: "a", resourceName: "Nguyễn Văn A" }]
    );

    expect(preview.rowCount).toBe(2);
    expect(preview.tasks[0].assignedTo).toBe("profile-a");
    expect(preview.tasks[0].progressMode).toBe("binary");
    expect(preview.duplicateKeys).toEqual(["TAG-01|WO-01"]);
    expect(preview.missingColumns).toEqual([]);
  });

  it("báo dòng thiếu dữ liệu và người chưa ánh xạ", () => {
    const row = Array.from({ length: 33 }, () => "") as Array<string | number>;
    row[0] = 1;
    row[3] = "TAG-X";
    row[11] = "Không tồn tại";
    row[32] = "0-100";
    const preview = parseBootstrapSheet([headers, row], []);

    expect(preview.incompleteRows).toEqual([3]);
    expect(preview.unmappedResourceNames).toEqual(["Không tồn tại"]);
  });
});
