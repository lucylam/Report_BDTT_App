"use client";

import { useState } from "react";
import { LeaderTaskManager } from "@/components/admin/tasks/LeaderTaskManager";
import {
  getProgressLabel,
  getStatusLabel,
  getStatusTone,
  type TaskRow
} from "@/components/admin/tasks/taskTableModel";
import { CompactTaskDisclosure } from "@/components/tasks/CompactTaskDisclosure";
import { Badge } from "@/components/ui";
import type { AppData } from "@/types/domain";

interface TaskMobileCardsProps {
  readonly rows: readonly TaskRow[];
  readonly data: AppData;
  readonly canManage: boolean;
  readonly onDataChanged: () => Promise<void>;
}

export const TaskMobileCards = ({
  rows,
  data,
  canManage,
  onDataChanged
}: TaskMobileCardsProps): React.ReactElement => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  return (
    <section className="grid gap-1.5 lg:hidden">
      {rows.map((row) => {
        const { task, percent, status, progress } = row;
        const expanded = expandedTaskId === task.id;

        return (
          <CompactTaskDisclosure
            expanded={expanded}
            key={task.id}
            onToggle={() => setExpandedTaskId((current) => (current === task.id ? null : task.id))}
            status={getProgressLabel(task, percent)}
            statusTone={task.isCancelled ? "danger" : getStatusTone(status)}
            subtitle={`WO ${task.wo || "N/A"} · ${task.taskName || "N/A"}`}
            title={task.tagname || "N/A"}
          >
            <div className="space-y-3">
              <div>
                <p className="break-words text-sm font-semibold leading-5 text-[var(--foreground)]">
                  {task.taskName || "N/A"}
                </p>
                <p className="mt-1 break-words text-xs font-medium text-[var(--text-muted)]">
                  WO {task.wo || "N/A"} · Sec {task.section || "N/A"} · {task.donVi || "N/A"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge solid tone={task.priority === 1 ? "danger" : task.priority === 2 ? "warning" : "neutral"}>
                    P{task.priority}
                  </Badge>
                  <Chip label={task.nhom || "N/A"} />
                  <Chip label={task.resourceName || "N/A"} />
                  <Badge tone={getStatusTone(status)}>{getStatusLabel(status)}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Info label="Start" value={task.startDate || "N/A"} />
                <Info label="Finish" value={task.finishDate || "N/A"} />
                <Info label="Thời lượng" value={task.duration || "N/A"} />
                <Info label="Tiến độ" value={getProgressLabel(task, percent)} />
              </div>

              {task.isCancelled ? (
                <p className="rounded-[var(--radius-field)] bg-[var(--danger-soft)] p-3 text-sm font-semibold text-[var(--danger)]">
                  {task.cancelReason || "Chưa nhập lý do cancel"}
                </p>
              ) : null}

              {progress?.note ? (
                <p className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 text-sm font-medium leading-6 text-[var(--foreground)] ring-1 ring-[var(--border)]">
                  {progress.note}
                </p>
              ) : null}

              {canManage ? (
                <LeaderTaskManager data={data} onChanged={onDataChanged} row={row} />
              ) : null}
            </div>
          </CompactTaskDisclosure>
        );
      })}
    </section>
  );
};

const Chip = ({ label }: { readonly label: string }): React.ReactElement => (
  <span className="inline-flex min-h-7 max-w-full min-w-0 items-center break-words rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">
    {label}
  </span>
);

const Info = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement => (
  <div className="min-w-0 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-2.5 ring-1 ring-[var(--border)]">
    <p className="text-xs font-semibold text-[var(--text-soft)]">{label}</p>
    <p className="mt-0.5 break-words font-semibold text-[var(--foreground)]">{value}</p>
  </div>
);
