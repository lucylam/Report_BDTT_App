"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccountMenu } from "@/components/AccountMenu";
import { CompanyBrand } from "@/components/CompanyBrand";
import { DeveloperMark } from "@/components/DeveloperMark";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { ModeSwitch } from "@/components/ModeSwitch";
import { ModuleSwitcher } from "@/components/ModuleSwitcher";
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
  getTaskUnitOptions,
  groupWorkerTasks,
  type WorkerGroupMode
} from "@/components/worker/taskView";
import type {
  QueueSyncState,
  SaveState,
  WorkerFilter,
  WorkerProgressUpdate
} from "@/components/worker/types";
import { DEFAULT_REPORT_DATE, formatViDate, getAvailableReportDates } from "@/lib/date";
import { getTaskPercent, getTaskProgress } from "@/lib/progress";
import type { AuthAccount, PlanVersion, Profile, ProgressPercent, ProgressRecord, Task } from "@/types/domain";

interface WorkerDesktopViewProps {
  readonly account: AuthAccount;
  readonly worker: Profile;
  readonly allTasks: readonly Task[];
  readonly filteredTasks: readonly Task[];
  readonly progress: readonly ProgressRecord[];
  readonly displayProgress: readonly ProgressRecord[];
  readonly filter: WorkerFilter;
  readonly searchQuery: string;
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
  readonly onUnitChange: (unit: string) => void;
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
  { key: "tasks", label: "Nhập liệu hôm nay", icon: "list" },
  { key: "overview", label: "Tổng quan", icon: "chart" },
  { key: "history", label: "Lịch sử", icon: "history" }
];

