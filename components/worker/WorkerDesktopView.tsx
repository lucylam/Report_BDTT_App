"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { CompanyBrand } from "@/components/CompanyBrand";
import { DeveloperMark } from "@/components/DeveloperMark";
import { ModeSwitch } from "@/components/ModeSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Icon, PageHeader, Widget, WidgetHeader, type IconName } from "@/components/ui";
import { SummaryPills } from "@/components/worker/SummaryPills";
import {
  DailyCompletionChart,
  HistoryUpdateList,
  ProgressDonutChart,
  type HistoryRow,
  type HistoryTaskUpdate
} from "@/components/worker/WorkerMobileView";
import { WorkerDesktopTaskDetail } from "@/components/worker/WorkerDesktopTaskDetail";
import { WorkerDesktopTaskList } from "@/components/worker/WorkerDesktopTaskList";
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
import type { AuthAccount, Profile, ProgressPercent, ProgressRecord, Task } from "@/types/domain";

interface WorkerDesktopViewProps {
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

type DesktopTab = "tasks" | "overview" | "history";

const tabs: readonly {
  readonly key: DesktopTab;
  readonly label: string;
  readonly icon: IconName;
}[] = [
  { key: "tasks", label: "Việc của tôi", icon: "list" },
  { key: "overview", label: "Tổng quan", icon: "chart" },
  { key: "history", label: "Lịch sử", icon: "history" }
];

const filters: readonly { readonly key: WorkerFilter; readonly label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "todo", label: "Chưa làm" },
  { key: "progress", label: "Đang làm" },
  { key: "done", label: "Hoàn thành" },
  { key: "p1", label: "P1 chưa xong" },
  { key: "cancelled", label: "Hủy" }
];

const sidebarNavTypographyStyle = {
  fontFamily: "var(--font-sans)",
  fontSize: "0.875rem",
  fontWeight: 600,
  lineHeight: "1.25rem"
};

const SEARCH_INPUT_ID = "worker-desktop-task-search";

