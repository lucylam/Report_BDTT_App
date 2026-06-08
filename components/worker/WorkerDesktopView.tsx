"use client";

import { useEffect, useMemo, useState } from "react";
import { SummaryPills } from "@/components/worker/SummaryPills";
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
import { DEFAULT_REPORT_DATE, formatViDate } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
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

const filters: readonly { readonly key: WorkerFilter; readonly label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "todo", label: "Chưa làm" },
  { key: "progress", label: "Đang làm" },
  { key: "done", label: "Hoàn thành" },
  { key: "p1", label: "P1 chưa xong" },
  { key: "cancelled", label: "Cancel" }
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
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    filteredTasks[0]?.id ?? null
  );
  const [groupMode, setGroupMode] = useState<WorkerGroupMode>("unit");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || isTyping) {
        return;
      }
      event.preventDefault();
      document.getElementById(SEARCH_INPUT_ID)?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const activeTasks = allTasks.filter((task) => !task.isCancelled);
  const percents = activeTasks.map((task) =>
    getTaskPercent(progress, task.id, DEFAULT_REPORT_DATE)
  );
  const taskGroups = groupWorkerTasks(filteredTasks, groupMode);
  const unitChips = getTaskUnitChips(allTasks, 8);
  const selectedTask = useMemo(() => {
    return (
      filteredTasks.find((task) => task.id === selectedTaskId) ??
      filteredTasks[0] ??
      null
    );
  }, [filteredTasks, selectedTaskId]);

  return (
    <main className="hidden min-h-dvh bg-transparent lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="m-4 mr-0 rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[var(--shadow-soft-md)] backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
          Worker workspace
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight">Báo cáo tiến độ</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {formatViDate(DEFAULT_REPORT_DATE)}
        </p>

        <div className="mt-6 rounded-3xl border border-[var(--border)] bg-white/75 p-4 shadow-sm">
          <p className="font-semibold">{worker.fullName}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">@{account.username}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{worker.nhom}</p>
          <p
            className={`mt-3 text-sm font-semibold ${
              isOnline ? "text-[var(--success)]" : "text-[var(--warning)]"
            }`}
          >
            {isOnline ? "Online" : "Offline - lưu tạm"}
          </p>
        </div>

        <div className="mt-5">
          <SummaryPills percents={percents} />
        </div>

        <div className="mt-5 space-y-2">
          {filters.map((item) => (
            <button
              className={`focus-ring pressable min-h-11 w-full rounded-2xl px-3 text-left text-sm font-semibold ${
                item.key === filter
                  ? "bg-[var(--primary-strong)] text-white shadow-md ring-1 ring-[var(--primary)]"
                  : "border border-[var(--border)] bg-white/80 text-slate-800 hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
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
          className="focus-ring pressable mt-6 min-h-11 w-full rounded-2xl border border-[var(--border)] bg-white/70 px-4 text-sm font-semibold"
          onClick={onLogout}
          type="button"
        >
          Đăng xuất
        </button>
      </aside>

      <section className="grid min-h-dvh grid-cols-[minmax(0,1fr)_440px] gap-5 p-6">
        <div className="min-w-0">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                {filteredTasks.length}/{allTasks.length} hạng mục
              </p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                Danh sách công việc
              </h2>
            </div>
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

        <aside className="sticky top-6 h-[calc(100dvh-3rem)] overflow-auto rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-[var(--shadow-soft-md)] backdrop-blur-xl">
          <WorkerDesktopTaskDetail
            onCancel={onCancel}
            onChange={onChange}
            progress={progress}
            saveStates={saveStates}
            task={selectedTask}
          />
        </aside>
      </section>
    </main>
  );
};
