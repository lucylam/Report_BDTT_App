# Import cập nhật riêng nhóm Tháo lắp TB HTĐK

Chức năng nằm tại `/admin/upload`, dành cho DATA admin `vinhlpp`. Excel của nhóm là đầu vào; dữ liệu đã import nằm trong database và được các màn hình web đọc như công việc/báo cáo bình thường.

## Trạng thái triển khai

Mã nguồn và migration được chuẩn bị, kiểm thử ở local. Chưa deploy và chưa áp dụng migration lên Supabase đang sử dụng. Khi phát hành được cho phép, database đích cần migration `supabase/migrations/20260907000100_bdtt_thao_lap_import.sql` trước khi sử dụng API mới. Migration phụ thuộc các migration BDTT hiện có, gồm completion, leader task management, personnel org management và demo mode.

Migration thêm hai loại nhật ký (`group_import`, `sheet_imported`) và các hàm PostgreSQL phục vụ đọc/ghi import. Không thay thế kế hoạch, không sửa phân quyền đăng nhập, không cập nhật dữ liệu nghiệp vụ khi chạy migration.

## Thao tác hằng ngày

1. Trong spreadsheet đang cấu hình cho web, tạo tab riêng **IMPORT_THAO_LAP**. Không dùng tab DATA đầu ra để nhập lại.
2. Dùng **Tải mẫu Excel của nhóm** để lấy cấu trúc và danh sách hiện có của nhóm. Mẫu giữ các ngày đã có báo cáo và bổ sung ngày báo cáo vận hành hiện tại.
3. Đưa dữ liệu Excel nhóm gửi vào tab import: dòng 2 là tiêu đề, dữ liệu từ dòng 3. Cần thay vùng dữ liệu cũ trong tab import để tránh lặp dòng khi dán.
4. Bấm **Đọc và xem trước import nhóm**. Kiểm tra dòng mới, nội dung trước/sau, tiến độ theo ngày, hủy, lỗi dữ liệu và danh sách vắng khỏi Sheet được giữ nguyên.
5. Bấm **Xác nhận import nhóm**. Sau khi thành công, web tải lại dữ liệu. Thao tác import không ghi ngược vào Google Sheet.

Mặc định dùng cùng `GOOGLE_SHEETS_SPREADSHEET_ID` và service account của luồng hiện tại. Có thể cấu hình tên tab riêng bằng `GOOGLE_SHEETS_THAO_LAP_IMPORT_SHEET_NAME`; không cần thư viện mới. Không sửa cấu hình production khi chưa được phép.

## Cấu trúc và ý nghĩa ô dữ liệu

| Vị trí | Nội dung |
| --- | --- |
| A:M | Stt, Task Name, WO, Tagname, Nhóm, Đơn vị chủ quản, Section, Duration, Priority, Start, Finish, Resource Names, Nhóm trưởng |
| N trở đi | Các cột tiến độ có tiêu đề ngày đầy đủ, ví dụ `07/09/2026` hoặc `2026-09-07` |
| Cancel | `X` hoặc `Hủy` để hủy; để trống giữ trạng thái hiện tại |
| Ghi chú | Cập nhật ghi chú cho ngày mới nhất có số liệu của từng dòng; ô trống giữ ghi chú cũ |
| Lý do hủy | Có thể dùng cột riêng này hoặc Ghi chú; tối thiểu 3 ký tự khi hủy |
| Chế độ tiến độ | Tùy chọn: `0-100` hoặc `0/100`. Trống giữ chế độ hiện có; công việc mới mặc định `0-100` |

- A:M phải giữ đúng tiêu đề. Stt không dùng làm khóa; WO mới nhận số thứ tự nối tiếp trên web.
- Nhóm dùng `Tháo/Lắp TB ĐK`; cũng nhận `Tháo lắp TB HTĐK` và `Tháo lắp TB điều khiển`.
- Resource Names phải khớp tên resource hoặc username duy nhất của nhân sự đang hoạt động trong nhóm. Không tự tạo tài khoản từ tên trong Sheet.
- Start/Finish phải hợp lệ và Finish không trước Start. Tagname, WO, Task Name, Nhóm, Duration, Resource Names và Nhóm trưởng không được trống. Priority trống mặc định 2.
- Các ngày tiến độ được đọc theo tiêu đề, không dựa vào thứ tự ngày. Nhận ngày ISO, ngày/tháng/năm, ngày Excel và dạng tháng tiếng Anh của mẫu kế hoạch cũ. Không nhận `07/09` thiếu năm.
- Tiến độ nhận `50%`, `0.5`/`0,5` hoặc `50`. **Số 1 được hiểu là 100%; muốn nhập 1% phải ghi `1%`.** Chỉ nhận phần trăm nguyên từ 0–100; chế độ 0/100 chỉ nhận hai mức đó.
- Ô tiến độ trống không tạo báo cáo 0 và không xóa báo cáo cũ. Ô `0` là báo cáo 0% rõ ràng.
- Các cột tổng hợp Total, %Complete, Còn lại được bỏ qua. Phải có ít nhất một cột ngày tiến độ; không lấy %Complete làm tiến độ của một ngày tự suy đoán.
- Import tối đa 10.000 công việc mỗi lần; toàn bộ lỗi phải được xử lý trước khi ghi.

