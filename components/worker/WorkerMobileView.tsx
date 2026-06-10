"use client";

import { useState } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { ModeSwitch } from "@/components/ModeSwitch";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { CountdownBanner } from "@/components/worker/CountdownBanner";
import { SummaryPills } from "@/components/worker/SummaryPills";
import { WorkerGroupedTaskList } from "@/components/worker/WorkerGroupedTaskList";
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
  readonly filter: WorkerFilter;
  readonly searchQuery: string;
  readonly isOnline: boolean;
  readonly saveStates: Readonly<Record<string, SaveState>>;
  readonly onFilterChange: (filter: WorkerFilter) => void;
  readonly onSearchChange: (query: string) => void;
  readonly onChange: (taskId: string, update: WorkerProgressUpdate) => void;
  readonly onCancel: (taskId: string) => void;
  readonly onLogout: () => void;
}

type MobileTab = "tasks" | "overview" | "history" | "account";

export type HistoryTaskUpdate = {
  readonly task: Task;
  readonly record: ProgressRecord;
};

export type HistoryRow = {
  readonly date: string;
  readonly completed: number;
  readonly updates: readonly HistoryTaskUpdate[];
};

const tabs: readonly { readonly key: MobileTab; readonly label: string }[] = [
  { key: "tasks", label: "Việc của tôi" },
  { key: "overview", label: "Tổng quan" },
  { key: "history", label: "Lịch sử" },
  { key: "account", label: "Tài khoản" }
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
  filter,
  searchQuery,
  isOnline,
  saveStates,
  onFilterChange,
  onSearchChange,
  onChange,
  onCancel,
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
    <main className="mobile-app-page bg-transparent lg:hidden">
      <header className="mobile-topbar sticky top-0 z-20 border-b border-white/70 bg-white/88 px-4 pb-3 backdrop-blur-xl">
        <CompanyBrand className="mb-2" variant="compact" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          {formatViDate(DEFAULT_REPORT_DATE)}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight text-[var(--foreground)]">
              Việc của tôi
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {worker.orgTitle}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-[var(--primary-strong)]">
              {worker.orgAssignment}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold leading-tight">{worker.fullName}</p>
            <p className="text-xs text-[var(--text-muted)]">@{account.username}</p>
            <p
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                isOnline
                  ? "bg-[var(--success-soft)] text-[var(--success)]"
                  : "bg-[var(--warning-soft)] text-[var(--warning)]"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        {isAdminAccount ? (
          <ModeSwitch
            activeMode="workspace"
            className="mt-3 max-w-none text-xs"
            href="/admin"
          />
        ) : null}
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

          <section className="sticky top-[calc(var(--mobile-topbar-height)+var(--safe-top))] z-10 space-y-2 border-b border-white/70 bg-[var(--background)]/92 px-4 py-2 backdrop-blur-xl">
            <SummaryPills percents={percents} />
            <div className="control-pill grid grid-cols-4 gap-1 rounded-full p-1.5">
              {filters.map((item) => (
                <button
                  className={`focus-ring pressable min-h-11 rounded-full px-1 text-xs font-semibold leading-tight sm:px-2 sm:text-sm ${
                    item.key === filter
                      ? "bg-[var(--primary-strong)] text-white shadow-md ring-1 ring-[var(--primary)]"
                      : "text-slate-800 ring-1 ring-transparent hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
                  }`}
                  key={item.key}
                  onClick={() => onFilterChange(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`focus-ring pressable min-h-9 rounded-full border px-3 text-sm font-semibold ${
                  filter === "p1"
                    ? "border-[var(--danger)] bg-[var(--danger)] text-white shadow-md"
                    : "border-[var(--border-strong)] bg-white/90 text-slate-800 shadow-sm hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                }`}
                onClick={() => onFilterChange(filter === "p1" ? "all" : "p1")}
                type="button"
              >
                P1 chưa xong: {p1Open}
              </button>
              <button
                className={`focus-ring pressable min-h-9 rounded-full border px-3 text-sm font-semibold ${
                  filter === "cancelled"
                    ? "border-[var(--danger)] bg-[var(--danger)] text-white shadow-md"
                    : "border-[var(--border-strong)] bg-white/90 text-slate-800 shadow-sm hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                }`}
                onClick={() => onFilterChange(filter === "cancelled" ? "all" : "cancelled")}
                type="button"
              >
                Cancel: {cancelledCount}
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

          <section className="space-y-3 px-4 py-3 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1rem)]">
            <WorkerGroupedTaskList
              onCancel={onCancel}
              onChange={onChange}
              progress={progress}
              saveStates={saveStates}
              taskGroups={taskGroups}
            />
          </section>
        </>
      ) : null}

      {tab === "overview" ? (
        <section className="space-y-4 px-4 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1rem)] pt-5">
          <SummaryPills percents={percents} />
          <ProgressDonutChart
            completed={completedCount}
            inProgress={inProgressCount}
            notStarted={notStartedCount}
            overallPercent={overallPercent}
            total={activeTasks.length}
          />
          <DailyCompletionChart rows={historyRows} />
          <div className="soft-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold">Tổng quan cá nhân</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Hạng mục P1 chưa xong: <strong>{p1Open}</strong>. Dữ liệu tính theo ngày báo cáo hiện tại.
            </p>
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-3 px-4 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1rem)] pt-5">
          {historyRows.map((row) => {
            const isSelected = selectedHistoryDate === row.date;
            return (
              <article className="soft-card overflow-hidden rounded-3xl" key={row.date}>
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
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                      isSelected
                        ? "border-[var(--primary)] bg-[var(--primary-strong)] text-white"
                        : "border-[var(--border-strong)] bg-white/86 text-[var(--primary-strong)]"
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

      {tab === "account" ? (
        <section className="px-4 pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-bottom)+1rem)] pt-5">
          <div className="soft-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold">{worker.fullName}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">@{account.username}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{worker.email}</p>
            <div className="mt-4 rounded-3xl bg-[var(--primary-pale)] p-4 ring-1 ring-[var(--border)]">
              <p className="text-sm font-bold text-[var(--primary-strong)]">{worker.orgTitle}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">{worker.orgAssignment}</p>
            </div>
            <PwaInstallButton className="mt-4" compact showHint variant="panel" />
            <button
              className="focus-ring pressable mt-4 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white/75 px-4 text-sm font-semibold shadow-sm"
              onClick={onLogout}
              type="button"
            >
              Đăng xuất
            </button>
          </div>
        </section>
      ) : null}

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 px-3">
        <div className="floating-pill grid grid-cols-4 gap-1 rounded-[2rem] p-2 text-center text-xs font-semibold">
          {tabs.map((item) => (
            <button
              className={`focus-ring pressable min-h-12 rounded-full px-1 ${
                item.key === tab
                  ? "bg-[var(--primary-strong)] text-white shadow-md"
                  : "text-slate-800 hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              key={item.key}
              onClick={() => setTab(item.key)}
              type="button"
            >
              {item.label}
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
    <section className="soft-card rounded-3xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--primary-strong)]">
            Tiến độ tổng
          </p>
          <h2 className="mt-1 text-lg font-semibold">Tỉ lệ hoàn thành</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {total} hạng mục đang theo dõi
          </p>
        </div>
        <svg
          aria-label={`Tiến độ trung bình ${overallPercent}%`}
          className="h-32 w-32 shrink-0"
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
            className="fill-[var(--foreground)] text-2xl font-bold"
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
        <ChartStat label="Đang làm" tone="warning" value={inProgress} />
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
    <section className="soft-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--primary-strong)]">
            Hoàn thành theo ngày
          </p>
          <h2 className="mt-1 text-lg font-semibold">7 ngày gần nhất</h2>
        </div>
        <p className="rounded-full bg-[var(--primary-pale)] px-3 py-1 text-sm font-bold text-[var(--primary-strong)]">
          Max {maxCompleted}
        </p>
      </div>

      <div
        aria-label="Biểu đồ cột số hạng mục hoàn thành theo ngày"
        className="mt-5 flex h-40 items-end gap-2"
        role="img"
      >
        {chartRows.map((row) => {
          const height =
            row.completed === 0 ? 8 : Math.max(16, (row.completed / scaleMax) * 128);
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={row.date}>
              <div className="flex h-32 w-full items-end rounded-full bg-white/70 p-1 ring-1 ring-[var(--border)]">
                <div
                  className="w-full rounded-full bg-[var(--primary-strong)] shadow-sm"
                  style={{ height }}
                />
              </div>
              <span className="text-xs font-bold text-[var(--text-muted)]">
                {row.date.slice(8, 10)}/{row.date.slice(5, 7)}
              </span>
              <span className="text-xs font-bold tabular-nums">{row.completed}</span>
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
        <div className="rounded-[1.5rem] bg-[var(--primary-pale)] p-4 text-sm font-semibold text-[var(--text-muted)]">
          Không có cập nhật trong ngày này.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-[var(--border)] px-4 pb-4 pt-2">
      {updates.map(({ task, record }) => (
        <div
          className="rounded-[1.35rem] border border-[var(--border)] bg-white/78 p-3"
          key={`${record.reportDate}-${task.id}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-base font-semibold">{task.tagname}</p>
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-700">
                {task.taskName}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
                <span className="rounded bg-[var(--danger)] px-2 py-1 text-white">
                  P{task.priority}
                </span>
                <span className="rounded bg-[var(--info)] px-2 py-1 text-white">
                  {task.donVi || "N/A"}
                </span>
                <span className="rounded bg-white px-2 py-1 text-slate-800 ring-1 ring-[var(--border-strong)]">
                  WO {task.wo || "N/A"}
                </span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--primary-strong)] px-3 py-2 text-sm font-bold text-white tabular-nums">
              {record.percent}%
            </span>
          </div>
          {record.note ? (
            <p className="mt-3 rounded-[1rem] bg-[var(--primary-pale)] px-3 py-2 text-sm text-slate-700">
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
  readonly tone: "success" | "warning" | "neutral";
  readonly value: number;
}): React.ReactElement => {
  const toneClass =
    tone === "success"
      ? "bg-[var(--success-soft)] text-[var(--success)]"
      : tone === "warning"
        ? "bg-[var(--warning-soft)] text-[var(--warning)]"
        : "bg-white text-slate-700 ring-1 ring-[var(--border)]";

  return (
    <div className={`rounded-[1.25rem] p-3 text-center ${toneClass}`}>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs font-bold leading-tight">{label}</p>
    </div>
  );
};
