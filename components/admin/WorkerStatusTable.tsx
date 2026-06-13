"use client";

import { useMemo, useState } from "react";
import { Badge, Input, Select } from "@/components/ui";
import { REPORT_DATES, formatViDate } from "@/lib/date";
import { getTaskPercent } from "@/lib/progress";
import type {
  AppData,
  Profile,
  ProgressPercent,
  ProgressRecord,
  Task
} from "@/types/domain";

interface WorkerDayStatus {
  readonly date: string;
  readonly submitted: boolean;
  readonly updatedTasks: number;
  readonly percent: number;
}

interface WorkerTaskStatus {
  readonly task: Task;
  readonly percent: ProgressPercent;
  readonly latestRecord: ProgressRecord | null;
}

interface WorkerRow {
  readonly profile: Profile;
  readonly assigned: number;
  readonly done: number;
  readonly cancelled: number;
  readonly percent: number;
  readonly submitted: boolean;
  readonly submittedDays: number;
  readonly totalDays: number;
  readonly updatedTasks: number;
  readonly dayStatuses: readonly WorkerDayStatus[];
  readonly taskStatuses: readonly WorkerTaskStatus[];
}

type SubmittedFilter = "all" | "submitted" | "missing";
type DateFilter = "all-days" | string;

const getTaskPercentForFilter = (
  progress: readonly ProgressRecord[],
  taskId: string,
  dateFilter: DateFilter
): ProgressPercent => {
  if (dateFilter !== "all-days") {
    return getTaskPercent(progress, taskId, dateFilter);
  }
  return REPORT_DATES.reduce<ProgressPercent>((max, date) => {
    const percent = getTaskPercent(progress, taskId, date);
    return percent > max ? percent : max;
  }, 0);
};

const getLatestTaskRecord = (
  progress: readonly ProgressRecord[],
  taskId: string,
  dateFilter: DateFilter
): ProgressRecord | null => {
  const records = progress
    .filter((record) => {
      if (record.taskId !== taskId) return false;
      return dateFilter === "all-days"
        ? REPORT_DATES.includes(record.reportDate)
        : record.reportDate === dateFilter;
    })
    .sort((left, right) => right.reportDate.localeCompare(left.reportDate));
  return records[0] ?? null;
};

const createDayStatuses = (
  data: AppData,
  profile: Profile,
  activeTasks: readonly Task[]
): WorkerDayStatus[] => {
  return REPORT_DATES.map((date) => {
    const records = data.progress.filter(
      (record) => record.userId === profile.id && record.reportDate === date
    );
    const percentSum = activeTasks.reduce<number>(
      (sum, task) => sum + getTaskPercent(data.progress, task.id, date),
      0
    );
    return {
      date,
      submitted: records.length > 0,
      updatedTasks: new Set(records.map((record) => record.taskId)).size,
      percent:
        activeTasks.length === 0 ? 0 : Math.round(percentSum / activeTasks.length)
    };
  });
};

const buildRows = (data: AppData, dateFilter: DateFilter): WorkerRow[] => {
  return data.profiles
    .filter((profile) => profile.role === "worker")
    .map((profile) => {
      const tasks = data.tasks.filter((task) => task.assignedTo === profile.id);
      const activeTasks = tasks.filter((task) => !task.isCancelled);
      const cancelled = tasks.length - activeTasks.length;
      const dayStatuses = createDayStatuses(data, profile, activeTasks);
      const submittedDays = dayStatuses.filter((day) => day.submitted).length;
      const taskStatuses = activeTasks.map((task) => ({
        task,
        percent: getTaskPercentForFilter(data.progress, task.id, dateFilter),
        latestRecord: getLatestTaskRecord(data.progress, task.id, dateFilter)
      }));
      const done = taskStatuses.filter((item) => item.percent === 100).length;
      const updatedTasks = taskStatuses.filter((item) => item.latestRecord).length;
      const percentSum = taskStatuses.reduce<number>(
        (sum, item) => sum + item.percent,
        0
      );
      const submitted =
        dateFilter === "all-days"
          ? submittedDays === REPORT_DATES.length
          : dayStatuses.some((day) => day.date === dateFilter && day.submitted);

      return {
        profile,
        assigned: activeTasks.length,
        done,
        cancelled,
        percent:
          activeTasks.length === 0 ? 0 : Math.round(percentSum / activeTasks.length),
        submitted,
        submittedDays,
        totalDays: REPORT_DATES.length,
        updatedTasks,
        dayStatuses,
        taskStatuses: taskStatuses.sort((left, right) => {
          if (right.percent !== left.percent) return right.percent - left.percent;
          return left.task.tagname.localeCompare(right.task.tagname);
        })
      };
    });
};