export const WorkerDesktopView = ({
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
}: WorkerDesktopViewProps): React.ReactElement => {
  const isAdminAccount = account.role === "admin";
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    filteredTasks[0]?.id ?? null
  );
  const [groupMode, setGroupMode] = useState<WorkerGroupMode>("unit");
  const [tab, setTab] = useState<DesktopTab>("tasks");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || isTyping) {
        return;
      }
      event.preventDefault();
      setTab("tasks");
      document.getElementById(SEARCH_INPUT_ID)?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeTasks = allTasks.filter((task) => !task.isCancelled);
  const percents: readonly ProgressPercent[] = activeTasks.map((task) =>
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
  const taskGroups = groupWorkerTasks(filteredTasks, groupMode);
  const unitChips = getTaskUnitChips(allTasks, 8);
  const historyRows: readonly HistoryRow[] = REPORT_DATES.slice(-7)
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
  const selectedTask = useMemo(() => {
    return (
      filteredTasks.find((task) => task.id === selectedTaskId) ??
      filteredTasks[0] ??
      null
    );
  }, [filteredTasks, selectedTaskId]);

  return (
    <main className="hidden min-h-dvh w-full max-w-[100vw] overflow-x-hidden p-2 sm:p-3 lg:block lg:p-5">
      <div className="app-shell mx-auto grid min-h-[calc(100dvh-2.5rem)] max-w-[1700px] grid-cols-[218px_minmax(0,1fr)] overflow-hidden rounded-[22px]">
        <aside className="flex border-r border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="flex min-h-full w-full flex-col">
            <Link
              className="focus-ring rounded-[var(--radius-card)] p-1"
              href={isAdminAccount ? "/admin" : "/worker"}
            >
              <CompanyBrand variant="sidebar" />
            </Link>

            <nav className="mt-6 flex-1 space-y-1" aria-label="Workspace navigation">
              {tabs.map((item) => (
                <DesktopNavButton
                  active={item.key === tab}
                  icon={item.icon}
                  key={item.key}
                  label={item.label}
                  onClick={() => setTab(item.key)}
                />
              ))}
            </nav>

            <div className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-3">
              <p className="text-[11px] font-semibold uppercase text-[var(--text-soft)]">
                Phiên làm việc
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-[var(--foreground)]">
                {account.fullName}
              </p>
              <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-4 text-[var(--text-muted)]">
                {worker.orgTitle}
              </p>
            </div>
            <DeveloperMark className="mt-3" compact />
          </div>
        </aside>

        <section className="min-w-0">
          <header className="bg-transparent px-5 py-5">
            <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center">
              <PageHeader
                className="min-w-0 flex-1"
                description={`Ngày báo cáo: ${formatViDate(DEFAULT_REPORT_DATE)} · ${worker.orgTitle}`}
                eyebrow="Workspace · BDTT 2026"
                title="Báo cáo tiến độ"
              />

              <div className="flex min-w-0 items-center gap-2">
                <p
                  aria-live="polite"
                  className={`inline-flex min-h-11 items-center rounded-[var(--radius-field)] px-4 text-sm font-semibold shadow-[var(--shadow-soft-sm)] ${
                    isOnline
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--warning-soft)] text-[var(--warning)]"
                  }`}
                >
                  {isOnline ? "Online" : "Đang offline"}
                </p>
                <ThemeToggle />
                {isAdminAccount ? <ModeSwitch activeMode="workspace" href="/admin" /> : null}
              </div>

              <AccountMenu
                account={account}
                onLogout={onLogout}
                showInstallButton
                statusLabel={isOnline ? "Online" : "Đang offline"}
                statusTone={isOnline ? "success" : "warning"}
              />
            </div>
          </header>

          <div className="min-w-0 px-5 pb-6 pt-0">
            <div className="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-4 pt-5 lg:gap-5">
              {tab === "tasks" ? (
                <TasksWorkspace
                  allTasks={allTasks}
                  completedCount={completedCount}
                  displayProgress={displayProgress}
                  filter={filter}
                  filteredTasks={filteredTasks}
                  groupMode={groupMode}
                  inProgressCount={inProgressCount}
                  isOnline={isOnline}
                  isSubmittingUpdates={isSubmittingUpdates}
                  notStartedCount={notStartedCount}
                  onCancel={onCancel}
                  onChange={onChange}
                  onDiscardUpdates={onDiscardUpdates}
                  onFilterChange={onFilterChange}
                  onGroupModeChange={setGroupMode}
                  onSearchChange={onSearchChange}
                  onSelectTask={setSelectedTaskId}
                  onSubmitUpdates={onSubmitUpdates}
                  p1Open={p1Open}
                  pendingUpdateCount={pendingUpdateCount}
                  saveStates={saveStates}
                  searchQuery={searchQuery}
                  selectedTask={selectedTask}
                  taskGroups={taskGroups}
                  unitChips={unitChips}
                />
              ) : null}

              {tab === "overview" ? (
                <OverviewWorkspace
                  activeTasks={activeTasks}
                  completedCount={completedCount}
                  historyRows={historyRows}
                  inProgressCount={inProgressCount}
                  notStartedCount={notStartedCount}
                  overallPercent={overallPercent}
                  p1Open={p1Open}
                  percents={percents}
                />
              ) : null}

              {tab === "history" ? (
                <HistoryWorkspace
                  historyRows={historyRows}
                  selectedHistoryDate={selectedHistoryDate}
                  onSelectedHistoryDateChange={setSelectedHistoryDate}
                />
              ) : null}

            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

const TasksWorkspace = ({
  allTasks,
  completedCount,
  displayProgress,
  filter,
  filteredTasks,
  groupMode,
  inProgressCount,
  isOnline,
  isSubmittingUpdates,
  notStartedCount,
  onCancel,
  onChange,
  onDiscardUpdates,
  onFilterChange,
  onGroupModeChange,
  onSearchChange,
  onSelectTask,
  onSubmitUpdates,
  p1Open,
  pendingUpdateCount,
  saveStates,
  searchQuery,
  selectedTask,
  taskGroups,
  unitChips
}: {
  readonly allTasks: readonly Task[];
  readonly completedCount: number;
  readonly displayProgress: readonly ProgressRecord[];
  readonly filter: WorkerFilter;
  readonly filteredTasks: readonly Task[];
  readonly groupMode: WorkerGroupMode;
  readonly inProgressCount: number;
  readonly isOnline: boolean;
  readonly isSubmittingUpdates: boolean;
  readonly notStartedCount: number;
  readonly onCancel: (taskId: string) => void;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onDiscardUpdates: () => void;
  readonly onFilterChange: (filter: WorkerFilter) => void;
  readonly onGroupModeChange: (groupMode: WorkerGroupMode) => void;
  readonly onSearchChange: (query: string) => void;
  readonly onSelectTask: (taskId: string) => void;
  readonly onSubmitUpdates: () => void;
  readonly p1Open: number;
  readonly pendingUpdateCount: number;
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly searchQuery: string;
  readonly selectedTask: Task | null;
  readonly taskGroups: ReturnType<typeof groupWorkerTasks>;
  readonly unitChips: readonly string[];
}): React.ReactElement => {
  return (
    <section className="grid min-w-0 gap-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <WorkspaceMetric label="Tổng hạng mục" value={allTasks.length} tone="neutral" />
        <WorkspaceMetric label="Chưa làm" value={notStartedCount} tone="info" />
        <WorkspaceMetric label="Đang làm" value={inProgressCount} tone="warning" />
        <WorkspaceMetric label="Hoàn thành" value={completedCount} tone="success" />
        <WorkspaceMetric label="P1 chưa xong" value={p1Open} tone="danger" />
      </section>

      <WorkerPendingUpdateBar
        isOnline={isOnline}
        isSubmitting={isSubmittingUpdates}
        onDiscard={onDiscardUpdates}
        onSubmit={onSubmitUpdates}
        pendingCount={pendingUpdateCount}
      />

      <Widget>
        <WidgetHeader
          action={<Icon className="text-[var(--primary-strong)]" name="search" />}
          subtitle="Tìm theo tag, WorkOrder, hạng mục hoặc khu vực"
          title="Bộ lọc công việc"
        />
        <WorkerSearchControls
          groupMode={groupMode}
          inputId={SEARCH_INPUT_ID}
          onGroupModeChange={onGroupModeChange}
          onSearchChange={onSearchChange}
          resultLabel={`${filteredTasks.length}/${allTasks.length} hạng mục, nhấn / để tìm`}
          searchQuery={searchQuery}
          unitChips={unitChips}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              className={`focus-ring pressable min-h-10 rounded-[var(--radius-field)] border px-4 text-sm font-semibold ${
                item.key === filter
                  ? "border-[var(--primary)] bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-md"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              key={item.key}
              onClick={() => onFilterChange(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </Widget>

      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Widget className="min-w-0 p-4">
          <WidgetHeader
            subtitle={`Hiển thị ${filteredTasks.length}/${allTasks.length} dòng phù hợp`}
            title="Danh sách công việc"
          />
          <div className="max-h-[calc(100dvh-26rem)] min-h-[340px] overflow-auto pr-1">
            <WorkerDesktopTaskList
              onSelectTask={onSelectTask}
              progress={displayProgress}
              selectedTask={selectedTask}
              taskGroups={taskGroups}
            />
          </div>
        </Widget>

        <Widget className="sticky top-5 max-h-[calc(100dvh-8rem)] min-h-[340px] overflow-auto p-5">
          <WorkerDesktopTaskDetail
            onCancel={onCancel}
            onChange={onChange}
            progress={displayProgress}
            saveStates={saveStates}
            task={selectedTask}
          />
        </Widget>
      </section>
    </section>
  );
};

const OverviewWorkspace = ({
  activeTasks,
  completedCount,
  historyRows,
  inProgressCount,
  notStartedCount,
  overallPercent,
  p1Open,
  percents
}: {
  readonly activeTasks: readonly Task[];
  readonly completedCount: number;
  readonly historyRows: readonly HistoryRow[];
  readonly inProgressCount: number;
  readonly notStartedCount: number;
  readonly overallPercent: number;
  readonly p1Open: number;
  readonly percents: readonly ProgressPercent[];
}): React.ReactElement => (
  <section className="grid gap-4">
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <WorkspaceMetric label="Tiến độ trung bình" value={`${overallPercent}%`} tone="success" />
      <WorkspaceMetric label="Hoàn thành" value={completedCount} tone="success" />
      <WorkspaceMetric label="Đang làm" value={inProgressCount} tone="warning" />
      <WorkspaceMetric label="Chưa làm" value={notStartedCount} tone="info" />
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ProgressDonutChart
        completed={completedCount}
        inProgress={inProgressCount}
        notStarted={notStartedCount}
        overallPercent={overallPercent}
        total={activeTasks.length}
      />
      <DailyCompletionChart rows={historyRows} />
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Widget className="p-5">
        <WidgetHeader title="Điểm cần chú ý" subtitle="Theo ngày báo cáo hiện tại" />
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Hạng mục P1 chưa xong: <strong>{p1Open}</strong>. Dữ liệu tính theo ngày báo cáo hiện tại.
        </p>
      </Widget>
      <Widget className="p-5">
        <WidgetHeader title="Cơ cấu tiến độ" subtitle={`${activeTasks.length} hạng mục chưa cancel`} />
        <SummaryPills percents={percents} />
      </Widget>
    </section>
  </section>
);

const HistoryWorkspace = ({
  historyRows,
  selectedHistoryDate,
  onSelectedHistoryDateChange
}: {
  readonly historyRows: readonly HistoryRow[];
  readonly selectedHistoryDate: string | null;
  readonly onSelectedHistoryDateChange: (date: string | null) => void;
}): React.ReactElement => (
  <section className="grid gap-4">
    <Widget className="p-5">
      <WidgetHeader
        subtitle={`${historyRows.reduce((total, row) => total + row.updates.length, 0)} cập nhật`}
        title="Lịch sử 7 ngày gần nhất"
      />
      <div className="grid gap-3 xl:grid-cols-2">
        {historyRows.map((row) => {
          const isSelected = selectedHistoryDate === row.date;
          return (
            <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]" key={row.date}>
              <button
                aria-expanded={isSelected}
                className="focus-ring pressable flex min-h-20 w-full items-center justify-between gap-3 p-4 text-left"
                onClick={() =>
                  onSelectedHistoryDateChange(isSelected ? null : row.date)
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
                  {isSelected ? "-" : "+"}
                </span>
              </button>
              {isSelected ? <HistoryUpdateList updates={row.updates} /> : null}
            </article>
          );
        })}
      </div>
    </Widget>
  </section>
);

const DesktopNavButton = ({
  active,
  icon,
  label,
  onClick
}: {
  readonly active: boolean;
  readonly icon: IconName;
  readonly label: string;
  readonly onClick: () => void;
}): React.ReactElement => (
  <button
    aria-pressed={active}
    className={`focus-ring flex min-h-11 w-full items-center gap-2 rounded-xl border-0 bg-transparent px-3 text-left text-sm font-semibold leading-5 tracking-normal no-underline transition ${
      active
        ? "bg-[var(--primary-soft)] text-[var(--foreground)]"
        : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
    }`}
    onClick={onClick}
    style={sidebarNavTypographyStyle}
    type="button"
  >
    <Icon className={active ? "text-[var(--primary-strong)]" : ""} name={icon} />
    <span className="truncate">{label}</span>
  </button>
);

const WorkspaceMetric = ({
  label,
  tone,
  value
}: {
  readonly label: string;
  readonly tone: "neutral" | "info" | "success" | "warning" | "danger";
  readonly value: number | string;
}): React.ReactElement => {
  const colorClass: Record<typeof tone, string> = {
    neutral: "text-[var(--text-muted)]",
    info: "text-[var(--info)]",
    success: "text-[var(--success)]",
    warning: "text-[var(--accent)]",
    danger: "text-[var(--danger)]"
  };

  return (
    <article className={`metric-card rounded-[var(--radius-card)] p-4 ${colorClass[tone]}`}>
      <p className="text-[11px] font-semibold uppercase text-[var(--text-soft)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-current">{value}</p>
    </article>
  );
};
