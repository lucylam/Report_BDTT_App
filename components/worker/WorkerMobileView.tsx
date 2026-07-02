"use client";

import { useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { ModeSwitch } from "@/components/ModeSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge, Icon, PageHeader, type IconName } from "@/components/ui";
import { CountdownBanner } from "@/components/worker/CountdownBanner";
import { SummaryPills } from "@/components/worker/SummaryPills";
import { WorkerGroupedTaskList } from "@/components/worker/WorkerGroupedTaskList";
import { WorkerPendingUpdateBar } from "@/components/worker/WorkerPendingUpdateBar";
import { WorkerSearchControls } from "@/components/worker/WorkerSearchControls";
import {
  getTaskUnitChips,
  groupWorkerTasks,
  type WorkerGroupMode
} from "@/components/worker/taskView";
import type {
  SaveState,
  WorkerFilter,
  WorkerProgressUpdate
} from "@/components/worker/types";
import { DEFAULT_REPORT_DATE, REPORT_DATES, formatViDate } from "@/lib/date";
import { getTaskPercent, getTaskProgress } from "@/lib/progress";
import type { AuthAccount, Profile, ProgressRecord, Task } from "@/types/domain";

interface WorkerMobileViewProps {
  readonly account: AuthAccount;
  readonly worker: Profile;
  readonly allTasks: readonly Task[];
  readonly filteredTasks: readonly Task[];
  readonly progress: readonly ProgressRecord[];
  readonly displayProgress: readonly ProgressRecord[];
  readonly filter: WorkerFilter;
  readonly searchQuery: string;
  readonly isOnline: boolean;
  readonly pendingUpdateCount: number;
  readonly isSubmittingUpdates: boolean;
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly onFilterChange: (filter: WorkerFilter) => void;
  readonly onSearchChange: (query: string) => void;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onCancel: (taskId: string) => void;
  readonly onDiscardUpdates: () => void;
  readonly onSubmitUpdates: () => void;
  readonly onLogout: () => void;
}

type MobileTab = "tasks" | "overview" | "history";

export type HistoryTaskUpdate = {
  readonly task: Task;
  readonly record: ProgressRecord;
};

export type HistoryRow = {
  readonly date: string;
  readonly completed: number;
  readonly updates: readonly HistoryTaskUpdate[];
};

const tabs: readonly { readonly key: MobileTab; readonly label: string; readonly icon: IconName }[] = [
  { key: "tasks", label: "Việc", icon: "list" },
  { key: "overview", label: "Tổng quan", icon: "chart" },
  { key: "history", label: "Lịch sử", icon: "history" }
];

const filters: readonly { readonly key: WorkerFilter; readonly label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "todo", label: "Chưa làm" },
  { key: "progress", label: "Đang làm" },
  { key: "done", label: "Xong" }
];

