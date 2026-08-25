import { useState } from "react";
import type {
  QuickFilter,
  StatusFilter,
  TaskKpis
} from "@/components/admin/tasks/taskTableModel";
import { Icon, Input, Select, Widget, WidgetHeader } from "@/components/ui";

interface TaskFilterToolbarProps {
  readonly query: string;
  readonly group: string;
  readonly unit: string;
  readonly section: string;
  readonly priority: string;
  readonly status: StatusFilter;
  readonly quickFilter: QuickFilter;
  readonly groups: readonly string[];
  readonly units: readonly string[];
  readonly sections: readonly string[];
  readonly kpis: TaskKpis;
  readonly resultLabel: string;
  readonly onQueryChange: (value: string) => void;
  readonly onGroupChange: (value: string) => void;
  readonly onUnitChange: (value: string) => void;
  readonly onSectionChange: (value: string) => void;
  readonly onPriorityChange: (value: string) => void;
  readonly onStatusChange: (value: StatusFilter) => void;
  readonly onQuickFilterChange: (value: QuickFilter) => void;
  readonly onReset: () => void;
}

const statusLabels: Record<Exclude<StatusFilter, "all">, string> = {
  completed: "Hoàn thành",
  inProgress: "Đang thực hiện",
  notStarted: "Chưa thực hiện",
  cancelled: "Cancel"
};

const quickFilterLabels: Record<Exclude<QuickFilter, "all">, string> = {
  p1Open: "P1 chưa xong",
  cancelled: "Cancel",
  notStarted: "Chưa thực hiện",
  inProgress: "Đang thực hiện"
};

export const TaskFilterToolbar = ({
  query,
  group,
  unit,
  section,
  priority,
  status,
  quickFilter,
  groups,
  units,
  sections,
  kpis,
  resultLabel,
  onQueryChange,
  onGroupChange,
  onUnitChange,
  onSectionChange,
  onPriorityChange,
  onStatusChange,
  onQuickFilterChange,
  onReset
}: TaskFilterToolbarProps): React.ReactElement => {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const activeFilters = [
    group !== "all"
      ? { label: `Nhóm: ${group}`, clear: () => onGroupChange("all") }
      : null,
    unit !== "all"
      ? { label: `Đơn vị: ${unit}`, clear: () => onUnitChange("all") }
      : null,
    section !== "all"
      ? { label: `Section: ${section}`, clear: () => onSectionChange("all") }
      : null,
    priority !== "all"
      ? { label: `Priority: P${priority}`, clear: () => onPriorityChange("all") }
      : null,
    status !== "all"
      ? { label: `Trạng thái: ${statusLabels[status]}`, clear: () => onStatusChange("all") }
      : null,
    quickFilter !== "all"
      ? {
          label: `Lọc nhanh: ${quickFilterLabels[quickFilter]}`,
          clear: () => onQuickFilterChange("all")
        }
      : null
  ].filter((item): item is { label: string; clear: () => void } => item !== null);
  const hasCustomFilter = query.trim().length > 0 || activeFilters.length > 0;

  return (
    <Widget className="p-3 lg:p-4">
      <WidgetHeader
        icon="search"
        subtitle="Tìm theo tag, WO, hạng mục hoặc mở bộ lọc"
        title="Bộ lọc WorkOrder"
      />

      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="min-w-0" htmlFor="admin-task-search">
          <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
            Tìm kiếm
          </span>
          <Input
            autoComplete="off"
            id="admin-task-search"
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Tag, WO, hạng mục, resource, section..."
            type="search"
            value={query}
          />
        </label>

        <div className="flex min-w-0 flex-wrap gap-2">
          <button
            aria-controls="admin-task-filters"
            aria-expanded={filtersExpanded}
            className="focus-ring pressable inline-flex min-h-11 min-w-36 flex-1 items-center justify-center gap-2 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)] sm:flex-none"
            onClick={() => setFiltersExpanded((current) => !current)}
            type="button"
          >
            <Icon className="h-4 w-4" name="filter" />
            <span>Bộ lọc</span>
            {activeFilters.length > 0 ? (
              <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[var(--primary-soft)] px-1.5 text-xs font-bold text-[var(--primary-strong)]">
                {activeFilters.length}
              </span>
            ) : null}
            <Icon
              className={`h-4 w-4 transition-transform duration-200 ${filtersExpanded ? "rotate-180" : ""}`}
              name="chevronDown"
            />
          </button>

          {hasCustomFilter ? (
            <button
              className="focus-ring pressable min-h-11 shrink-0 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface-muted)] px-3 text-sm font-semibold text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
              onClick={onReset}
              type="button"
            >
              Đặt lại
            </button>
          ) : null}
        </div>
      </div>

      {filtersExpanded ? (
        <div
          className="mt-3 rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface-muted)] p-3"
          id="admin-task-filters"
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <FilterSelect label="Nhóm" onChange={onGroupChange} value={group} values={groups} />
            <FilterSelect label="Đơn vị" onChange={onUnitChange} value={unit} values={units} />
            <FilterSelect label="Section" onChange={onSectionChange} value={section} values={sections} />

            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Priority
              </span>
              <Select
                className="min-h-11"
                onChange={(event) => onPriorityChange(event.target.value)}
                value={priority}
              >
                <option value="all">Tất cả mức</option>
                <option value="1">P1</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
              </Select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Trạng thái
              </span>
              <Select
                className="min-h-11"
                onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
                value={status}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="completed">Hoàn thành</option>
                <option value="inProgress">Đang thực hiện</option>
                <option value="notStarted">Chưa thực hiện</option>
                <option value="cancelled">Cancel</option>
              </Select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Lọc nhanh
              </span>
              <Select
                className="min-h-11"
                onChange={(event) => onQuickFilterChange(event.target.value as QuickFilter)}
                value={quickFilter}
              >
                <option value="all">Tất cả · {kpis.total}</option>
                <option value="p1Open">P1 chưa xong · {kpis.p1Open}</option>
                <option value="cancelled">Cancel · {kpis.cancelled}</option>
                <option value="notStarted">Chưa thực hiện · {kpis.notStarted}</option>
                <option value="inProgress">Đang thực hiện · {kpis.inProgress}</option>
              </Select>
            </label>
          </div>
        </div>
      ) : null}

      {activeFilters.length > 0 ? (
        <div aria-label="Bộ lọc đang áp dụng" className="mt-2 flex min-w-0 flex-wrap gap-2">
          {activeFilters.map((item) => (
            <button
              aria-label={`Xóa bộ lọc ${item.label}`}
              className="focus-ring pressable inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-[var(--primary)] bg-[var(--primary-soft)] px-3 text-left text-xs font-semibold text-[var(--primary-strong)]"
              key={item.label}
              onClick={item.clear}
              type="button"
            >
              <span className="min-w-0 break-words">{item.label}</span>
              <Icon className="h-3.5 w-3.5" name="close" />
            </button>
          ))}
        </div>
      ) : null}

      <p aria-live="polite" className="mt-2 text-sm font-medium text-[var(--text-muted)]">
        {resultLabel}
      </p>
    </Widget>
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
}): React.ReactElement => (
  <label className="min-w-0">
    <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{label}</span>
    <Select
      className="min-h-11"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="all">Tất cả {label.toLowerCase()}</option>
      {values.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </Select>
  </label>
);
