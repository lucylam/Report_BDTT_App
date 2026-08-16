import Link from "next/link";
import { CompanyBrand } from "@/components/CompanyBrand";
import { Icon } from "@/components/ui";

const steps = [
  ["Nhận việc", "Mở WorkOrder hoặc Công việc hôm nay; kiểm tra Tag, WO và người báo cáo."],
  ["Nhập tiến độ", "Chọn mức tiến độ, ghi chú và tối đa 5 ảnh. Thiết bị 0/100 chỉ nhận hai mức."],
  ["Làm việc offline", "Nếu mất mạng, giữ nguyên trang. Hàng chờ sẽ tự đồng bộ khi kết nối trở lại."],
  ["Báo sai dữ liệu", "Không tự sửa dữ liệu kế hoạch. Gửi báo sai và theo dõi kết quả từ giám sát."],
  ["Ghi nhận bất thường", "Tạo hồ sơ bất thường riêng, chọn mức độ, vị trí, ảnh và theo dõi trạng thái."],
  ["Nhóm trưởng", "Có thể tạo task phát sinh, đổi người thực hiện/người báo cáo và cập nhật báo cáo thay."]
] as const;

const HelpPage = (): React.ReactElement => (
  <main className="min-h-dvh bg-[var(--background)] p-3 sm:p-5">
    <section className="mx-auto max-w-5xl border border-[var(--line)] bg-[var(--surface)]">
      <header className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between"><CompanyBrand variant="sidebar" /><Link className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] no-underline" href="/"><Icon name="dashboard" /> Về trang chính</Link></header>
      <div className="p-4 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--primary-strong)]">Trợ giúp BDTT 2026</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Hướng dẫn thao tác nhanh</h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--text-muted)]">Các bước cốt lõi dành cho nhân viên, người báo cáo và nhóm trưởng khi làm việc trên điện thoại hoặc máy tính.</p>
        <div className="mt-5 grid border-l border-t border-[var(--line)] md:grid-cols-2">
          {steps.map(([title, description], index) => <article className="border-b border-r border-[var(--line)] p-4" key={title}><p className="font-mono text-sm font-semibold text-[var(--primary-strong)]">BƯỚC {index + 1}</p><h2 className="mt-1 text-lg font-semibold">{title}</h2><p className="mt-1 text-base leading-6 text-[var(--text-muted)]">{description}</p></article>)}
        </div>
        <section className="mt-5 border-l-2 border-[var(--info)] bg-[var(--surface-muted)] p-4"><h2 className="text-lg font-semibold">Tài liệu minh họa trên mobile</h2><p className="mt-1 text-base leading-6 text-[var(--text-muted)]">Tải bản trình chiếu có ảnh chụp từng màn hình để dùng trong buổi hướng dẫn trực tiếp.</p><a className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 bg-[var(--primary-strong)] px-4 text-sm font-semibold text-[var(--primary-contrast)] no-underline" href="/api/help/guide"><Icon name="download" /> Tải tài liệu hướng dẫn</a></section>
      </div>
    </section>
  </main>
);

export default HelpPage;