export const WorkerMobileView = ({
  account,
  worker,
  allTasks,
  filteredTasks,
  progress,
  displayProgress,
  filter,
  searchQuery,
  isOnline,
  pendingUpdateCount,
  isSubmittingUpdates,
  saveStates,
  onFilterChange,
  onSearchChange,
  onChange,
  onCancel,
  onDiscardUpdates,
  onSubmitUpdates,
  onLogout
}: WorkerMobileViewProps): React.ReactElement => {
  const isAdminAccount = account.role === "admin";
  const [tab, setTab] = useState<MobileTab>("tasks");
  const [groupMode, setGroupMode] = useState<WorkerGroupMode>("unit");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  const activeTasks = allTasks.filter((task) => !task.isCancelled);
  const percents = activeTasks.map((task) =>
    getTaskPercent(progress, task.id, DEFAULT_REPORT_DATE)
  );
  const completedCount = percents.filter((percent) => percent === 100).length;
  const inProgressCount = percents.filter(
    (percent) => percent > 0 && percent < 100
  ).length;
  const notStartedCount = percents.filter((percent) => percent === 0).length;
  const overallPercent =
    percents.length === 0
      ? 0
      : Math.round(
          percents.reduce<number>((total, percent) => total + percent, 0) /
            percents.length
        );
  const p1Open = allTasks.filter(
    (task) =>
      !task.isCancelled &&
      task.priority === 1 &&
      getTaskPercent(progress, task.id, DEFAULT_REPORT_DATE) < 100
  ).length;
  const cancelledCount = allTasks.filter((task) => task.isCancelled).length;
  const taskGroups = groupWorkerTasks(filteredTasks, groupMode);
  const unitChips = getTaskUnitChips(allTasks);
  const historyRows = REPORT_DATES.slice(-7)
    .reverse()
    .map((date) => {
      const updates = allTasks
        .map((task) => {
          const record = getTaskProgress(progress, task.id, date);
          return record && record.percent > 0 ? { task, record } : null;
        })
        .filter((item): item is HistoryTaskUpdate => item !== null);

      return {
        completed: allTasks.filter(
          (task) => !task.isCancelled && getTaskPercent(progress, task.id, date) === 100
        ).length,
        date,
        updates
      };
    });

  return (
    <main
      className="min-h-dvh w-full max-w-[100vw] overflow-x-hidden px-2 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] pt-2 sm:px-3 sm:pt-3 lg:hidden"
      style={{ "--mobile-topbar-height": "15rem" } as React.CSSProperties}
    >
      <div className="app-shell mx-auto min-h-[calc(100dvh-1rem)] max-w-[1700px] overflow-hidden rounded-[22px]">
      <header className="mobile-topbar sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/96 px-4 pb-4 backdrop-blur-xl">
        <PageHeader
          description={`Ngày báo cáo: ${formatViDate(DEFAULT_REPORT_DATE)} · ${worker.orgTitle}`}
          eyebrow="Workspace · BDTT 2026"
          title="Báo cáo tiến độ"
        />

        <div className="mt-3 flex items-center gap-2">
          {isAdminAccount ? (
            <ModeSwitch
              activeMode="workspace"
              className="max-w-none flex-1 text-xs"
              href="/admin"
            />
          ) : (
            <div className="inline-flex min-h-11 min-w-0 flex-1 items-center rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-soft-sm)]">
              <span className="min-w-0 truncate">Workspace</span>
            </div>
          )}
          <ThemeToggle className="shrink-0" />
          <AccountMenu
            account={account}
            onLogout={onLogout}
            showInstallButton
            statusLabel={isOnline ? "Online" : "Offline"}
            statusTone={isOnline ? "success" : "warning"}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[var(--radius-field)] bg-[var(--surface-muted)] px-3 py-2 ring-1 ring-[var(--border)]">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {worker.fullName}
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">@{account.username}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-right">
              <span className="block text-xl font-semibold leading-none tabular-nums text-[var(--foreground)]">
                {overallPercent}%
              </span>
              <span className="block text-[10px] font-semibold uppercase text-[var(--text-soft)]">
                Tiến độ
              </span>
            </span>
            <Badge className="shrink-0" tone={isOnline ? "success" : "warning"}>
              <span className="inline-flex min-w-0 items-center gap-1">
                <Icon className="h-3.5 w-3.5 shrink-0" name={isOnline ? "wifi" : "wifiOff"} />
                {isOnline ? "Online" : "Offline"}
              </span>
            </Badge>
          </div>
        </div>
      </header>

      {tab === "tasks" ? (
        <>
          {!isOnline ? (
            <div
              aria-live="polite"
              className="bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]"
            >
              Đang offline. Cập nhật sẽ được lưu tạm và đồng bộ khi có mạng.
            </div>
          ) : null}
          <CountdownBanner />

          <section className="sticky top-[calc(var(--mobile-topbar-height)+var(--safe-top))] z-10 space-y-2 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-2">
            <SummaryPills percents={percents} />
            <div className="control-pill grid grid-cols-4 gap-1 rounded-[var(--radius-field)] p-1.5">
              {filters.map((item) => (
                <button
                  className={`focus-ring pressable min-h-12 min-w-0 rounded-[calc(var(--radius-field)-0.25rem)] px-1 text-xs font-semibold leading-tight sm:px-2 sm:text-sm ${
                    item.key === filter
                      ? "bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-md ring-1 ring-[var(--primary)]"
                      : "text-[var(--foreground)] ring-1 ring-transparent hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
                  }`}
                  key={item.key}
                  onClick={() => onFilterChange(item.key)}
                  type="button"
                >
                  <span className="mobile-button-label">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`focus-ring pressable mobile-action-button min-w-0 rounded-[var(--radius-field)] border px-2 text-sm font-semibold sm:px-3 ${
                  filter === "p1"
                    ? "border-[var(--danger)] bg-[var(--danger)] text-white shadow-md"
                    : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                }`}
                onClick={() => onFilterChange(filter === "p1" ? "all" : "p1")}
                type="button"
              >
                P1 chưa xong: {p1Open}
              </button>
              <button
                className={`focus-ring pressable mobile-action-button min-w-0 rounded-[var(--radius-field)] border px-2 text-sm font-semibold sm:px-3 ${
                  filter === "cancelled"
                    ? "border-[var(--danger)] bg-[var(--danger)] text-white shadow-md"
                    : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                }`}
                onClick={() => onFilterChange(filter === "cancelled" ? "all" : "cancelled")}
                type="button"
              >
                Hủy: {cancelledCount}
              </button>
            </div>
            <WorkerSearchControls
              groupMode={groupMode}
              inputId="worker-mobile-task-search"
              onGroupModeChange={setGroupMode}
              onSearchChange={onSearchChange}
              resultLabel={`${filteredTasks.length}/${allTasks.length} hạng mục`}
              searchQuery={searchQuery}
              unitChips={unitChips}
            />
          </section>

          <section className="space-y-3 px-4 py-3 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+4rem)]">
            <WorkerGroupedTaskList
              onCancel={onCancel}
              onChange={onChange}
              progress={displayProgress}
              saveStates={saveStates}
              taskGroups={taskGroups}
            />
          </section>
        </>
      ) : null}

      {tab === "overview" ? (
        <section className="space-y-4 px-4 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+4rem)] pt-5">
          <SummaryPills percents={percents} />
          <ProgressDonutChart
            completed={completedCount}
            inProgress={inProgressCount}
            notStarted={notStartedCount}
            overallPercent={overallPercent}
            total={activeTasks.length}
          />
          <DailyCompletionChart rows={historyRows} />
          <div className="glass-card rounded-[var(--radius-card)] p-5">
            <h2 className="text-lg font-semibold">Tổng quan cá nhân</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Hạng mục P1 chưa xong: <strong>{p1Open}</strong>. Dữ liệu tính theo ngày báo cáo hiện tại.
            </p>
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-3 px-4 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+4rem)] pt-5">
          {historyRows.map((row) => {
            const isSelected = selectedHistoryDate === row.date;
            return (
              <article className="glass-card overflow-hidden rounded-[var(--radius-card)]" key={row.date}>
                <button
                  aria-expanded={isSelected}
                  className="focus-ring pressable flex min-h-24 w-full items-center justify-between gap-3 p-5 text-left"
                  onClick={() =>
                    setSelectedHistoryDate((current) =>
                      current === row.date ? null : row.date
                    )
                  }
                  type="button"
                >
                  <span>
                    <span className="block font-semibold">{formatViDate(row.date)}</span>
                    <span className="mt-1 block text-sm text-[var(--text-muted)]">
                      {row.updates.length} hạng mục có cập nhật
                    </span>
                  </span>
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary-strong)] text-[var(--primary-contrast)]"
                        : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--primary-strong)]"
                    }`}
                  >
                    {isSelected ? "−" : "+"}
                  </span>
                </button>
                {isSelected ? <HistoryUpdateList updates={row.updates} /> : null}
              </article>
            );
          })}
        </section>
      ) : null}

      </div>

      <WorkerPendingUpdateBar
        className="fixed inset-x-3 bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] z-50 mx-auto max-w-[520px]"
        isOnline={isOnline}
        isSubmitting={isSubmittingUpdates}
        onDiscard={onDiscardUpdates}
        onSubmit={onSubmitUpdates}
        pendingCount={pendingUpdateCount}
      />

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3">
        <div className="floating-pill mx-auto grid max-w-[520px] grid-cols-3 gap-1 rounded-[var(--radius-card)] p-2 text-center text-[11px] font-semibold">
          {tabs.map((item) => (
            <button
              className={`focus-ring pressable flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-field)] px-1 leading-tight ${
                item.key === tab
                  ? "bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-md"
                  : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              key={item.key}
              onClick={() => setTab(item.key)}
              type="button"
            >
              <Icon className="shrink-0" name={item.icon} />
              <span className="mobile-button-label max-w-full">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
};

export const ProgressDonutChart = ({
  completed,
  inProgress,
  notStarted,
  overallPercent,
  total
}: {
  readonly completed: number;
  readonly inProgress: number;
  readonly notStarted: number;
  readonly overallPercent: number;
  readonly total: number;
}): React.ReactElement => {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - overallPercent / 100);

  return (
    <section className="glass-card mobile-chart-card rounded-[var(--radius-card)] p-5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
            Tiến độ tổng
          </p>
          <h2 className="mt-1 text-lg font-semibold">Tỉ lệ hoàn thành</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {total} hạng mục đang theo dõi
          </p>
        </div>
        <svg
          aria-label={`Tiến độ trung bình ${overallPercent}%`}
          className="mobile-chart-donut h-28 w-28 shrink-0 sm:h-32 sm:w-32"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--surface-muted)"
            strokeWidth="14"
          />
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--primary-strong)"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth="14"
            transform="rotate(-90 60 60)"
          />
          <text
            className="fill-[var(--foreground)] text-2xl font-semibold"
            dominantBaseline="middle"
            textAnchor="middle"
            x="60"
            y="56"
          >
            {overallPercent}%
          </text>
          <text
            className="fill-[var(--text-muted)] text-xs font-semibold"
            dominantBaseline="middle"
            textAnchor="middle"
            x="60"
            y="76"
          >
            tiến độ
          </text>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <ChartStat label="Xong" tone="success" value={completed} />
        <ChartStat label="Đang làm" tone="accent" value={inProgress} />
        <ChartStat label="Chưa làm" tone="neutral" value={notStarted} />
      </div>
    </section>
  );
};

