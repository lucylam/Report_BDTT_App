# Đặc tả thiết kế — Industrial Operations Console

Ngày cập nhật: 2026-07-17

Phạm vi: Cổng vận hành Xưởng Điều khiển, BDTT, AM và các công tác nội bộ bổ sung sau này.

## 1. Định hướng

Đây là phần mềm vận hành nội bộ, không phải landing page hay SaaS marketing. Giao diện cần tạo cảm giác của một bảng điều hành kỹ thuật: rõ trạng thái, mật độ dữ liệu cao, thao tác nhanh và ổn định khi sử dụng nhiều giờ.

Ba nguyên tắc cốt lõi:

- Ưu tiên thông tin và hành động nghiệp vụ hơn trang trí.
- Phân cấp bằng đường biên, rail trạng thái, độ tương phản và khoảng cách; không dựa vào bóng đổ hoặc nhiều lớp card.
- Giữ cấu trúc nhất quán khi số lượng công tác tăng: cổng công tác → module → màn hình nghiệp vụ → chi tiết.

Không sao chép bố cục Kanban của ảnh tham chiếu. Workflow, bảng dữ liệu, báo cáo và phân quyền của BDTT/AM được giữ nguyên.

## 2. Dấu hiệu nhận diện

- App chiếm toàn bộ viewport; không đặt toàn bộ ứng dụng trong một khung nổi bo tròn.
- Sidebar graphite/xanh thép đậm, rộng 232px trên desktop.
- Header và nội dung nối liền theo lưới, phân tách bằng border 1px.
- Bề mặt phẳng, gần vuông; radius chuẩn chỉ 2px.
- Màu nhấn duy nhất là industrial blue. Màu semantic chỉ dùng cho trạng thái thật.
- KPI là một dải số liệu có đường chia ô, không phải một hàng card đồng dạng.
- Số liệu, mã thiết bị, phần trăm và ngày dùng monospace/tabular numerals.
- Chuyển động ngắn 100ms, không scale, bounce hoặc hiệu ứng trang trí.

## 3. Token nền tảng

### Light mode

```css
--background: #e4e8eb;
--foreground: #111820;
--surface: #ffffff;
--surface-muted: #eef1f3;
--surface-elevated: #e7ebee;
--sidebar: #111820;
--line: rgb(17 24 32 / 0.16);
--border-strong: rgb(17 24 32 / 0.30);

--primary: #28667d;
--primary-strong: #174f65;
--success: #18764f;
--warning: #9a6700;
--danger: #c7352a;
--info: #2f7896;
```

### Dark mode

```css
--background: #0c1218;
--foreground: #f0f4f7;
--surface: #121a21;
--surface-muted: #19232c;
--surface-elevated: #202b35;
--sidebar: #0c1319;
--primary: #6aabc4;
--primary-strong: #83bdd3;
```

### Shape và elevation

```css
--radius-field: 0.125rem;
--radius-card: 0.125rem;
--radius-panel: 0;
--shadow-soft-sm: none;
--shadow-soft-md: none;
```

Shadow chỉ dành cho popover, menu, dialog hoặc bottom sheet cần tách khỏi nội dung. Không dùng glassmorphism, gradient trang trí hoặc blur đại trà.

## 4. Typography

- Font giao diện: `Inter Variable` với optical sizing được self-host qua `next/font`, fallback `Segoe UI`, Arial, sans-serif.
- Font mã kỹ thuật: `IBM Plex Mono`, fallback `Cascadia Mono`, Consolas, monospace.
- Số liệu thông thường dùng Inter với `tabular-nums`; chỉ mã thiết bị, WorkOrder và dữ liệu kỹ thuật dạng code mới dùng monospace.
- Tiêu đề trang: 24–30px, weight 600.
- Tiêu đề khu vực: 15–18px, weight 600.
- Nội dung: 14–15px, line-height 1.45–1.55.
- Nhãn/meta: 11–13px; uppercase chỉ dành cho eyebrow hoặc nhãn kỹ thuật ngắn.
- Không dùng uppercase cho tiêu đề dài; không áp dụng tracking âm cho nội dung tiếng Việt.
- Không dùng font tròn, friendly hoặc tracking rộng cho nội dung tiếng Việt.

