"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CompanyBrand } from "@/components/CompanyBrand";
import { ModeSwitch } from "@/components/ModeSwitch";
import { PwaInstallButton } from "@/components/PwaInstallButton";
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

interface WorkerDesktopViewProps {
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

type DesktopTab = "tasks" | "overview" | "history" | "account";

const tabs: readonly { readonly key: DesktopTab; readonly label: string }[] = [
  { key: "tasks", label: "Việc của tôi" },
  { key: "overview", label: "Tổng quan" },
  { key: "history", label: "Lịch sử" },
  { key: "account", label: "Tài khoản" }
];

const filters: readonly { readonly key: WorkerFilter; readonly label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "todo", label: "Chưa làm" },
  { key: "progress", label: "Đang làm" },
  { key: "done", label: "Hoàn thành" },
  { key: "p1", label: "P1 chưa xong" },
  { key: "cancelled", label: "Hủy" }
];

const SEARCH_INPUT_ID = "worker-desktop-task-search";

export const WorkerDesktopView = ({
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
    <main className="hidden min-h-dvh w-full max-w-[100vw] p-2 sm:p-3 lg:block lg:p-5">
      <div className="app-shell grid min-h-[calc(100dvh-2.5rem)] grid-cols-[300px_minmax(0,1fr)] overflow-clip rounded-[2rem]">
      <aside className="border-r border-[var(--line)] bg-white/88 p-5">
        <CompanyBrand variant="sidebar" />
        <p className="mt-5 text-xs font-extrabold uppercase text-[var(--primary-strong)]">
          Workspace · BDTT 2026
        </p>
        <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-normal text-[var(--foreground)]">
          Báo cáo tiến độ
        </h1>
        <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">
          Ngày báo cáo: {formatViDate(DEFAULT_REPORT_DATE)}
        </p>

        <div className="mt-6 rounded-[var(--radius-card)] border border-white/20 bg-[var(--primary-strong)] p-4 text-white shadow-[var(--shadow-floating)]">
          <p className="font-extrabold">{worker.fullName}</p>
          <p className="mt-1 text-sm font-semibold text-white/85">@{account.username}</p>
          <p className="mt-3 text-sm font-bold leading-5 text-white">{worker.orgTitle}</p>
          <p className="mt-2 text-sm font-semibold leading-5 text-white/88">{worker.orgAssignment}</p>
          <p
            className={`mt-3 text-sm font-bold ${
              isOnline ? "text-white" : "text-[var(--warning-soft)]"
            }`}
          >
            {isOnline ? "Trực tuyến" : "Mất mạng - đang lưu tạm"}
          </p>
        </div>

        <div className="mt-5">
          <SummaryPills percents={percents} />
        </div>

        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--line)] bg-white/55 p-2">
          {tabs.map((item) => (
            <button
              className={`focus-ring pressable min-h-12 w-full rounded-full px-4 text-left text-sm font-semibold ${
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

        {tab === "tasks" ? (
          <div className="mt-5 space-y-2">
            <p className="px-2 text-xs font-bold uppercase text-[var(--text-muted)]">
              Bộ lọc hạng mục
            </p>
            {filters.map((item) => (
              <button
                className={`focus-ring pressable min-h-12 w-full rounded-full px-4 text-left text-sm font-semibold ${
                  item.key === filter
                    ? "bg-[var(--primary-strong)] text-white shadow-md ring-1 ring-[var(--primary)]"
                    : "border border-[var(--line)] bg-white/80 text-slate-800 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
                }`}
                key={item.key}
                onClick={() => {
                  setTab("tasks");
                  onFilterChange(item.key);
                }}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}

        <button
          className="focus-ring pressable mt-6 min-h-12 w-full rounded-full border border-[var(--border)] bg-white/70 px-4 text-sm font-extrabold"
          onClick={onLogout}
          type="button"
        >
          Đăng xuất
        </button>
      </aside>

      {tab === "tasks" ? (
        <section className="grid min-h-full grid-cols-[minmax(0,1fr)_440px] gap-5 p-6">
          <div className="min-w-0">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-[var(--primary-strong)]">
                  {filteredTasks.length}/{allTasks.length} hạng mục
                </p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-normal text-[var(--foreground)]">
                  Danh sách công việc
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p
                  aria-live="polite"
                  className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${
                    isOnline
                      ? "bg-[var(--success-soft)] text-[var(--success)]"
                      : "bg-[var(--warning-soft)] text-[var(--warning)]"
                  }`}
                >
                  {isOnline ? "Cập nhật trực tiếp" : "Đang offline"}
                </p>
                {isAdminAccount ? (
                  <ModeSwitch activeMode="workspace" href="/admin" />
                ) : null}
              </div>
            </div>

            <div className="mb-4">
              <WorkerSearchControls
                groupMode={groupMode}
                inputId={SEARCH_INPUT_ID}
                onGroupModeChange={setGroupMode}
                onSearchChange={onSearchChange}
                resultLabel={`${filteredTasks.length}/${allTasks.length} hạng mục, nhấn / để tìm`}
                searchQuery={searchQuery}
                unitChips={unitChips}
              />
            </div>

            <WorkerDesktopTaskList
              onSelectTask={setSelectedTaskId}
              progress={progress}
              selectedTask={selectedTask}
              taskGroups={taskGroups}
            />
          </div>

          <aside className="glass-card sticky top-6 h-[calc(100dvh-3rem)] overflow-auto p-6">
            <WorkerDesktopTaskDetail
              onCancel={onCancel}
              onChange={onChange}
              progress={progress}
              saveStates={saveStates}
              task={selectedTask}
            />
          </aside>
        </section>
      ) : null}

      {tab === "overview" ? (
        <section className="min-h-full p-6">
          <DesktopPageHeader
            action={isAdminAccount ? <ModeSwitch activeMode="workspace" href="/admin" /> : null}
            eyebrow={`${allTasks.length} hạng mục`}
            status={isOnline ? "Cập nhật trực tiếp" : "Đang offline"}
            title="Tổng quan cá nhân"
          />
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <ProgressDonutChart
              completed={completedCount}
              inProgress={inProgressCount}
              notStarted={notStartedCount}
              overallPercent={overallPercent}
              total={activeTasks.length}
            />
            <DailyCompletionChart rows={historyRows} />
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <div className="glass-card rounded-[var(--radius-card)] p-5 xl:col-span-2">
              <h2 className="text-xl font-extrabold">Điểm cần chú ý</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Hạng mục P1 chưa xong: <strong>{p1Open}</strong>. Dữ liệu tính theo ngày báo cáo hiện tại.
              </p>
            </div>
            <div className="glass-card rounded-[var(--radius-card)] p-5">
              <p className="text-xs font-bold uppercase text-[var(--primary-strong)]">
                Báo cáo hôm nay
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums">{overallPercent}%</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Tiến độ trung bình của các hạng mục chưa cancel.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="min-h-full p-6">
          <DesktopPageHeader
            action={isAdminAccount ? <ModeSwitch activeMode="workspace" href="/admin" /> : null}
            eyebrow="7 ngày gần nhất"
            status={`${historyRows.reduce((total, row) => total + row.updates.length, 0)} cập nhật`}
            title="Lịch sử cập nhật"
          />
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {historyRows.map((row) => {
              const isSelected = selectedHistoryDate === row.date;
              return (
                <article className="glass-card overflow-hidden rounded-[var(--radius-card)]" key={row.date}>
                  <button
                    aria-expanded={isSelected}
                    className="focus-ring pressable flex min-h-20 w-full items-center justify-between gap-3 p-5 text-left"
                    onClick={() =>
                      setSelectedHistoryDate((current) =>
                        current === row.date ? null : row.date
                      )
                    }
                    type="button"
                  >
                    <span>
                      <span className="block text-lg font-semibold">
                        {formatViDate(row.date)}
                      </span>
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
          </div>
        </section>
      ) : null}

      {tab === "account" ? (
        <section className="min-h-full p-6">
          <DesktopPageHeader
            action={isAdminAccount ? <ModeSwitch activeMode="workspace" href="/admin" /> : null}
            eyebrow="Hồ sơ cá nhân"
            status={isOnline ? "Trực tuyến" : "Mất mạng"}
            title="Tài khoản"
          />
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="glass-card p-6">
              <h2 className="text-xl font-extrabold">{worker.fullName}</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">@{account.username}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{worker.email}</p>
              <div className="mt-4 rounded-[var(--radius-field)] bg-[var(--primary-pale)] p-4 ring-1 ring-[var(--line)]">
                <p className="text-sm font-bold text-[var(--primary-strong)]">{worker.orgTitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{worker.orgAssignment}</p>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <InfoTile label="Mã NV" value={worker.employeeCode} />
                <InfoTile label="Nhóm" value={worker.nhom || "Chưa phân nhóm"} />
              </div>
              <PwaInstallButton className="mt-5" showHint variant="panel" />
            </div>
            <div className="glass-card p-6">
              <h2 className="text-xl font-extrabold">Trạng thái phiên làm việc</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Tài khoản này đang dùng workspace worker để cập nhật tiến độ, ghi chú và ảnh theo từng hạng mục.
              </p>
              <button
                className="focus-ring pressable mt-5 min-h-12 rounded-full border border-[var(--border)] bg-white/80 px-5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                onClick={onLogout}
                type="button"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </section>
      ) : null}
      </div>
    </main>
  );
};

const DesktopPageHeader = ({
  action,
  eyebrow,
  status,
  title
}: {
  readonly action?: ReactNode;
  readonly eyebrow: string;
  readonly status: string;
  readonly title: string;
}): React.ReactElement => {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase text-[var(--primary-strong)]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-normal text-[var(--foreground)]">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="rounded-full bg-[var(--success-soft)] px-4 py-2 text-sm font-semibold text-[var(--success)] shadow-sm">
          {status}
        </p>
        {action}
      </div>
    </div>
  );
};

const InfoTile = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="rounded-[var(--radius-card)] bg-white/80 p-4 ring-1 ring-[var(--border)]">
      <p className="text-xs font-bold uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
};
