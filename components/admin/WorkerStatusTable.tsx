"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { DEFAULT_REPORT_DATE } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import type { AppData, Profile } from "@/types/domain";

interface WorkerRow {
  readonly profile: Profile;
  readonly assigned: number;
  readonly done: number;
  readonly cancelled: number;
  readonly percent: number;
  readonly submitted: boolean;
}

type SubmittedFilter = "all" | "submitted" | "missing";

const inputControlClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-[var(--border-strong)] bg-white px-4 text-base font-semibold text-slate-800 shadow-sm placeholder:text-slate-500";

const selectControlClass =
  "focus-ring min-h-11 w-full rounded-2xl border border-[var(--border-strong)] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm";

const buildRows = (data: AppData): WorkerRow[] => {
  return data.profiles
    .filter((profile) => profile.role === "worker")
    .map((profile) => {
      const tasks = data.tasks.filter((task) => task.assignedTo === profile.id);
      const activeTasks = tasks.filter((task) => !task.isCancelled);
      const cancelled = tasks.length - activeTasks.length;
      const done = activeTasks.filter(
        (task) => getTaskPercent(data.progress, task.id, DEFAULT_REPORT_DATE) === 100
      ).length;
      const submitted = data.progress.some(
        (record) =>
          record.userId === profile.id && record.reportDate === DEFAULT_REPORT_DATE
      );
      return {
        profile,
        assigned: activeTasks.length,
        done,
        cancelled,
        percent:
          activeTasks.length === 0 ? 0 : Math.round((done / activeTasks.length) * 100),
        submitted
      };
    });
};

export const WorkerStatusTable = ({
  data
}: {
  readonly data: AppData;
}): React.ReactElement => {
  const [query, setQuery] = useState<string>("");
  const [status, setStatus] = useState<SubmittedFilter>("all");
  const rows = useMemo(() => buildRows(data), [data]);
  const filteredRows = rows.filter((row) => {
    const text = `${row.profile.fullName} ${row.profile.nhom} ${row.profile.username}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesStatus =
      status === "all" ||
      (status === "submitted" && row.submitted) ||
      (status === "missing" && !row.submitted);
    return matchesQuery && matchesStatus;
  });

  return (
    <section className="soft-card rounded-3xl p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Trạng thái worker hôm nay</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {filteredRows.length}/{rows.length} worker phù hợp.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
          <label>
            <span className="sr-only">Tìm worker</span>
            <input
              className={inputControlClass}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên, nhóm..."
              value={query}
            />
          </label>
          <label>
            <span className="sr-only">Lọc trạng thái gửi</span>
            <select
              className={selectControlClass}
              onChange={(event) => setStatus(event.target.value as SubmittedFilter)}
              value={status}
            >
              <option value="all">Tất cả</option>
              <option value="submitted">Đã gửi</option>
              <option value="missing">Chưa gửi</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:hidden">
        {filteredRows.map((row) => (
          <WorkerCard key={row.profile.id} row={row} />
        ))}
      </div>

      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 border-b border-[var(--border-strong)] bg-white/95 font-bold text-slate-800 backdrop-blur">
            <tr>
              <th className="py-3 pr-4">Tên</th>
              <th className="py-3 pr-4">Nhóm</th>
              <th className="py-3 pr-4">Hạng mục</th>
              <th className="py-3 pr-4">Xong</th>
              <th className="py-3 pr-4">Cancel</th>
              <th className="py-3 pr-4">Tiến độ</th>
              <th className="py-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr className="border-b border-[var(--border)] hover:bg-white/50" key={row.profile.id}>
                <td className="py-3 pr-4 font-medium">{row.profile.fullName}</td>
                <td className="py-3 pr-4">{row.profile.nhom}</td>
                <td className="py-3 pr-4">{row.assigned}</td>
                <td className="py-3 pr-4">{row.done}</td>
                <td className="py-3 pr-4">{row.cancelled}</td>
                <td className="py-3 pr-4">{row.percent}%</td>
                <td className="py-3 pr-4">
                  <StatusBadge
                    label={row.submitted ? "Đã gửi" : "Chưa gửi"}
                    tone={row.submitted ? "success" : "danger"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const WorkerCard = ({ row }: { readonly row: WorkerRow }): React.ReactElement => {
  return (
    <article className="soft-card rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{row.profile.fullName}</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{row.profile.nhom}</p>
        </div>
        <StatusBadge
          label={row.submitted ? "Đã gửi" : "Chưa gửi"}
          tone={row.submitted ? "success" : "danger"}
        />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
        <Metric label="Hạng mục" value={String(row.assigned)} />
        <Metric label="Xong" value={String(row.done)} />
        <Metric label="Cancel" value={String(row.cancelled)} />
        <Metric label="Tiến độ" value={`${row.percent}%`} />
      </div>
    </article>
  );
};

const Metric = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => {
  return (
    <div className="rounded-2xl bg-white p-2 ring-1 ring-[var(--border-strong)]">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
};