const sidebarNavTypographyStyle = {
  fontFamily: "var(--font-sans)",
  fontSize: "0.9375rem",
  fontWeight: 600,
  lineHeight: "1.375rem"
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
  onUnitChange,
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
      onFilterChange("all");
      onUnitChange("");
      document.getElementById(SEARCH_INPUT_ID)?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onFilterChange, onUnitChange]);

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
  const unitOptions = getTaskUnitOptions(allTasks);
  const reportDates = getAvailableReportDates(progress.map((record) => record.reportDate));
  const historyRows: readonly HistoryRow[] = reportDates.slice(-7)
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
    <main className="hidden min-h-dvh w-full max-w-[100vw] overflow-x-hidden p-3 lg:block 2xl:p-4">
      <div className="app-shell mx-auto grid min-h-[calc(100dvh-1.5rem)] w-full max-w-none grid-cols-[218px_minmax(0,1fr)] overflow-hidden rounded-[22px] 2xl:min-h-[calc(100dvh-2rem)]">
        <aside className="flex border-r border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="flex min-h-full w-full flex-col">
            <Link
              className="focus-ring rounded-[var(--radius-card)] p-1"
              href="/"
            >
              <CompanyBrand variant="sidebar" />
            </Link>
            <ModuleSwitcher
              activeModule="bdtt"
              bdttHref={isAdminAccount ? "/admin" : "/worker"}
              className="mt-4"
              compact
            />

            <nav className="mt-4 flex-1 space-y-1" aria-label="Điều hướng công việc">
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
              <p className="mt-0.5 truncate text-xs font-semibold text-[var(--text-muted)]">
                {worker.orgTitle}
              </p>
            </div>
            <DeveloperMark className="mt-3" compact />
          </div>
        </aside>

        <section className="min-w-0">
          <header className="border-b border-[var(--line)] bg-[var(--surface)]/96 px-5 py-5 backdrop-blur-xl">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
              <PageHeader
                className="min-w-0 flex-1"
                description={`Ngày báo cáo: ${formatViDate(DEFAULT_REPORT_DATE)} · ${worker.orgTitle}${planVersion ? ` · KH cập nhật ${new Date(planVersion.importedAt).toLocaleString("vi-VN")}` : ""}`}
                eyebrow={`Công việc · BDTT ${DEFAULT_REPORT_DATE.slice(0, 4)}`}
                title="Báo cáo tiến độ"
              />

              <div className="flex min-w-0 items-center gap-2">
                <p
                  aria-live="polite"
                  className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ${
                    isOnline
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--warning-soft)] text-[var(--warning)]"
                  }`}
                >
                  {isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                </p>
                <GlobalNotifications />
                <ThemeToggle />
                {isAdminAccount ? <ModeSwitch activeMode="workspace" href="/admin" /> : null}
              </div>

              <AccountMenu
                account={account}
                onLogout={onLogout}
                showInstallButton
                statusLabel={isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                statusTone={isOnline ? "success" : "warning"}
              />
            </div>
          </header>

          <div className="min-w-0 px-5 pb-6 pt-4">
            <div className="mx-auto flex w-full max-w-none min-w-0 flex-col gap-4">
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
                  lastSyncedAt={lastSyncedAt}
                  notStartedCount={notStartedCount}
                  onCancel={onCancel}
                  onChange={onChange}
                  onDiscardUpdates={onDiscardUpdates}
                  onFilterChange={onFilterChange}
                  onGroupModeChange={setGroupMode}
                  onSearchChange={onSearchChange}
                  onUnitChange={onUnitChange}
                  onSelectTask={setSelectedTaskId}
                  onSubmitUpdates={onSubmitUpdates}
                  p1Open={p1Open}
                  pendingUpdateCount={pendingUpdateCount}
                  queuedUpdateCount={queuedUpdateCount}
                  queueSyncState={queueSyncState}
                  saveStates={saveStates}
                  searchQuery={searchQuery}
                  selectedUnit={selectedUnit}
                  selectedTask={selectedTask}
                  taskGroups={taskGroups}
                  unitOptions={unitOptions}
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
  lastSyncedAt,
  notStartedCount,
  onCancel,
  onChange,
  onDiscardUpdates,
  onFilterChange,
  onGroupModeChange,
  onSearchChange,
  onUnitChange,
  onSelectTask,
  onSubmitUpdates,
  p1Open,
  pendingUpdateCount,
  queuedUpdateCount,
  queueSyncState,
  saveStates,
  searchQuery,
  selectedUnit,
  selectedTask,
  taskGroups,
  unitOptions
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
  readonly lastSyncedAt: string | null;
  readonly notStartedCount: number;
  readonly onCancel: (taskId: string) => void;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onDiscardUpdates: () => void;
  readonly onFilterChange: (filter: WorkerFilter) => void;
  readonly onGroupModeChange: (groupMode: WorkerGroupMode) => void;
  readonly onSearchChange: (query: string) => void;
  readonly onUnitChange: (unit: string) => void;
  readonly onSelectTask: (taskId: string) => void;
  readonly onSubmitUpdates: () => void;
  readonly p1Open: number;
  readonly pendingUpdateCount: number;
  readonly queuedUpdateCount: number;
  readonly queueSyncState: QueueSyncState;
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly searchQuery: string;
  readonly selectedUnit: string;
  readonly selectedTask: Task | null;
  readonly taskGroups: ReturnType<typeof groupWorkerTasks>;
  readonly unitOptions: readonly string[];
}): React.ReactElement => {
  return (
    <section className="grid min-w-0 gap-3">
      <section className="grid overflow-hidden border border-[var(--line)] sm:grid-cols-2 xl:grid-cols-5">
        <WorkspaceMetric label="Tổng hạng mục" value={allTasks.length} tone="neutral" />
        <WorkspaceMetric label="Chưa làm" value={notStartedCount} tone="info" />
        <WorkspaceMetric label="Đang làm" value={inProgressCount} tone="warning" />
        <WorkspaceMetric label="Hoàn thành" value={completedCount} tone="success" />
        <WorkspaceMetric label="P1 chưa xong" value={p1Open} tone="danger" />
      </section>

      <WorkerPendingUpdateBar
        isOnline={isOnline}
        isSubmitting={isSubmittingUpdates}
        lastSyncedAt={lastSyncedAt}
        onDiscard={onDiscardUpdates}
        onSubmit={onSubmitUpdates}
        pendingCount={pendingUpdateCount}
        queuedCount={queuedUpdateCount}
        syncState={queueSyncState}
      />

      <Widget>
        <WidgetHeader
          action={<Icon className="text-[var(--primary-strong)]" name="search" />}
          subtitle="Tìm theo tag, WorkOrder, hạng mục hoặc khu vực"
          title="Bộ lọc công việc"
        />
        <WorkerSearchControls
          filter={filter}
          groupMode={groupMode}
          inputId={SEARCH_INPUT_ID}
          onFilterChange={onFilterChange}
          onGroupModeChange={onGroupModeChange}
          onSearchChange={onSearchChange}
          onUnitChange={onUnitChange}
          resultLabel={`${filteredTasks.length}/${allTasks.length} hạng mục, nhấn / để tìm`}
          searchQuery={searchQuery}
          selectedUnit={selectedUnit}
          unitOptions={unitOptions}
        />
      </Widget>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Widget className="min-w-0">
          <WidgetHeader
            subtitle={`Hiển thị ${filteredTasks.length}/${allTasks.length} dòng phù hợp`}
            title="Danh sách công việc"
          />
          <div className="max-h-[calc(100dvh-20rem)] overflow-auto pr-1">
            <WorkerDesktopTaskList
              onSelectTask={onSelectTask}
              progress={displayProgress}
              selectedTask={selectedTask}
              taskGroups={taskGroups}
            />
          </div>
        </Widget>

        <Widget className="sticky top-3 max-h-[calc(100dvh-6rem)] overflow-auto">
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
  <section className="grid gap-3">
    <section className="grid overflow-hidden border border-[var(--line)] sm:grid-cols-2 xl:grid-cols-4">
      <WorkspaceMetric label="Tiến độ trung bình" value={`${overallPercent}%`} tone="success" />
      <WorkspaceMetric label="Hoàn thành" value={completedCount} tone="success" />
      <WorkspaceMetric label="Đang làm" value={inProgressCount} tone="warning" />
      <WorkspaceMetric label="Chưa làm" value={notStartedCount} tone="info" />
    </section>

    <section className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <ProgressDonutChart
        completed={completedCount}
        inProgress={inProgressCount}
        notStarted={notStartedCount}
        overallPercent={overallPercent}
        total={activeTasks.length}
      />
      <DailyCompletionChart rows={historyRows} />
    </section>

    <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Widget>
        <WidgetHeader title="Điểm cần chú ý" subtitle="Theo ngày báo cáo hiện tại" />
        <p className="text-sm leading-6 text-[var(--text-muted)]">
          Hạng mục P1 chưa xong: <strong>{p1Open}</strong>. Dữ liệu tính theo ngày báo cáo hiện tại.
        </p>
      </Widget>
      <Widget>
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
  <section className="grid gap-3">
    <Widget>
      <WidgetHeader
        subtitle={`${historyRows.reduce((total, row) => total + row.updates.length, 0)} cập nhật`}
        title="Lịch sử 7 ngày gần nhất"
      />
      <div className="grid gap-2 xl:grid-cols-2">
        {historyRows.map((row) => {
          const isSelected = selectedHistoryDate === row.date;
          return (
            <article className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]" key={row.date}>
              <button
                aria-expanded={isSelected}
                className="focus-ring pressable flex min-h-16 w-full items-center justify-between gap-3 p-3 text-left"
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
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] border text-sm font-semibold ${
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
    neutral: "bg-[var(--surface)] text-[var(--foreground)]",
    info: "bg-[var(--info-soft)] text-[var(--info-strong)]",
    success: "bg-[var(--success-soft)] text-[var(--success-strong)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning-strong)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger-strong)]"
  };

  return (
    <article className={`border-b border-r border-[var(--line)] px-3 py-2.5 ${colorClass[tone]}`}>
      <p className="text-xs font-semibold uppercase text-current opacity-80">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-current">{value}</p>
    </article>
  );
};
