"use client";

import { useState } from "react";
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
import { getTaskPercent } from "@/lib/progress";
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
  const [tab, setTab] = useState<MobileTab>("tasks");
  const [groupMode, setGroupMode] = useState<WorkerGroupMode>("unit");
  const activeTasks = allTasks.filter((task) => !task.isCancelled);
  const percents = activeTasks.map((task) =>
    getTaskPercent(progress, task.id, DEFAULT_REPORT_DATE)
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

  return (
    <main className="min-h-dvh overflow-x-hidden bg-transparent pb-28 lg:hidden">
      <header className="sticky top-0 z-20 bg-white/70 px-4 pb-4 pt-5 backdrop-blur-xl">
        <p className="text-sm font-semibold text-[var(--text-muted)]">
          {formatViDate(DEFAULT_REPORT_DATE)}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-[var(--foreground)]">
              Báo cáo tiến độ
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {worker.nhom || "Chưa có nhóm"}
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
          <section className="px-4 py-4">
            <SummaryPills percents={percents} />
          </section>

          <section className="px-4 pb-3">
            <div className="grid grid-cols-4 gap-1 rounded-2xl border border-[var(--border-strong)] bg-white/85 p-1.5 shadow-[var(--shadow-soft-sm)]">
              {filters.map((item) => (
                <button
                  className={`focus-ring pressable min-h-11 rounded-xl px-1 text-xs font-semibold leading-tight sm:px-2 sm:text-sm ${
                    item.key === filter
                      ? "bg-[var(--primary-strong)] text-white shadow-md ring-1 ring-[var(--primary)]"
                      : "bg-white/75 text-slate-800 ring-1 ring-transparent hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
                  }`}
                  key={item.key}
                  onClick={() => onFilterChange(item.key)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              className={`focus-ring pressable mt-3 min-h-10 rounded-full border px-4 text-sm font-semibold ${
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
              className={`focus-ring pressable ml-2 mt-3 min-h-10 rounded-full border px-4 text-sm font-semibold ${
                filter === "cancelled"
                  ? "border-[var(--danger)] bg-[var(--danger)] text-white shadow-md"
                  : "border-[var(--border-strong)] bg-white/90 text-slate-800 shadow-sm hover:border-[var(--danger)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
              }`}
              onClick={() => onFilterChange(filter === "cancelled" ? "all" : "cancelled")}
              type="button"
            >
              Cancel: {cancelledCount}
            </button>
          </section>

          <section className="px-4 pb-2">
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

          <section className="space-y-4 px-4 py-4">
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
        <section className="space-y-4 px-4 py-5">
          <SummaryPills percents={percents} />
          <div className="soft-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold">Tổng quan cá nhân</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Hạng mục P1 chưa xong: <strong>{p1Open}</strong>. Dữ liệu tính theo ngày báo cáo hiện tại.
            </p>
          </div>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="space-y-3 px-4 py-5">
          {REPORT_DATES.slice(-7).reverse().map((date) => {
            const count = allTasks.filter(
              (task) => getTaskPercent(progress, task.id, date) > 0
            ).length;
            return (
              <div className="soft-card rounded-3xl p-5" key={date}>
                <p className="font-semibold">{formatViDate(date)}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {count} hạng mục có cập nhật
                </p>
              </div>
            );
          })}
        </section>
      ) : null}

      {tab === "account" ? (
        <section className="px-4 py-5">
          <div className="soft-card rounded-3xl p-5">
            <h2 className="text-lg font-semibold">{worker.fullName}</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">@{account.username}</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{worker.email}</p>
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

      <nav className="fixed inset-x-0 bottom-0 z-30 px-5 pb-[max(0.8rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1 rounded-3xl border border-[var(--border-strong)] bg-white/90 p-2 text-center text-xs font-semibold shadow-[var(--shadow-floating)] backdrop-blur-xl">
          {tabs.map((item) => (
            <button
              className={`focus-ring pressable min-h-12 rounded-2xl px-1 ${
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
