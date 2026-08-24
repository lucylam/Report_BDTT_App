import { describe, expect, it } from "vitest";
import { getBootstrapLockState, parseBootstrapSheet } from "@/lib/google/bootstrap";

const headers = Array.from({ length: 33 }, () => "");
headers[0] = "Stt";
headers[1] = "Task Name";
headers[2] = "WO";
headers[3] = "Tagname";
headers[4] = "Nhóm";
headers[7] = "Duration";
headers[9] = "Start";
headers[10] = "Finish";
headers[11] = "Resource Names";
headers[12] = "Nhóm trưởng";
headers[32] = "Chế độ tiến độ";

describe("Google Sheet bootstrap", () => {
  it("cho khởi tạo lại khi đã có task nhưng chưa có tiến độ", () => {
    expect(getBootstrapLockState(2039, 0)).toMatchObject({
      isLocked: false,
      canReinitialize: true
    });
  });

  it("khóa khởi tạo lại ngay khi có bất kỳ báo cáo tiến độ nào", () => {
    expect(getBootstrapLockState(2039, 1)).toMatchObject({
      isLocked: true,
      canReinitialize: false
    });
  });

  it("đọc A:AG, ánh xạ nhân sự và phát hiện trùng Tag + WO", () => {
    const row = Array.from({ length: 33 }, () => "") as Array<string | number>;
    row[0] = 1;
    row[1] = "Bảo dưỡng";
    row[2] = "WO-01";
    row[3] = "TAG-01";
    row[4] = "TB Đo lường";
    row[7] = "12 hours";
    row[9] = "22/08/2026";
    row[10] = "23/08/2026";
    row[11] = "Nguyễn Văn A";
    row[12] = "Nguyễn Văn B";
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
    expect(preview.incompleteRows).toEqual([]);
    expect(preview.tasks[0]).toMatchObject({
      donVi: "",
      section: "",
      priority: 2,
      startDate: "2026-08-22",
      finishDate: "2026-08-23"
    });
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

  it("chấp nhận các trường không bắt buộc để trống", () => {
    const row = Array.from({ length: 33 }, () => "") as Array<string | number>;
    row[1] = "Kiểm tra thiết bị";
    row[2] = "WO-02";
    row[3] = "TAG-02";
    row[4] = "TB Chấp hành";
    row[7] = "8 hours";
    row[9] = "Sat 19-09-26";
    row[10] = "20-Sep-2026";
    row[11] = "Nguyễn Văn A";
    row[12] = "Trần Văn Hậu";

    const preview = parseBootstrapSheet(
      [headers, row],
      [{ id: "profile-a", username: "a", resourceName: "Nguyễn Văn A" }]
    );

    expect(preview.missingColumns).toEqual([]);
    expect(preview.incompleteRows).toEqual([]);
    expect(preview.tasks[0]).toMatchObject({
      stt: 1,
      donVi: "",
      section: "",
      priority: 2,
      progressMode: "continuous",
      startDate: "2026-09-19",
      finishDate: "2026-09-20"
    });
  });

  it("chặn dòng có dữ liệu nhưng thiếu Tagname", () => {
    const row = Array.from({ length: 33 }, () => "") as Array<string | number>;
    row[1] = "Kiểm tra thiết bị";
    row[2] = "WO-03";
    row[4] = "TB Chấp hành";
    row[7] = "8 hours";
    row[9] = "2026-08-24";
    row[10] = "2026-08-25";
    row[11] = "Nguyễn Văn A";
    row[12] = "Trần Văn Hậu";

    const preview = parseBootstrapSheet([headers, row], []);

    expect(preview.incompleteRows).toEqual([3]);
    expect(preview.tasks).toEqual([]);
  });
});
