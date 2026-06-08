import Link from "next/link";

const HomePage = (): React.ReactElement => {
  return (
    <main className="min-h-dvh px-4 py-6 md:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="soft-panel rounded-[2rem] p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
            BDTT Maintenance Progress
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-[var(--foreground)] md:text-5xl">
            Báo cáo tiến độ bảo dưỡng hằng ngày
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            MVP demo dùng Excel sheet DATA cột A:M làm danh mục hạng mục,
            sau đó nhận tiến độ từ worker trong app và xuất lại sheet DATA
            hoàn chỉnh.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link
            className="focus-ring pressable soft-card rounded-3xl p-6 hover:border-[var(--primary)]"
            href="/login"
          >
            <span className="text-sm font-semibold text-[var(--primary)]">
              Login
            </span>
            <h2 className="mt-2 text-xl font-semibold">Đăng nhập nội bộ</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Username là phần trước @ trong email PVCFC, bắt buộc đổi mật khẩu lần đầu.
            </p>
          </Link>
          <Link
            className="focus-ring pressable soft-card rounded-3xl p-6 hover:border-[var(--primary)]"
            href="/admin"
          >
            <span className="text-sm font-semibold text-[var(--primary)]">
              Admin
            </span>
            <h2 className="mt-2 text-xl font-semibold">Dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              KPI, bảng worker, bảng hạng mục và dữ liệu tiến độ demo.
            </p>
          </Link>
          <Link
            className="focus-ring pressable soft-card rounded-3xl p-6 hover:border-[var(--primary)]"
            href="/admin/upload"
          >
            <span className="text-sm font-semibold text-[var(--primary)]">
              Excel
            </span>
            <h2 className="mt-2 text-xl font-semibold">Import / Export</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Import sheet DATA A:M và export file DATA hoàn chỉnh.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
