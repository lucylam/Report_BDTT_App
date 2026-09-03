# Đặc tả giao diện BDTT để tái sử dụng

Ngày cập nhật: 2026-08-27

Phạm vi: giao diện hiện hành của BDTT Webapp trên nhánh `main`.

## 1. Nguồn sự thật

Khi tái tạo giao diện cho một ứng dụng khác, đọc nguồn theo thứ tự sau:

1. `app/globals.css`: màu sắc, typography, radius, shadow, kích thước shell và responsive.
2. `components/ui/*`: cấu trúc Button, Card, Badge, Input, Widget, ProgressBar và Icon.
3. `app/layout.tsx`: font và nền tảng accessibility toàn ứng dụng.
4. Các màn hình đang dùng trên nhánh `main`: cách ghép shell, sidebar, topbar, bottom navigation và nội dung nghiệp vụ.
5. Tài liệu này: bản tóm tắt để chuyển giao, không được ưu tiên hơn source code.

Không dùng các nguồn sau để suy ra phong cách hiện hành:

- `.claude/worktrees/**`: bản làm việc cũ hoặc tạm thời.
- `docs/design-audit-*/**`: ảnh kiểm thử của nhiều giai đoạn khác nhau.
- `worker_mobile_mockup.html` và các file `*mockup*.html`: prototype lịch sử, chỉ dùng khi cần đối chiếu luồng cũ.
- ảnh chụp màn hình cũ nếu khác token trong `app/globals.css`.

## 2. Định hướng thị giác

Tên định hướng: `earthy pastel operations UI`.

Đây là công cụ vận hành nội bộ thân thiện, rõ ràng và dễ đọc; không phải landing page, SaaS marketing hay bảng điều khiển xanh thép. Giao diện kết hợp:

- nền xám ấm;
- bề mặt trắng, đường viền nhẹ và bóng đổ mềm;
- xanh lá làm màu hành động/chọn chính;
- cam đất làm màu nhấn;
- màu semantic riêng cho cảnh báo, lỗi và thông tin;
- góc bo vừa phải, không vuông cứng và không bo tròn quá mức;
- mật độ thông tin cao nhưng vẫn đủ khoảng thở và vùng chạm.

Không tự đổi màu chủ đạo thành xanh navy hoặc xanh thép chỉ vì sản phẩm phục vụ nhà máy. Ngữ cảnh công nghiệp mô tả nghiệp vụ, không phải chỉ dẫn palette.

## 3. Token hiện hành

### Light mode

```css
--background: #f2f2f0;
--foreground: #111111;
--text-muted: #565a50;
--text-soft: #666b60;

--surface: #ffffff;
--surface-muted: #f0f2eb;
--surface-elevated: #f3f4ef;
--surface-warm: #f5d5ad;
--sidebar: #ffffff;
--line: #d8dcd2;
--line-soft: #e2e5dd;

--primary: #537f16;
--primary-strong: #466b12;
--primary-soft: #d6e8a8;
--primary-pale: #e3efc4;

--accent: #ad481b;
--accent-strong: #9f3e17;
--accent-soft: #f5d5ad;

--warning: #805605;
--warning-soft: #f4e19a;
--danger: #a6321d;
--danger-soft: #f4c9be;
--info: #285f9c;
--info-soft: #cfe2f5;
```

### Dark mode

Dark mode giữ cùng quan hệ màu, chuyển sang nền than ấm và màu nhấn sáng hơn:

```css
--background: #151612;
--foreground: #f6f7ef;
--surface: #20211c;
--surface-muted: #2b2d25;
--sidebar: #20211c;

--primary: #b7e35a;
--primary-strong: #b7e35a;
--accent: #ffb766;
--warning: #f4d35e;
--danger: #ff8a6b;
--info: #8cc7ff;
```

### Shape, shadow và kích thước shell

```css
--radius-card: 1rem;
--radius-field: 0.75rem;
--radius-panel: 1.25rem;

--shadow-soft-sm: 0 12px 30px rgb(16 24 40 / 0.05);
--shadow-soft-md: 0 16px 36px -8px rgb(16 24 40 / 0.08);
--shadow-floating: 0 24px 50px -16px rgb(16 24 40 / 0.18);

--desktop-sidebar-width: clamp(290px, 22vw, 328px);
--mobile-topbar-height: 4.35rem;
--mobile-bottom-nav-height: 5.5rem;
```

Component phải dùng semantic token thay vì lặp raw hex. Gradient chỉ dùng ở nơi source hiện hành đã định nghĩa, không thêm gradient tím-xanh hoặc glow trang trí.

## 4. Typography và icon

