"use client";

import { useMemo, useState } from "react";
import { TaskDesktopWorkspace } from "@/components/admin/tasks/TaskDesktopWorkspace";
import { TaskFilterToolbar } from "@/components/admin/tasks/TaskFilterToolbar";
import { TaskKpiStrip } from "@/components/admin/tasks/TaskKpiStrip";
import { TaskMobileCards } from "@/components/admin/tasks/TaskMobileCards";
import {
  buildTaskKpis,
  buildTaskRows,
  matchesTaskQuery,
  uniqueValues,
  type QuickFilter,
  type StatusFilter,
  type TaskRow
} from "@/components/admin/tasks/taskTableModel";
import type { AppData } from "@/types/domain";

interface TasksTableProps {
  readonly data: AppData;
  readonly limit?: number;
}

const matchesQuickFilter = (row: TaskRow, quickFilter: QuickFilter): boolean => {
  if (quickFilter === "p1Open") {
    return row.task.priority === 1 && !row.task.isCancelled && row.percent < 100;
  }
  if (quickFilter === "cancelled") return row.status === "cancelled";
  if (quickFilter === "notStarted") return row.status === "notStarted";
  if (quickFilter === "inProgress") return row.status === "inProgress";
  return true;
};

export const TasksTable = ({
  data,
  limit = 50
}: TasksTableProps): React.ReactElement => {
  const [query, setQuery] = useState<string>("");
  const [group, setGroup] = useState<string>("all");
  const [unit, setUnit] = useState<string>("all");
  const [section, setSection] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [visibleCount, setVisibleCount] = useState<number>(limit);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const allRows = useMemo(() => buildTaskRows(data), [data]);
  const kpis = useMemo(() => buildTaskKpis(allRows), [allRows]);
  const groups = useMemo(() => uniqueValues(data.tasks, "nhom"), [data.tasks]);
  const units = useMemo(() => uniqueValues(data.tasks, "donVi"), [data.tasks]);
  const sections = useMemo(() => uniqueValues(data.tasks, "section"), [data.tasks]);

  const resetVisibleRows = (): void => setVisibleCount(limit);

  const filteredRows = allRows.filter((row) => {
    const matchesGroup = group === "all" || row.task.nhom === group;
    const matchesUnit = unit === "all" || row.task.donVi === unit;
    const matchesSection = section === "all" || row.task.section === section;
    const matchesPriority = priority === "all" || String(row.task.priority) === priority;
    const matchesStatus = status === "all" || row.status === status;
    return (
      matchesTaskQuery(row.task, query) &&
      matchesGroup &&
      matchesUnit &&
      matchesSection &&
      matchesPriority &&
      matchesStatus &&
      matchesQuickFilter(row, quickFilter)
    );
  });
  const rows = filteredRows.slice(0, visibleCount);

  const updateFilter = <T,>(setter: (value: T) => void, value: T): void => {
    setter(value);
    resetVisibleRows();
    setSelectedTaskId(null);
  };

  return (
    <section className="grid gap-4">
      <TaskKpiStrip kpis={kpis} />

      <TaskFilterToolbar
        group={group}
        groups={groups}
        kpis={kpis}
        onGroupChange={(value) => updateFilter(setGroup, value)}
        onPriorityChange={(value) => updateFilter(setPriority, value)}
        onQueryChange={(value) => updateFilter(setQuery, value)}
        onQuickFilterChange={(value) => updateFilter(setQuickFilter, value)}
        onSectionChange={(value) => updateFilter(setSection, value)}
        onStatusChange={(value) => updateFilter(setStatus, value)}
        onUnitChange={(value) => updateFilter(setUnit, value)}
        priority={priority}
        query={query}
        quickFilter={quickFilter}
        section={section}
        sections={sections}
        status={status}
        unit={unit}
        units={units}
      />

      <section className="glass-card rounded-[var(--radius-card)] p-4 lg:p-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Danh sách hạng mục</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Hiển thị {rows.length}/{filteredRows.length} dòng phù hợp.
            </p>
          </div>
          <p className="rounded-full bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] ring-1 ring-[var(--border-strong)]">
            Tổng dữ liệu: {allRows.length} hạng mục
          </p>
        </div>

        <div className="mt-4">
          <TaskDesktopWorkspace
            onSelectTask={setSelectedTaskId}
            rows={rows}
            selectedTaskId={selectedTaskId}
          />
          <TaskMobileCards rows={rows} />
        </div>

        {visibleCount < filteredRows.length ? (
          <button
            className="focus-ring pressable mt-4 min-h-12 w-full rounded-[var(--radius-field)] border border-[var(--primary)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--primary-strong)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--primary-soft)]"
            onClick={() => setVisibleCount((current) => current + limit)}
            type="button"
          >
            Hiển thị thêm {Math.min(limit, filteredRows.length - visibleCount)} dòng
          </button>
        ) : null}
      </section>
    </section>
  );
};
