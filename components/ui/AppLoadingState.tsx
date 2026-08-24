import { Icon, type IconName } from "@/components/ui/Icon";

interface AppLoadingStateProps {
  readonly title?: string;
  readonly description?: string;
  readonly icon?: IconName;
}

const metricSkeletons = [
  "bg-[var(--primary-soft)]",
  "bg-[var(--info-soft)]",
  "bg-[var(--warning-soft)]",
  "bg-[var(--success-soft)]"
] as const;

export const AppLoadingState = ({
  title = "Đang chuẩn bị dữ liệu",
  description = "Hệ thống đang tổng hợp thông tin mới nhất. Vui lòng chờ trong giây lát.",
  icon = "dashboard"
}: AppLoadingStateProps): React.ReactElement => (
  <main className="flex min-h-dvh items-center justify-center bg-[var(--background)] p-3 sm:p-5">
    <section
      aria-busy="true"
      aria-live="polite"
      className="app-shell w-full max-w-3xl overflow-hidden rounded-[var(--radius-panel)]"
      role="status"
    >
      <div className="border-b border-[var(--line)] p-5 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-[var(--primary-soft)] text-[var(--primary-strong)] ring-1 ring-[var(--primary)]/25">
            <Icon className="h-7 w-7" name={icon} />
            <span className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--primary-strong)] shadow-[var(--shadow-soft-sm)] ring-1 ring-[var(--line)]">
              <Icon className="h-4 w-4 motion-safe:animate-spin" name="loading" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary-strong)]">
              Hệ thống công việc BDTT
            </p>
            <h1 className="mt-1 break-words text-xl font-semibold leading-tight text-[var(--foreground)] sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl break-words text-sm font-medium leading-6 text-[var(--text-muted)] sm:text-base">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {metricSkeletons.map((tone, index) => (
            <div
              className={`${tone} min-h-20 rounded-[var(--radius-card)] p-3 ring-1 ring-[var(--line)]`}
              key={tone}
            >
              <div className="h-2.5 w-16 max-w-full rounded-full bg-current opacity-20 motion-safe:animate-pulse" />
              <div
                className="mt-3 h-6 rounded-full bg-current opacity-30 motion-safe:animate-pulse"
                style={{ width: `${42 + index * 9}%` }}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <div className="h-3 w-32 max-w-full rounded-full bg-[var(--border-strong)] motion-safe:animate-pulse" />
            <div className="mt-4 h-20 rounded-[var(--radius-field)] bg-[var(--surface)] ring-1 ring-[var(--line)] motion-safe:animate-pulse" />
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-4">
            <div className="h-3 w-24 max-w-full rounded-full bg-[var(--border-strong)] motion-safe:animate-pulse" />
            <div className="mt-4 h-20 rounded-[var(--radius-field)] bg-[var(--surface)] ring-1 ring-[var(--line)] motion-safe:animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  </main>
);