export const DailyCompletionChart = ({
  rows
}: {
  readonly rows: readonly HistoryRow[];
}): React.ReactElement => {
  const chartRows = [...rows].reverse();
  const maxCompleted = Math.max(0, ...chartRows.map((row) => row.completed));
  const scaleMax = Math.max(1, maxCompleted);

  return (
    <section className="glass-card mobile-chart-card rounded-[var(--radius-card)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
            Hoàn thành theo ngày
          </p>
          <h2 className="mt-1 text-lg font-semibold">7 ngày gần nhất</h2>
        </div>
        <p className="rounded-full bg-[var(--primary-pale)] px-3 py-1 text-sm font-semibold text-[var(--primary-strong)]">
          Max {maxCompleted}
        </p>
      </div>

      <div
        aria-label="Biểu đồ cột số hạng mục hoàn thành theo ngày"
        className="mobile-daily-chart mt-5 flex h-40 min-w-0 items-end gap-1 sm:gap-2"
        role="img"
      >
        {chartRows.map((row) => {
          const height =
            row.completed === 0 ? 8 : Math.max(16, (row.completed / scaleMax) * 128);
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 sm:gap-2" key={row.date}>
              <div className="mobile-daily-bar flex h-32 w-full items-end rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-1 ring-1 ring-[var(--border)]">
                <div
                  className="w-full rounded-[calc(var(--radius-field)-0.25rem)] bg-[var(--primary-strong)] shadow-sm"
                  style={{ height }}
                />
              </div>
              <span className="mobile-chart-date font-semibold text-[var(--text-muted)]">
                {row.date.slice(8, 10)}/{row.date.slice(5, 7)}
              </span>
              <span className="mobile-chart-value font-semibold tabular-nums">{row.completed}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export const HistoryUpdateList = ({
  updates
}: {
  readonly updates: readonly HistoryTaskUpdate[];
}): React.ReactElement => {
  if (updates.length === 0) {
    return (
      <div className="border-t border-[var(--border)] px-5 pb-5 pt-1">
        <div className="rounded-[var(--radius-card)] bg-[var(--primary-pale)] p-4 text-sm font-semibold text-[var(--text-muted)]">
          Không có cập nhật trong ngày này.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-[var(--border)] px-4 pb-4 pt-2">
      {updates.map(({ task, record }) => (
        <div
          className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-muted)] p-3"
          key={`${record.reportDate}-${task.id}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-base font-semibold">{task.tagname}</p>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">
                {task.taskName}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                <span className="rounded bg-[var(--danger)] px-2 py-1 text-white">
                  P{task.priority}
                </span>
                <span className="rounded bg-[var(--info)] px-2 py-1 text-white">
                  {task.donVi || "N/A"}
                </span>
                <span className="rounded bg-[var(--surface)] px-2 py-1 text-[var(--foreground)] ring-1 ring-[var(--border-strong)]">
                  WO {task.wo || "N/A"}
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--primary-strong)] px-3 py-2 text-sm font-semibold text-[var(--primary-contrast)] tabular-nums">
              {record.percent}%
            </span>
          </div>
          {record.note ? (
            <p className="mt-3 rounded-[var(--radius-field)] bg-[var(--primary-pale)] px-3 py-2 text-sm text-[var(--foreground)]">
              {record.note}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const ChartStat = ({
  label,
  tone,
  value
}: {
  readonly label: string;
  readonly tone: "success" | "accent" | "neutral";
  readonly value: number;
}): React.ReactElement => {
  const toneClass =
    tone === "success"
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : tone === "accent"
        ? "bg-[var(--surface-warm)] text-[var(--accent-strong)]"
        : "bg-[var(--surface-muted)] text-[var(--text-muted)] ring-1 ring-[var(--border)]";

  return (
    <div className={`mobile-chart-stat rounded-[var(--radius-field)] p-3 text-center ${toneClass}`}>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="mobile-button-label mt-1 text-xs font-semibold leading-tight">{label}</p>
    </div>
  );
};