const getDateLabel = (dateFilter: DateFilter): string => {
  return dateFilter === "all-days" ? "Tổng các ngày" : formatViDate(dateFilter);
};

const getSubmissionTone = (row: WorkerRow): "success" | "warning" | "danger" => {
  if (row.submittedDays === row.totalDays) return "success";
  if (row.submittedDays > 0) return "warning";
  return "danger";
};

export const WorkerStatusTable = ({
  data
}: {
  readonly data: AppData;
}): React.ReactElement => {
  const [query, setQuery] = useState<string>("");
  const [status, setStatus] = useState<SubmittedFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all-days");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const rows = useMemo(() => buildRows(data, dateFilter), [data, dateFilter]);
  const filteredRows = rows.filter((row) => {
    const text =
      `${row.profile.fullName} ${row.profile.nhom} ${row.profile.username}`.toLowerCase();
    const matchesQuery = text.includes(query.trim().toLowerCase());
    const matchesStatus =
      status === "all" ||
      (status === "submitted" && row.submitted) ||
      (status === "missing" && !row.submitted);
    return matchesQuery && matchesStatus;
  });
  const selectedRow =
    filteredRows.find((row) => row.profile.id === selectedWorkerId) ??
    filteredRows[0] ??
    null;
  const submittedCount = filteredRows.filter((row) => row.submitted).length;
  const missingCount = filteredRows.length - submittedCount;

  return (
    <section className="grid min-w-0 max-w-full gap-4 overflow-x-hidden">
      <div className="glass-card min-w-0 max-w-full overflow-hidden p-4 lg:p-5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
              Worker report
            </p>
            <h2 className="mt-1 text-xl font-semibold">Theo dõi báo cáo worker</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
              {filteredRows.length}/{rows.length} worker, {submittedCount} đạt điều kiện gửi, {missingCount} còn thiếu trong bộ lọc {getDateLabel(dateFilter)}.
            </p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[420px] lg:max-w-[42vw]">
            <label>
              <span className="sr-only">Tìm worker</span>
              <Input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tên, nhóm..."
                value={query}
              />
            </label>
            <label>
              <span className="sr-only">Lọc trạng thái gửi</span>
              <Select
                className="text-sm"
                onChange={(event) => setStatus(event.target.value as SubmittedFilter)}
                value={status}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="submitted">Đã gửi đủ</option>
                <option value="missing">Còn thiếu</option>
              </Select>
            </label>
          </div>
        </div>

        <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-2">
          <DateButton
            active={dateFilter === "all-days"}
            label="Tổng các ngày"
            onClick={() => setDateFilter("all-days")}
          />
          {REPORT_DATES.map((date) => (
            <DateButton
              active={dateFilter === date}
              key={date}
              label={formatViDate(date)}
              onClick={() => setDateFilter(date)}
            />
          ))}
        </div>
      </div>

      <div className="grid min-w-0 max-w-full items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]">
        <section className="glass-card min-w-0 max-w-full self-start overflow-hidden p-4 lg:p-5">
          <div className="grid gap-3 lg:hidden">
            {filteredRows.map((row) => (
              <WorkerCard
                active={selectedRow?.profile.id === row.profile.id}
                key={row.profile.id}
                onSelect={() => setSelectedWorkerId(row.profile.id)}
                row={row}
              />
            ))}
          </div>

          <div className="hidden max-w-full overflow-x-auto lg:block">
            <table className="min-w-[1040px] text-left text-sm">
              <thead className="sticky top-0 border-b border-[var(--line)] bg-[var(--surface)] font-semibold text-[var(--foreground)]">
                <tr>
                  <th className="py-3 pr-4">Tên</th>
                  <th className="py-3 pr-4">Nhóm</th>
                  <th className="py-3 pr-4">Hạng mục</th>
                  <th className="py-3 pr-4">Có cập nhật</th>
                  <th className="py-3 pr-4">Xong</th>
                  <th className="py-3 pr-4">Cancel</th>
                  <th className="py-3 pr-4">Tiến độ</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => {
                  const active = selectedRow?.profile.id === row.profile.id;
                  return (
                    <tr
                      className={`border-b border-[var(--line)] ${
                        active ? "bg-[var(--primary-pale)]" : "hover:bg-[var(--surface-muted)]"
                      }`}
                      key={row.profile.id}
                    >
                      <td className="py-3 pr-4">
                        <button
                          className="focus-ring text-left font-semibold text-[var(--primary-strong)] hover:underline"
                          onClick={() => setSelectedWorkerId(row.profile.id)}
                          type="button"
                        >
                          {row.profile.fullName}
                        </button>
                        <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                          @{row.profile.username}
                        </p>
                        <p className="mt-1 max-w-56 text-xs font-semibold leading-4 text-[var(--text-muted)]">
                          {row.profile.orgTitle}
                        </p>
                      </td>
                      <td className="py-3 pr-4">{row.profile.nhom}</td>
                      <td className="py-3 pr-4">{row.assigned}</td>
                      <td className="py-3 pr-4">{row.updatedTasks}</td>
                      <td className="py-3 pr-4">{row.done}</td>
                      <td className="py-3 pr-4">{row.cancelled}</td>
                      <td className="py-3 pr-4">{row.percent}%</td>
                      <td className="py-3 pr-4">
                        <Badge
                          solid
                          tone={
                            dateFilter === "all-days"
                              ? getSubmissionTone(row)
                              : row.submitted
                                ? "success"
                                : "danger"
                          }
                        >
                          {getWorkerSubmissionLabel(row, dateFilter)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <WorkerDetailPanel dateFilter={dateFilter} row={selectedRow} />
      </div>
    </section>
  );
};

const getWorkerSubmissionLabel = (row: WorkerRow, dateFilter: DateFilter): string => {
  if (dateFilter === "all-days") return `${row.submittedDays}/${row.totalDays} ngày`;
  return row.submitted ? "Đã gửi" : "Chưa gửi";
};

const DateButton = ({
  active,
  label,
  onClick
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onClick: () => void;
}): React.ReactElement => {
  return (
    <button
      className={`focus-ring pressable min-h-10 shrink-0 rounded-[var(--radius-field)] border px-4 text-sm font-semibold ${
        active
          ? "border-[var(--primary)] bg-[var(--primary-strong)] text-white shadow-md"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-soft-sm)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
};

const WorkerCard = ({
  active,
  onSelect,
  row
}: {
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly row: WorkerRow;
}): React.ReactElement => {
  return (
    <button
      className={`focus-ring metric-card w-full p-4 text-left ${
        active ? "ring-2 ring-[var(--primary)]" : ""
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{row.profile.fullName}</h3>
          <p className="mt-1 text-sm font-semibold text-[var(--primary-strong)]">
            {row.profile.orgTitle}
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
            {row.profile.orgAssignment}
          </p>
        </div>
        <Badge solid tone={getSubmissionTone(row)}>
          {getWorkerSubmissionLabel(row, "all-days")}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <Metric label="Hạng mục" value={String(row.assigned)} />
        <Metric label="Có cập nhật" value={String(row.updatedTasks)} />
        <Metric label="Xong" value={String(row.done)} />
        <Metric label="Tiến độ" value={`${row.percent}%`} />
      </div>
    </button>
  );
};

const WorkerDetailPanel = ({
  dateFilter,
  row
}: {
  readonly dateFilter: DateFilter;
  readonly row: WorkerRow | null;
}): React.ReactElement => {
  if (!row) {
    return (
      <aside className="glass-card min-w-0 max-w-full self-start overflow-hidden p-5">
        <p className="text-sm font-semibold text-[var(--text-muted)]">
          Chọn một worker để xem chi tiết báo cáo.
        </p>
      </aside>
    );
  }

  return (
    <aside className="glass-card min-w-0 max-w-full self-start overflow-hidden p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--primary-strong)]">
            Chi tiết worker
          </p>
          <h2 className="mt-1 text-xl font-semibold">{row.profile.fullName}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            @{row.profile.username} · {row.profile.nhom}
          </p>
          <div className="mt-3 rounded-[var(--radius-field)] bg-[var(--primary-pale)] p-3 ring-1 ring-[var(--line)]">
            <p className="text-sm font-semibold text-[var(--primary-strong)]">
              {row.profile.orgTitle}
            </p>
            <p className="mt-1 text-sm leading-5 text-[var(--text-muted)]">
              {row.profile.orgAssignment}
            </p>
          </div>
        </div>
        <Badge
          solid
          tone={
            dateFilter === "all-days"
              ? getSubmissionTone(row)
              : row.submitted
                ? "success"
                : "danger"
          }
        >
          {getWorkerSubmissionLabel(row, dateFilter)}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <Metric label="Hạng mục" value={String(row.assigned)} />
        <Metric label="Đã xong" value={String(row.done)} />
        <Metric label="Cancel" value={String(row.cancelled)} />
        <Metric label="Tiến độ" value={`${row.percent}%`} />
      </div>

      <section className="mt-5">
        <h3 className="text-sm font-semibold uppercase text-[var(--text-muted)]">
          Tình trạng gửi theo ngày
        </h3>
        <div className="mt-3 grid gap-2">
          {row.dayStatuses.map((day) => (
            <div
              className={`rounded-[var(--radius-field)] border p-3 ${
                dateFilter === day.date
                  ? "border-[var(--primary)] bg-[var(--primary-pale)]"
                  : "border-[var(--line)] bg-[var(--surface-muted)]"
              }`}
              key={day.date}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{formatViDate(day.date)}</p>
                <Badge solid tone={day.submitted ? "success" : "danger"}>
                  {day.submitted ? "Đã gửi" : "Chưa gửi"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {day.updatedTasks} task có cập nhật · tiến độ {day.percent}%
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-sm font-semibold uppercase text-[var(--text-muted)]">
          Danh sách task - {getDateLabel(dateFilter)}
        </h3>
        <div className="mt-3 grid gap-2">
          {row.taskStatuses.length === 0 ? (
            <p className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-4 text-sm font-semibold text-[var(--text-muted)] ring-1 ring-[var(--line)]">
              Worker này chưa có task được phân công.
            </p>
          ) : (
            row.taskStatuses.map(({ latestRecord, percent, task }) => (
              <article
                className="rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-muted)] p-3"
                key={task.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-base font-semibold">{task.tagname}</p>
                    <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--text-muted)]">
                      {task.taskName}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--primary-strong)] px-3 py-1.5 text-sm font-semibold text-white tabular-nums">
                    {percent}%
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge solid tone="danger">P{task.priority}</Badge>
                  <Badge solid tone="info">{task.donVi || "N/A"}</Badge>
                  <Badge solid tone="neutral">{task.section || "N/A"}</Badge>
                </div>
                {latestRecord?.note ? (
                  <p className="mt-3 rounded-[var(--radius-field)] bg-[var(--primary-pale)] px-3 py-2 text-sm text-[var(--text-muted)]">
                    {latestRecord.reportDate}: {latestRecord.note}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </aside>
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
    <div className="flex min-h-14 flex-col items-center justify-center rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-2 text-center text-[var(--foreground)] ring-1 ring-[var(--line)]">
      <p className="text-xs font-semibold text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
};