- Font chính: `Plus Jakarta Sans`, tải qua `next/font/google` với Vietnamese subset.
- Fallback: `Segoe UI Variable`, `Segoe UI`, system sans-serif.
- Font kỹ thuật: `Cascadia Mono`, `SFMono-Regular`, Consolas hoặc monospace.
- Dùng `tabular-nums` cho phần trăm, KPI, ngày và số liệu cần so sánh theo cột.
- Icon dùng `lucide-react`, nét outline nhất quán; không dùng emoji làm icon chức năng.
- Nội dung tiếng Việt phải giữ UTF-8 đúng và có line-height đủ thoáng.

## 5. Shell và responsive

### Desktop

- Toàn ứng dụng nằm trong `app-shell` bo theo `--radius-panel`, có border và bóng mềm.
- Sidebar trắng rộng 290–328px, nội dung là `minmax(0, 1fr)`.
- Navigation active dùng nền `--primary-soft`, chữ/icon `--primary-strong`.
- Nội dung chính dùng card/widget theo lưới; không biến mọi hàng dữ liệu thành card nếu table hoặc split view dễ đọc hơn.

### Mobile

- Shell chuyển thành bề mặt gần full-bleed, không để margin/radius làm giảm diện tích đọc.
- Topbar và bottom navigation hỗ trợ safe area.
- Touch target chính tối thiểu 44px; input chuẩn cao 48px.
- Table rộng phải chuyển thành card/stacked detail hoặc vùng cuộn có chỉ dẫn, không thu nhỏ chữ để nhét nội dung.
- Khi browser/system text scale tới 200%, container phải reflow hoặc tăng chiều cao.
- Không cắt, che, ép hoặc dùng ellipsis cho tên người, điều hướng, trạng thái, hành động và hướng dẫn. Toàn bộ giá trị quan trọng phải truy cập được.

## 6. Thành phần chuẩn

### Button

- Primary: nền `--primary-strong`, chữ `--primary-contrast`.
- Secondary: nền `--surface`, border `--border-strong`.
- Danger chỉ dùng cho thao tác hủy/xóa thật.
- Ghost dùng cho hành động phụ trong vùng đã có phân cấp rõ.
- Cho phép nhãn dài xuống dòng; không ép `nowrap` và không cắt chữ.

### Card và Widget

- Card dùng `--surface`, border nhẹ, `--radius-card` và bóng mềm.
- Widget là đơn vị nội dung có header, title, subtitle và action rõ ràng.
- Ưu tiên `divide-y`, grid hoặc disclosure bên trong thay vì lồng quá nhiều card.

### Badge và trạng thái

- Badge hiện hành là pill nhỏ, hỗ trợ `success`, `warning`, `accent`, `danger`, `info`, `neutral`, `primary`.
- Badge mềm dùng nền semantic nhạt; badge solid chỉ dùng khi cần tương phản cao.
- Không truyền đạt trạng thái chỉ bằng màu: luôn có nhãn chữ, icon hoặc số liệu đi kèm.

### Form

- Label luôn hiển thị; placeholder không thay label.
- Input dùng `control-pill`, border rõ, focus ring dễ nhận biết và cỡ chữ mobile tối thiểu 16px để tránh zoom ngoài ý muốn.
- Lỗi đặt gần trường nhập và mô tả cách khắc phục.

### KPI, progress và chart

- KPI ưu tiên dải metric/card gọn, dùng số tabular và nhãn ngắn.
- Progress dùng track bo tròn, màu chính hoặc semantic theo ý nghĩa thật.
- Chart phải có nhãn, legend hoặc số liệu; không phụ thuộc riêng vào màu.

## 7. Workflow phải được giữ nguyên

Khi chuyển giao giao diện, không được đơn giản hóa mất luồng nghiệp vụ:

`tổng quan → bộ lọc → danh sách/bằng chứng → chi tiết → cập nhật hoặc phê duyệt`

Giữ nguyên vai trò, quyền, trạng thái công việc, bằng chứng ảnh, lịch sử báo cáo, import/export và thông báo. Chỉ tái sử dụng ngôn ngữ thị giác; không tự phát minh API, schema hoặc quyền mới.

## 8. Prompt clone khuyến nghị

> Tái tạo giao diện dựa trên source hiện hành của BDTT Webapp. Trước tiên đọc `app/globals.css`, `app/layout.tsx`, `components/ui/*` và các màn hình tương ứng trên nhánh `main`. Giữ phong cách earthy pastel operations UI: nền xám ấm, card trắng, xanh lá làm primary, cam đất làm accent, radius 12–20px và bóng mềm. Dùng Plus Jakarta Sans và Lucide icons. Giữ đầy đủ workflow nghiệp vụ và khả năng đọc ở desktop/mobile, kể cả text scaling 200%. Không suy luận palette từ lĩnh vực nhà máy. Bỏ qua `.claude/worktrees/**`, `docs/design-audit-*/**`, `worker_mobile_mockup.html` và các file `*mockup*.html` vì đó là lịch sử hoặc prototype, không phải nguồn thiết kế hiện hành.
