"use client";

import { useMemo, useState } from "react";
import { Badge, Icon, Input, Select, Widget, WidgetHeader } from "@/components/ui";
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
      `${row.profile.fullName} ${row.profile.nhom} ${row.profile.orgGroup} ${row.profile.subgroup} ${row.profile.username}`.toLowerCase();
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
  const averagePercent =
    filteredRows.length === 0
      ? 0
      : Math.round(
          filteredRows.reduce<number>((total, row) => total + row.percent, 0) /
            filteredRows.length
        );

  return (
    <section className="grid min-w-0 gap-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PersonnelMetric icon="people" label="Worker" tone="info" value={filteredRows.length} />
        <PersonnelMetric icon="check" label="Đã gửi" tone="success" value={submittedCount} />
        <PersonnelMetric icon="bell" label="Còn thiếu" tone="danger" value={missingCount} />
        <PersonnelMetric icon="chart" label="Tiến độ TB" suffix="%" tone="warning" value={averagePercent} />
      </section>

      <Widget className="p-4 lg:p-5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <WidgetHeader
            className="mb-0"
            subtitle={`${filteredRows.length}/${rows.length} worker · ${getDateLabel(dateFilter)}`}
            title="Theo dõi báo cáo worker"
          />
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:w-[420px] lg:max-w-[42vw]">
            <label>
              <span className="sr-only">Tìm worker</span>
              <Input
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tên, nhóm, username..."
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
      </Widget>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)]">
        <Widget className="min-w-0 p-4 lg:p-5">
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
                {filteredRows.map((row) => (
                  <WorkerTableRow
                    active={selectedRow?.profile.id === row.profile.id}
                    key={row.profile.id}
                    onSelect={() => setSelectedWorkerId(row.profile.id)}
                    row={row}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Widget>

        <WorkerDetailPanel row={selectedRow} />
      </div>
    </section>
  );
};

const PersonnelMetric = ({
  icon,
  label,
  suffix = "",
  tone,
  value
}: {
  readonly icon: "bell" | "chart" | "check" | "people";
  readonly label: string;
  readonly suffix?: string;
  readonly tone: "danger" | "info" | "success" | "warning";
  readonly value: number;
}): React.ReactElement => (
  <div className={`metric-card rounded-[var(--radius-card)] p-4 ${toneText(tone)}`}>
    <Icon name={icon} />
    <p className="mt-3 text-[11px] font-semibold uppercase text-[var(--text-soft)]">{label}</p>
    <p className="mt-2 text-3xl font-semibold tabular-nums">
      {value}
      {suffix}
    </p>
  </div>
);

const DateButton = ({
  active,
  label,
  onClick
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onClick: () => void;
}): React.ReactElement => (
  <button
    className={`focus-ring pressable min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${
      active
        ? "border-[var(--primary-strong)] bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-md"
        : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
    }`}
    onClick={onClick}
    type="button"
  >
    {label}
  </button>
);

const WorkerTableRow = ({
  active,
  onSelect,
  row
}: {
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly row: WorkerRow;
}): React.ReactElement => (
  <tr
    className={`cursor-pointer border-b border-[var(--border)] ${active ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--line-soft)]"}`}
    onClick={onSelect}
  >
    <td className="py-3 pr-4">
      <p className="font-semibold">{row.profile.fullName}</p>
      <p className="text-xs text-[var(--text-muted)]">@{row.profile.username}</p>
    </td>
    <td className="py-3 pr-4">{row.profile.nhom || row.profile.subgroup || "N/A"}</td>
    <td className="py-3 pr-4 tabular-nums">{row.assigned}</td>
    <td className="py-3 pr-4 tabular-nums">{row.updatedTasks}</td>
    <td className="py-3 pr-4 tabular-nums">{row.done}</td>
    <td className="py-3 pr-4 tabular-nums">{row.cancelled}</td>
    <td className="py-3 pr-4">
      <ProgressInline percent={row.percent} />
    </td>
    <td className="py-3 pr-4">
      <Badge tone={getSubmissionTone(row)}>
        {row.submitted ? "Đã gửi" : "Còn thiếu"}
      </Badge>
    </td>
  </tr>
);

const WorkerCard = ({
  active,
  onSelect,
  row
}: {
  readonly active: boolean;
  readonly onSelect: () => void;
  readonly row: WorkerRow;
}): React.ReactElement => (
  <button
    className={`focus-ring pressable rounded-[var(--radius-card)] border p-4 text-left shadow-[var(--shadow-soft-sm)] ${
      active
        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
        : "border-[var(--line)] bg-[var(--surface)]"
    }`}
    onClick={onSelect}
    type="button"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">{row.profile.fullName}</p>
        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">@{row.profile.username}</p>
      </div>
      <Badge tone={getSubmissionTone(row)}>{row.submitted ? "Đã gửi" : "Còn thiếu"}</Badge>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
      <InfoMini label="WO" value={row.assigned} />
      <InfoMini label="Xong" value={row.done} />
      <InfoMini label="Cập nhật" value={row.updatedTasks} />
    </div>
    <div className="mt-3">
      <ProgressInline percent={row.percent} />
    </div>
  </button>
);

const WorkerDetailPanel = ({ row }: { readonly row: WorkerRow | null }): React.ReactElement => {
  if (!row) {
    return (
      <Widget className="p-5">
        <WidgetHeader
          subtitle="Chọn một worker để xem lịch gửi báo cáo và danh sách hạng mục."
          title="Chi tiết worker"
        />
      </Widget>
    );
  }

  return (
    <Widget className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xl font-semibold">{row.profile.fullName}</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            @{row.profile.username} · {row.profile.nhom || row.profile.subgroup || "N/A"}
          </p>
        </div>
        <Badge tone={getSubmissionTone(row)}>{row.submitted ? "Đã gửi" : "Còn thiếu"}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <InfoTile label="Hạng mục" value={row.assigned} />
        <InfoTile label="Hoàn thành" value={row.done} />
        <InfoTile label="Cancel" value={row.cancelled} />
      </div>

      <div className="mt-5">
        <WidgetHeader
          className="mb-2"
          subtitle={`${row.submittedDays}/${row.totalDays} ngày có cập nhật`}
          title="Lịch gửi báo cáo"
        />
        <div className="grid gap-2">
          {row.dayStatuses.map((day) => (
            <div
              className="grid grid-cols-[110px_minmax(0,1fr)_70px] items-center gap-3 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 ring-1 ring-[var(--border)]"
              key={day.date}
            >
              <p className="text-xs font-semibold text-[var(--text-muted)]">{formatViDate(day.date)}</p>
              <ProgressInline percent={day.percent} />
              <Badge tone={day.submitted ? "success" : "danger"}>
                {day.submitted ? day.updatedTasks : "Thiếu"}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <WidgetHeader
          className="mb-2"
          subtitle="Sắp xếp theo tiến độ cao đến thấp"
          title="Hạng mục được giao"
        />
        <div className="grid max-h-[420px] gap-2 overflow-auto pr-1">
          {row.taskStatuses.slice(0, 18).map((item) => (
            <div
              className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 ring-1 ring-[var(--border)]"
              key={item.task.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold">{item.task.tagname}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
                    {item.task.taskName || "N/A"}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{item.percent}%</span>
              </div>
              <div className="mt-2">
                <ProgressInline percent={item.percent} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Widget>
  );
};

const ProgressInline = ({ percent }: { readonly percent: number }): React.ReactElement => {
  const tone =
    percent === 100 ? "success" : percent > 0 ? "warning" : "info";
  return (
    <div className="flex items-center gap-2">
      <div className="progress-track min-w-0 flex-1">
        <div
          className={`progress-fill progress-stripe-${tone}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs font-semibold tabular-nums">{percent}%</span>
    </div>
  );
};

const InfoMini = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: number;
}): React.ReactElement => (
  <span className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] px-2 py-1 ring-1 ring-[var(--border)]">
    {label}: {value}
  </span>
);

const InfoTile = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: number;
}): React.ReactElement => (
  <div className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 ring-1 ring-[var(--border)]">
    <p className="text-xs font-semibold uppercase text-[var(--text-soft)]">{label}</p>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
  </div>
);

const toneText = (tone: "danger" | "info" | "success" | "warning"): string => {
  if (tone === "success") return "text-[var(--success)]";
  if (tone === "warning") return "text-[var(--accent-strong)]";
  if (tone === "danger") return "text-[var(--danger)]";
  return "text-[var(--info)]";
};