## 5. Bố cục chuẩn

### Desktop

- Shell full-bleed, tối thiểu cao 100dvh.
- Sidebar 232px; vùng nội dung `minmax(0, 1fr)`.
- Header có border-bottom và không nổi khỏi mặt phẳng nội dung.
- Nội dung dùng padding 16–20px và gap 12–16px.
- Danh sách lớn ưu tiên table, split view hoặc row register; không biến mỗi hàng thành card riêng nếu không cần thiết.

### Mobile

- Shell vẫn full-bleed, không có lề canvas bao quanh.
- Bottom navigation bám cạnh dưới, rộng toàn màn hình, border-top rõ.
- Touch target tối thiểu 44px.
- Dữ liệu phụ có thể chuyển thành stacked rows; không thu nhỏ bảng desktop đến mức khó đọc.

## 6. Thành phần

### Navigation

- Mục active dùng rail trái 2px và nền primary-soft.
- Tên công tác và chức năng phải là danh từ nghiệp vụ, không dùng copy marketing.
- Module switcher là control điều hướng, không trình bày như thẻ quảng cáo.

### Button

- Primary: nền `--primary-strong`, chữ tương phản, không gradient.
- Secondary: nền surface, border rõ.
- Danger chỉ dùng cho thao tác hủy/xóa thật.
- Nút desktop thường cao 40px; mobile tối thiểu 44px.
- Không kéo nút full-width nếu hành động không cần chiếm cả hàng.

### Status và badge

- Badge gần vuông, nhỏ, có nhãn chữ và rail trái 2px.
- Không dùng pill cho filter, trạng thái, đơn vị hoặc phần trăm.
- Chấm tròn chỉ dùng cho tín hiệu tức thời nhỏ như online/unread/timeline.
- Không phụ thuộc riêng vào màu để truyền đạt trạng thái.

### KPI

- KPI đặt trong dải có border bao và đường chia ô.
- Giá trị 20–24px, monospace; label 11–12px.
- Không dùng 4–6 card bo tròn giống hệt nhau có icon lớn và nhiều khoảng trống.

### Card và widget

- Card chỉ dùng khi nội dung thật sự là một đơn vị độc lập.
- Mặc định border 1px, radius 2px, không shadow.
- Header của widget tách bằng border-bottom.
- Danh sách bên trong widget dùng `divide-y` thay vì nhiều card con.

### Progress và chart

- Progress bar gần vuông, cao 6–10px.
- Màu hoàn thành, còn lại và cảnh báo dùng token semantic.
- Chart phải có nhãn, số liệu hoặc legend; không dựa riêng vào màu.
- Số liệu chart dùng tabular numerals.

### Form

- Label luôn hiển thị; placeholder không thay thế label.
- Input desktop cao khoảng 40px, mobile tối thiểu 44px.
- Lỗi đặt sát trường nhập và nêu cách khắc phục.
- Nhóm nút hành động đặt gần dữ liệu liên quan, tránh thanh CTA khổng lồ.

## 7. Các mẫu phải tránh

- App nằm trong một card lớn có margin ngoài, radius 20px và shadow sâu.
- Gradient tím–xanh, glass blur, glow hoặc background mesh trang trí.
- Hàng loạt card bo tròn chứa rất ít nội dung.
- Mọi label đều là pill.
- Icon lớn trong bubble tròn chỉ để lấp khoảng trống.
- Heading quá lớn, copy kiểu quảng cáo hoặc giải thích dài trước khi cho người dùng hành động.
- Hover nâng card, scale nút hoặc animation chậm hơn thao tác.
- Dùng màu semantic làm màu trang trí khi không có trạng thái tương ứng.

## 8. Quy tắc mở rộng công tác mới

Mỗi công tác mới phải tái sử dụng shell, module switcher, header, notification và account menu hiện có. Công tác chỉ tự định nghĩa:

- vai trò và quyền;
- các màn hình nghiệp vụ;
- trạng thái workflow;
- bảng/danh sách/biểu mẫu riêng;
- notification events riêng.

Không tạo một dashboard visual style mới cho từng công tác. Khác biệt giữa BDTT, AM và các module sau này đến từ workflow và dữ liệu, không đến từ một bộ màu hoặc kiểu card riêng.
