"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import type { AppData, ProgressPercent, Task } from "@/types/domain";

interface TasksTableProps {
  readonly data: AppData;
  readonly limit?: number;
}

type StatusFilter = "all" | "completed" | "inProgress" | "notStarted" | "cancelled";
type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const getStatus = (task: Task, percent: ProgressPercent): StatusFilter => {
  if (task.isCancelled) return "cancelled";
  if (percent === 100) return "completed";
  if (percent > 0) return "inProgress";
  return "notStarted";
};

const getStatusLabel = (status: StatusFilter): string => {
  if (status === "completed") return "Hoàn thành";
  if (status === "inProgress") return "Đang thực hiện";
  if (status === "notStarted") return "Chưa thực hiện";
  if (status === "cancelled") return "Cancel";
  return "Tất cả trạng thái";
};

const getStatusTone = (status: StatusFilter): BadgeTone => {
  if (status === "completed") return "success";
  if (status === "inProgress") return "warning";
  if (status === "cancelled") return "danger";
  return "neutral";
};

const getProgressLabel = (task: Task, percent: ProgressPercent): string => {
  return task.isCancelled ? "NA" : `${percent}%`;
};

const uniqueValues = (tasks: readonly Task[], key: "nhom" | "donVi"): string[] => {
  return Array.from(new Set(tasks.map((task) => task[key]).filter(Boolean))).sort();
};

const inputControlClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-[var(--border-strong)] bg-white px-4 text-base font-semibold text-slate-800 shadow-sm placeholder:text-slate-500";

const selectControlClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-[var(--border-strong)] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm";

