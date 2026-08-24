"use client";

import { useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { ModeSwitch } from "@/components/ModeSwitch";
import { ModuleSwitcher } from "@/components/ModuleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, Badge, Icon, PageHeader, type IconName } from "@/components/ui";
import { CountdownBanner } from "@/components/worker/CountdownBanner";
import { SummaryPills } from "@/components/worker/SummaryPills";
import { WorkerGroupedTaskList } from "@/components/worker/WorkerGroupedTaskList";
import { WorkerPendingUpdateBar } from "@/components/worker/WorkerPendingUpdateBar";
import { WorkerSearchControls } from "@/components/worker/WorkerSearchControls";
import {
  getTaskUnitOptions,
  groupWorkerTasks,
  type WorkerGroupMode,
  type WorkerPriorityFilter
} from "@/components/worker/taskView";
import type {
  QueueSyncState,
  SaveState,
  WorkerFilter,
  WorkerProgressUpdate
} from "@/components/worker/types";
import { formatViDate, getPlanReportDates, getReportHistoryDates } from "@/lib/date";
import { getTaskPercent, getTaskProgress } from "@/lib/progress";
import type { AuthAccount, PlanVersion, ProgressRecord, Task } from "@/types/domain";

interface WorkerMobileViewProps {
  readonly account: AuthAccount;
  readonly allTasks: readonly Task[];
  readonly filteredTasks: readonly Task[];
  readonly progress: readonly ProgressRecord[];
  readonly reportDate: string;
  readonly displayProgress: readonly ProgressRecord[];
  readonly filter: WorkerFilter;
  readonly searchQuery: string;
  readonly selectedTaskDate: string;
  readonly selectedPriority: WorkerPriorityFilter;
  readonly selectedUnit: string;
  readonly isOnline: boolean;
  readonly lastSyncedAt: string | null;
  readonly pendingUpdateCount: number;
  readonly planVersion?: PlanVersion;
  readonly queuedUpdateCount: number;
  readonly queueSyncState: QueueSyncState;
  readonly isSubmittingUpdates: boolean;
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly onFilterChange: (filter: WorkerFilter) => void;
  readonly onSearchChange: (query: string) => void;
  readonly onTaskDateChange: (date: string) => void;
  readonly onPriorityChange: (priority: WorkerPriorityFilter) => void;
  readonly onUnitChange: (unit: string) => void;
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
  { key: "tasks", label: "Nhập liệu", icon: "list" },
  { key: "overview", label: "Tổng quan", icon: "chart" },
  { key: "history", label: "Lịch sử", icon: "history" }
];

export const WorkerMobileView = ({
  account,
  allTasks,
  filteredTasks,
  progress,
  reportDate,
  displayProgress,
  filter,
  searchQuery,
  selectedTaskDate,
  selectedPriority,
  selectedUnit,
  isOnline,
  lastSyncedAt,
  pendingUpdateCount,
  planVersion,
  queuedUpdateCount,
  queueSyncState,
  isSubmittingUpdates,
  saveStates,
  onFilterChange,
  onSearchChange,
  onTaskDateChange,
  onPriorityChange,
  onUnitChange,
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
    getTaskPercent(progress, task.id, reportDate)
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
      getTaskPercent(progress, task.id, reportDate) < 100
  ).length;
  const taskGroups = groupWorkerTasks(filteredTasks, groupMode);
  const taskDateOptions = getPlanReportDates(allTasks);
  const unitOptions = getTaskUnitOptions(allTasks);
  const reportDates = getReportHistoryDates(
    allTasks,
    progress.map((record) => record.reportDate),
    reportDate
  );
  const historyRows = [...reportDates]
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
      className="worker-mobile-view mobile-native-page min-h-dvh w-full max-w-[100vw] overflow-x-hidden px-2 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.75rem)] pt-2 sm:px-3 lg:hidden"
      style={{ "--mobile-topbar-height": "10.5rem" } as React.CSSProperties}
    >
      <div className="app-shell mobile-native-shell min-h-[calc(100dvh-1rem)] w-full max-w-none overflow-hidden rounded-[var(--radius-panel)]">
      <header className="mobile-topbar sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)] px-3 pb-3">
        <ModuleSwitcher
          activeModule="bdtt"
          bdttHref={isAdminAccount ? "/admin" : "/worker"}
          className="mb-2 mt-3"
          compact
        />
        <PageHeader
          eyebrow={`Công việc · BDTT ${reportDate.slice(0, 4)}`}
          title="Báo cáo tiến độ"
        />
        {planVersion ? (
          <p className="mt-1 text-xs font-normal leading-5 text-[var(--text-muted)]">
            Kế hoạch: {planVersion.fileName} · cập nhật {new Date(planVersion.importedAt).toLocaleString("vi-VN")}
          </p>
        ) : null}

        <div className="mobile-header-actions mt-2 gap-2">
          {isAdminAccount ? (
            <ModeSwitch
              activeMode="workspace"
              className="max-w-none flex-1 text-xs"
              href="/admin"
            />
          ) : (
            <div className="inline-flex min-h-11 min-w-0 flex-1 items-center rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-soft-sm)]">
              <span className="min-w-0 truncate">Công việc</span>
            </div>
          )}
          <GlobalNotifications />
          <ThemeToggle className="shrink-0" />
          <AccountMenu
            account={account}
            onLogout={onLogout}
            showInstallButton
            statusLabel={isOnline ? "Trực tuyến" : "Ngoại tuyến"}
            statusTone={isOnline ? "success" : "warning"}
          />
        </div>

      </header>

      {tab === "tasks" ? (
        <>
          {!isOnline ? (
            <div
              aria-live="polite"
              className="bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]"
            >
              Đang ngoại tuyến. Cập nhật sẽ được lưu tạm và đồng bộ khi có mạng.
            </div>
          ) : null}
          <CountdownBanner />

          <section className="space-y-2 border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2">
            <SummaryPills percents={percents} />
            <WorkerSearchControls
              filter={filter}
              groupMode={groupMode}
              inputId="worker-mobile-task-search"
              onFilterChange={onFilterChange}
              onGroupModeChange={setGroupMode}
              onSearchChange={onSearchChange}
              onPriorityChange={onPriorityChange}
              onTaskDateChange={onTaskDateChange}
              onUnitChange={onUnitChange}
              resultLabel={`${filteredTasks.length}/${allTasks.length} hạng mục`}
              searchQuery={searchQuery}
              selectedPriority={selectedPriority}
              selectedTaskDate={selectedTaskDate}
              taskDateOptions={taskDateOptions}
              selectedUnit={selectedUnit}
              unitOptions={unitOptions}
            />
          </section>

          <section className="space-y-2 px-3 py-2.5 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+4rem)]">
            <WorkerGroupedTaskList
              onCancel={onCancel}
              onChange={onChange}
              progress={displayProgress}
              reportDate={reportDate}
              saveStates={saveStates}
              taskGroups={taskGroups}
            />
          </section>
        </>
      ) : null}

      {tab === "overview" ? (
        <section className="space-y-3 px-3 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+4rem)] pt-3">
          <section className="glass-card rounded-[var(--radius-card)] p-3">
            <div className="mb-3 flex min-w-0 items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--info-soft)] text-[var(--info-strong)]">
                <Icon name="chart" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">Cơ cấu tiến độ</h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">{activeTasks.length} hạng mục chưa cancel</p>
              </div>
            </div>
            <SummaryPills percents={percents} />
          </section>
          <ProgressDonutChart
            completed={completedCount}
            inProgress={inProgressCount}
            notStarted={notStartedCount}
            overallPercent={overallPercent}
            total={activeTasks.length}
          />
          <DailyCompletionChart rows={historyRows} />
          <section className="glass-card rounded-[var(--radius-card)] p-3">
            <div className="mb-3 flex min-w-0 items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--warning-soft)] text-[var(--warning-strong)]">
                <Icon name="bell" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold">Tổng quan cá nhân</h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">Theo ngày báo cáo hiện tại</p>
              </div>
            </div>
            <Alert tone={p1Open > 0 ? "warning" : "success"}>
              Hạng mục P1 chưa xong: <strong>{p1Open}</strong>. Dữ liệu tính theo ngày báo cáo hiện tại.
            </Alert>
          </section>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-2 px-3 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+4rem)] pt-3">
          {historyRows.map((row) => {
            const isSelected = selectedHistoryDate === row.date;
            return (
              <article className="glass-card overflow-hidden rounded-[var(--radius-card)]" key={row.date}>
                <button
                  aria-expanded={isSelected}
                  className="focus-ring pressable flex min-h-16 w-full items-center justify-between gap-3 p-3 text-left"
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
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] border text-sm font-semibold ${
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
        className="fixed inset-x-2 bottom-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+0.5rem)] z-50 mx-auto max-w-[520px]"
        isOnline={isOnline}
        isSubmitting={isSubmittingUpdates}
        lastSyncedAt={lastSyncedAt}
        onDiscard={onDiscardUpdates}
        onSubmit={onSubmitUpdates}
        pendingCount={pendingUpdateCount}
        queuedCount={queuedUpdateCount}
        syncState={queueSyncState}
      />

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3">
        <div className="floating-pill mx-auto grid w-full max-w-[520px] grid-cols-3 gap-1 rounded-[var(--radius-card)] p-2 text-center text-[11px] font-semibold">
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
    <section className="glass-card mobile-chart-card rounded-[var(--radius-card)] p-3">
      <div className="mobile-reflow-row flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--primary-soft)] text-[var(--primary-strong)]">
            <Icon name="chart" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
              Tiến độ tổng
            </p>
            <h2 className="mt-1 text-lg font-semibold">Tỉ lệ hoàn thành</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {total} hạng mục đang theo dõi
            </p>
          </div>
        </div>
        <svg
          aria-label={`Tiến độ trung bình ${overallPercent}%`}
          className="mobile-chart-donut h-24 w-24 shrink-0 sm:h-28 sm:w-28"
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

      <div className="mobile-reflow-grid mt-3 grid grid-cols-3 gap-1.5">
        <ChartStat label="Xong" tone="success" value={completed} />
        <ChartStat label="Đang làm" tone="accent" value={inProgress} />
        <ChartStat label="Chưa làm" tone="warning" value={notStarted} />
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
    <section className="glass-card mobile-chart-card rounded-[var(--radius-card)] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--info-soft)] text-[var(--info-strong)]">
            <Icon name="calendar" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--info-strong)]">
              Hoàn thành theo ngày
            </p>
            <h2 className="mt-1 text-lg font-semibold">7 ngày báo cáo gần nhất</h2>
          </div>
        </div>
        <Badge tone="primary">Max {maxCompleted}</Badge>
      </div>

      {maxCompleted === 0 ? (
        <Alert className="mt-3" tone="warning">
          Chưa có hạng mục hoàn thành trong các ngày báo cáo gần nhất.
        </Alert>
      ) : (
        <>
          <div className="mt-3 grid gap-2 md:hidden">
            {chartRows.map((row) => (
              <div className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 ring-1 ring-[var(--border)]" key={row.date}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--text-muted)]">{row.date.slice(8, 10)}/{row.date.slice(5, 7)}</span>
                  <strong className="tabular-nums text-[var(--primary-strong)]">{row.completed} hạng mục</strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]">
                  <div
                    className="h-full rounded-full bg-[var(--primary-strong)]"
                    style={{ width: `${Math.max(2, (row.completed / scaleMax) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div
            aria-label="Biểu đồ cột số hạng mục hoàn thành theo ngày"
            className="mobile-daily-chart mt-3 hidden h-36 min-w-0 items-end gap-1 md:flex md:gap-2"
            role="img"
          >
            {chartRows.map((row) => {
              const height =
                row.completed === 0 ? 8 : Math.max(16, (row.completed / scaleMax) * 128);
              return (
                <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 md:gap-2" key={row.date}>
                  <div className="mobile-daily-bar flex h-28 w-full items-end rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-1.5 ring-1 ring-[var(--border)]">
                    <div
                      className="w-full rounded-full bg-[var(--primary-strong)] shadow-sm"
                      style={{ height }}
                    />
                  </div>
                  <span className="mobile-chart-date font-medium text-[var(--text-muted)]">
                    {row.date.slice(8, 10)}/{row.date.slice(5, 7)}
                  </span>
                  <span className="mobile-chart-value font-semibold tabular-nums">{row.completed}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
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
        <div className="rounded-[var(--radius-card)] bg-[var(--primary-pale)] p-4 text-sm font-medium text-[var(--text-muted)]">
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
              <p className="break-words font-mono text-base font-semibold text-[var(--info-strong)]">{task.tagname}</p>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">
                {task.taskName}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                <Badge solid tone="danger">
                  P{task.priority}
                </Badge>
                <Badge solid tone="info">
                  {task.donVi || "N/A"}
                </Badge>
                <Badge solid tone="neutral">
                  WO {task.wo || "N/A"}
                </Badge>
              </div>
            </div>
            <span className="shrink-0 rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-3 py-2 text-sm font-semibold text-[var(--primary-contrast)] tabular-nums">
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
  readonly tone: "success" | "accent" | "warning";
  readonly value: number;
}): React.ReactElement => {
  const toneClass =
    tone === "success"
      ? "text-[var(--success-strong)]"
      : tone === "accent"
        ? "text-[var(--accent-strong)]"
        : "text-[var(--warning-strong)]";
  const iconName: Record<typeof tone, IconName> = {
    success: "check",
    accent: "chart",
    warning: "list"
  };

  return (
    <div className={`metric-card mobile-chart-stat min-w-0 rounded-[var(--radius-card)] p-3 text-left ${toneClass}`}>
      <div className="flex min-w-0 items-center gap-2 pr-5">
        <Icon name={iconName[tone]} />
        <p className="mobile-button-label min-w-0 text-xs font-semibold leading-tight [overflow-wrap:anywhere]">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-current">{value}</p>
    </div>
  );
};
