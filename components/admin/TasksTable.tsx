"use client";

import { useMemo, useState } from "react";
import { TaskDesktopWorkspace } from "@/components/admin/tasks/TaskDesktopWorkspace";
import { TaskFilterToolbar } from "@/components/admin/tasks/TaskFilterToolbar";
import { TaskKpiStrip } from "@/components/admin/tasks/TaskKpiStrip";
import { TaskMobileCards } from "@/components/admin/tasks/TaskMobileCards";
import { LeaderTaskManager } from "@/components/admin/tasks/LeaderTaskManager";
import {
  buildTaskKpis,
  buildTaskRows,
  matchesTaskQuery,
  uniqueValues,
  type QuickFilter,
  type StatusFilter,
  type TaskRow
} from "@/components/admin/tasks/taskTableModel";
import { Widget, WidgetHeader } from "@/components/ui";
import type { AppData } from "@/types/domain";

interface TasksTableProps {
  readonly data: AppData;
  readonly limit?: number;
  readonly canManage?: boolean;
  readonly onDataChanged?: () => Promise<void>;
  readonly initialQuery?: string;
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
  limit = 50,
  canManage = false,
  onDataChanged = async () => undefined,
  initialQuery = ""
}: TasksTableProps): React.ReactElement => {
  const [query, setQuery] = useState<string>(initialQuery);
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
  const selectedRow =
    rows.find((row) => row.task.id === selectedTaskId) ?? rows[0] ?? null;

  const updateFilter = <T,>(setter: (value: T) => void, value: T): void => {
    setter(value);
    resetVisibleRows();
    setSelectedTaskId(null);
  };

  const selectKpi = (key: keyof typeof kpis): void => {
    setStatus("all");
    setQuickFilter("all");
    if (key === "completed") setStatus("completed");
    if (key === "inProgress") setStatus("inProgress");
    if (key === "notStarted") setStatus("notStarted");
    if (key === "cancelled") setStatus("cancelled");
    if (key === "p1Open") setQuickFilter("p1Open");
    resetVisibleRows();
    setSelectedTaskId(null);
  };

  return (
    <section className="grid gap-2 lg:gap-4">
      <TaskKpiStrip kpis={kpis} onSelect={selectKpi} />

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

      <Widget className="p-2 lg:p-5">
        <div className="flex items-center justify-between gap-2">
          <WidgetHeader
            className="mb-0 hidden lg:flex"
            icon="list"
            subtitle={`Hiển thị ${rows.length}/${filteredRows.length} dòng phù hợp`}
            title="Danh sách hạng mục"
          />
          <div className="flex min-w-0 flex-1 items-center justify-between gap-2 lg:flex-initial lg:justify-end">
            <p className="shrink-0 rounded-full bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border-strong)] lg:px-3 lg:py-2 lg:text-sm">
              <span className="lg:hidden">{rows.length}/{filteredRows.length}</span>
              <span className="hidden lg:inline">Tổng dữ liệu: {allRows.length} hạng mục</span>
            </p>
            {canManage ? (
              <LeaderTaskManager
                data={data}
                onChanged={onDataChanged}
                row={selectedRow}
                showCreate
              />
            ) : null}
          </div>
        </div>

        <div className="mt-2 lg:mt-4">
          <TaskDesktopWorkspace
            canManage={canManage}
            data={data}
            onDataChanged={onDataChanged}
            onSelectTask={setSelectedTaskId}
            rows={rows}
            selectedTaskId={selectedTaskId}
          />
          <TaskMobileCards
            canManage={canManage}
            data={data}
            onDataChanged={onDataChanged}
            rows={rows}
          />
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
      </Widget>
    </section>
  );
};