export const TasksTable = ({
  data,
  limit = 50
}: TasksTableProps): React.ReactElement => {
  const [query, setQuery] = useState<string>("");
  const [group, setGroup] = useState<string>("all");
  const [unit, setUnit] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [visibleCount, setVisibleCount] = useState<number>(limit);
  const groups = useMemo(() => uniqueValues(data.tasks, "nhom"), [data.tasks]);
  const units = useMemo(() => uniqueValues(data.tasks, "donVi"), [data.tasks]);

  const filteredRows = data.tasks.filter((task) => {
    const percent = getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE);
    const text = `${task.tagname} ${task.taskName} ${task.resourceName}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesGroup = group === "all" || task.nhom === group;
    const matchesUnit = unit === "all" || task.donVi === unit;
    const matchesPriority = priority === "all" || String(task.priority) === priority;
    const matchesStatus = status === "all" || getStatus(task, percent) === status;
    return (
      matchesQuery &&
      matchesGroup &&
      matchesUnit &&
      matchesPriority &&
      matchesStatus
    );
  });
  const rows = filteredRows.slice(0, visibleCount);

  return (
    <section className="soft-card rounded-3xl p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Danh sách hạng mục</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Hiển thị {rows.length}/{filteredRows.length} dòng phù hợp.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-6">
        <label className="lg:col-span-2">
          <span className="sr-only">Tìm hạng mục</span>
          <input
            className={inputControlClass}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(limit);
            }}
            placeholder="Tìm tagname, hạng mục, resource..."
            value={query}
          />
        </label>
        <FilterSelect label="Nhóm" onChange={setGroup} value={group} values={groups} />
        <FilterSelect label="Đơn vị" onChange={setUnit} value={unit} values={units} />
        <label>
          <span className="sr-only">Priority</span>
          <select
            className={selectControlClass}
            onChange={(event) => {
              setPriority(event.target.value);
              setVisibleCount(limit);
            }}
            value={priority}
          >
            <option value="all">Priority</option>
            <option value="1">P1</option>
            <option value="2">P2</option>
            <option value="3">P3</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Trạng thái</span>
          <select
            className={selectControlClass}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter);
              setVisibleCount(limit);
            }}
            value={status}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Hoàn thành</option>
            <option value="inProgress">Đang thực hiện</option>
            <option value="notStarted">Chưa thực hiện</option>
            <option value="cancelled">Cancel</option>
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-3 lg:hidden">
        {rows.map((task) => (
          <TaskCardMobile data={data} key={task.id} task={task} />
        ))}
      </div>

      <div className="mt-4 hidden max-h-[620px] overflow-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-[var(--border-strong)] bg-white/95 font-bold text-slate-800 backdrop-blur">
            <tr>
              <th className="sticky left-0 bg-white py-3 pr-4">Tagname</th>
              <th className="py-3 pr-4">Nhóm</th>
              <th className="py-3 pr-4">Đơn vị</th>
              <th className="py-3 pr-4">P</th>
              <th className="py-3 pr-4">Resource</th>
              <th className="py-3 pr-4">Tiến độ</th>
              <th className="py-3 pr-4">Trạng thái</th>
              <th className="py-3 pr-4">Lý do Cancel</th>
              <th className="py-3 pr-4">Finish</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((task) => {
              const percent = getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE);
              const statusValue = getStatus(task, percent);
              return (
                <tr className="border-b border-[var(--border)] hover:bg-white/50" key={task.id}>
                  <td className="sticky left-0 bg-white/95 py-3 pr-4 font-mono font-semibold backdrop-blur">
                    {task.tagname}
                  </td>
                  <td className="py-3 pr-4">{task.nhom}</td>
                  <td className="py-3 pr-4">{task.donVi}</td>
                  <td className="py-3 pr-4">{task.priority}</td>
                  <td className="py-3 pr-4">{task.resourceName}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge
                      label={getProgressLabel(task, percent)}
                      tone={task.isCancelled ? "danger" : getStatusTone(statusValue)}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge
                      label={getStatusLabel(statusValue)}
                      tone={getStatusTone(statusValue)}
                    />
                  </td>
                  <td className="max-w-xs py-3 pr-4 text-sm text-slate-700">
                    {task.isCancelled ? task.cancelReason || "Chưa nhập lý do" : ""}
                  </td>
                  <td className="py-3 pr-4">{task.finishDate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visibleCount < filteredRows.length ? (
        <button
          className="focus-ring pressable mt-4 min-h-11 w-full rounded-2xl border border-[var(--primary)] bg-white px-4 text-sm font-bold text-[var(--primary-strong)] shadow-sm hover:bg-[var(--primary-soft)]"
          onClick={() => setVisibleCount((current) => current + limit)}
          type="button"
        >
          Hiển thị thêm {Math.min(limit, filteredRows.length - visibleCount)} dòng
        </button>
      ) : null}
    </section>
  );
};

const TaskCardMobile = ({
  data,
  task
}: {
  readonly data: AppData;
  readonly task: Task;
}): React.ReactElement => {
  const percent = getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE);
  const statusValue = getStatus(task, percent);
  return (
    <article className="soft-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-mono font-semibold">{task.tagname}</h3>
          <p className="mt-1 text-sm leading-5 text-slate-700">{task.taskName}</p>
        </div>
        <StatusBadge
          label={getProgressLabel(task, percent)}
          tone={task.isCancelled ? "danger" : getStatusTone(statusValue)}
        />
      </div>
      <div className="mt-3">
        <StatusBadge label={getStatusLabel(statusValue)} tone={getStatusTone(statusValue)} />
      </div>
      {task.isCancelled ? (
        <p className="mt-3 rounded-2xl bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
          Lý do: {task.cancelReason || "Chưa nhập lý do"}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-[var(--danger-soft)] px-2.5 py-1 text-[var(--danger)]">
          P{task.priority}
        </span>
        <span className="rounded-full bg-[var(--info-soft)] px-2.5 py-1 text-[var(--info)]">
          {task.donVi || "N/A"}
        </span>
        <span className="rounded-full bg-white px-2.5 py-1 font-bold text-slate-800 ring-1 ring-[var(--border-strong)]">
          {task.resourceName || "N/A"}
        </span>
      </div>
    </article>
  );
};

const FilterSelect = ({
  label,
  onChange,
  value,
  values
}: {
  readonly label: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
  readonly values: readonly string[];
}): React.ReactElement => {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        className={selectControlClass}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="all">{label}</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
};