## Quy tắc cập nhật và lịch sử

- Khóa đối chiếu là **Tagname + WO**, bỏ khoảng trắng đầu/cuối và không phân biệt hoa thường. Một WO có nhiều Tagname vẫn có thể có nhiều công việc. Đổi khóa sẽ được hiểu là công việc mới; không tự liên kết với WO cũ.
- WO mới thuộc nhóm được thêm với nguồn `ad_hoc` (phát sinh). Công việc hiện có giữ ID, nguồn kế hoạch/phát sinh, batch kế hoạch gốc và các liên kết.
- Thông tin công việc hiện có được cập nhật theo A:M, gồm lịch hiện hành, nội dung và phân công. Giá trị trước khi sửa được lưu trong nhật ký import; không tạo lại toàn bộ kế hoạch.
- Giữ người báo cáo đã được phân công nếu người thực hiện không đổi và người báo cáo vẫn hợp lệ trong nhóm. Khi đổi người thực hiện, xác định người báo cáo theo quy tắc nhóm/phân nhóm của web.
- Mỗi ngày có số liệu được so với báo cáo mới nhất của công việc trong ngày đó. Chỉ ghi những báo cáo thay đổi. Báo cáo hiện có được cập nhật tại chỗ, giữ người báo cáo gốc và ảnh; người thực hiện import được ghi ở `submitted_by` và nhật ký `report_updated`.
- Cho phép sửa số liệu của ngày đã có báo cáo, có lưu phiên bản trước. Những ngày không có trong Sheet hoặc để trống không bị thay đổi. Không tự chuyển ngày theo giờ bấm import.
- Ghi chú của dòng chỉ áp dụng cho ngày mới nhất có số liệu để không chép ghi chú hôm nay vào toàn bộ lịch sử.
- Cancel cần ghi rõ và có lý do. Không tự mở lại công việc đã hủy; không tự hủy/xóa công việc vắng khỏi Sheet.
- Lặp lại cùng dữ liệu không thêm WO hay báo cáo trùng. Dữ liệu các nhóm khác không thay đổi.

## Kiểm soát ghi dữ liệu

API đọc Sheet phía server; không nhận danh sách WO hay actor từ trình duyệt. Chỉ `vinhlpp` được dùng API. Bước apply đọc lại dữ liệu và kiểm tra checksum gồm nội dung Sheet, tên tab và phiên bản database. Nếu Sheet, công việc, tiến độ hoặc nhân sự thay đổi sau preview, phải xem trước lại.

Hàm SQL khóa các bảng liên quan, kiểm tra phiên bản và phạm vi một lần nữa, rồi ghi toàn bộ công việc, tiến độ, lịch sử và biên nhận trong một giao dịch. Bất kỳ lỗi nào đều hoàn tác toàn bộ đợt. Các hàm chỉ được cấp quyền cho service role. Demo Mode chặn import để tránh trộn dữ liệu thật và dùng thử.

Danh mục tổ chức dùng quy tắc seed + override như web hiện có. SQL có danh sách tương thích cho sáu tài khoản gốc của nhóm khi chưa có thông tin tổ chức đầy đủ; khi chuyển nhóm bằng màn hình nhân sự, override được ưu tiên. Nếu sửa danh mục seed của nhóm trong tương lai, cần cập nhật phần tương thích SQL tương ứng.

## Kiểm thử local

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Kiểm tra giao dịch trên PostgreSQL 16 riêng biệt, không kết nối Supabase:

```powershell
docker run --detach --name bdtt-thao-lap-local-test --env POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
node scripts/test-thao-lap-import-db.mjs
```

Script tạo database thử mới trong container không mở cổng, áp dụng các migration hiện có và migration mới, kiểm tra rồi xóa riêng database thử. Không đọc credential ứng dụng. PostgreSQL được kiểm tra về quyền, phạm vi, rollback khi dòng sau lỗi, thêm/hủy/tiến độ, giữ ảnh/ghi chú, lịch sử, xung đột phiên bản và Demo Mode.

Kiểm tra trình duyệt bằng Chrome headless đã cài, không cần Playwright:

```powershell
npm.cmd run dev -- --webpack -p 3001
# Trong terminal khác:
node scripts/check-thao-lap-import-ui.mjs
```

Script trình duyệt dùng dữ liệu giả và chặn toàn bộ request `/api/*` bằng fixture, không import vào database thật. Kiểm tra preview/apply/refresh, lỗi và thử lại, tải mẫu lỗi không rời trang, desktop 100%, mobile và chữ phóng to 200%. Ảnh kiểm tra nằm trong `.next/thao-lap-qa`.

Kiểm thử local không thay thế lần đối chiếu đầu tiên với file thật của nhóm và spreadsheet thực tế sau khi môi trường đích được phép cập nhật.
