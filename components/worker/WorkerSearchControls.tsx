import { useState } from "react";
import { Icon, Select } from "@/components/ui";
import type {
  WorkerGroupMode,
  WorkerPriorityFilter
} from "@/components/worker/taskView";
import type { WorkerFilter } from "@/components/worker/types";
import { formatViDate } from "@/lib/date";

const filterOptions: readonly {
  readonly key: WorkerFilter;
  readonly label: string;
}[] = [
  { key: "today", label: "Cần làm hôm nay" },
  { key: "all", label: "Tất cả trạng thái" },
  { key: "todo", label: "Chưa làm" },
  { key: "progress", label: "Đang làm" },
  { key: "done", label: "Hoàn thành" },
  { key: "p1", label: "P1 chưa xong" },
  { key: "cancelled", label: "Đã hủy" }
];

interface WorkerSearchControlsProps {
  readonly inputId: string;
  readonly searchQuery: string;
  readonly resultLabel: string;
  readonly assigneeOptions: readonly string[];
  readonly unitOptions: readonly string[];
  readonly selectedAssignee: string;
  readonly selectedUnit: string;
  readonly selectedTaskDate: string;
  readonly selectedPriority: WorkerPriorityFilter;
  readonly taskDateOptions: readonly string[];
  readonly filter: WorkerFilter;
  readonly groupMode: WorkerGroupMode;
  readonly onFilterChange: (value: WorkerFilter) => void;
  readonly onAssigneeChange: (value: string) => void;
  readonly onSearchChange: (value: string) => void;
  readonly onTaskDateChange: (value: string) => void;
  readonly onPriorityChange: (value: WorkerPriorityFilter) => void;
  readonly onUnitChange: (value: string) => void;
  readonly onGroupModeChange: (value: WorkerGroupMode) => void;
}

export const WorkerSearchControls = ({
  inputId,
  searchQuery,
  resultLabel,
  assigneeOptions,
  unitOptions,
  selectedAssignee,
  selectedUnit,
  selectedTaskDate,
  selectedPriority,
  taskDateOptions,
  filter,
  groupMode,
  onFilterChange,
  onAssigneeChange,
  onSearchChange,
  onTaskDateChange,
  onPriorityChange,
  onUnitChange,
  onGroupModeChange
}: WorkerSearchControlsProps): React.ReactElement => {
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);
  const activeFilters = [
    selectedTaskDate
      ? { label: `Ngày: ${formatViDate(selectedTaskDate)}`, clear: () => onTaskDateChange("") }
      : null,
    filter !== "today"
      ? {
          label: `Trạng thái: ${filterOptions.find((option) => option.key === filter)?.label ?? filter}`,
          clear: () => onFilterChange("today")
        }
      : null,
    selectedPriority
      ? { label: `Ưu tiên: P${selectedPriority}`, clear: () => onPriorityChange("") }
      : null,
    selectedAssignee
      ? { label: `Người thực hiện: ${selectedAssignee}`, clear: () => onAssigneeChange("") }
      : null,
    selectedUnit
      ? { label: `Đơn vị: ${selectedUnit}`, clear: () => onUnitChange("") }
      : null,
    groupMode !== "unit"
      ? { label: "Hiển thị: Theo section", clear: () => onGroupModeChange("unit") }
      : null
  ].filter((item): item is { label: string; clear: () => void } => item !== null);
  const hasCustomFilter = searchQuery.trim().length > 0 || activeFilters.length > 0;

  const resetFilters = (): void => {
    onSearchChange("");
    onTaskDateChange("");
    onPriorityChange("");
    onAssigneeChange("");
    onUnitChange("");
    onFilterChange("today");
    onGroupModeChange("unit");
  };

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="min-w-0" htmlFor={inputId}>
          <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
            Tìm kiếm
          </span>
          <input
            autoComplete="off"
            className="focus-ring control-pill min-h-11 w-full rounded-[var(--radius-field)] px-3 text-base font-medium text-[var(--foreground)] outline-none placeholder:font-normal placeholder:text-[var(--text-soft)] lg:text-sm"
            id={inputId}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tag, WorkOrder, hạng mục hoặc khu vực"
            type="search"
            value={searchQuery}
          />
        </label>

        <div className="flex min-w-0 flex-wrap gap-2">
          <button
            aria-controls={`${inputId}-filters`}
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
              onClick={resetFilters}
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
          id={`${inputId}-filters`}
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Ngày thực hiện
              </span>
              <Select
                className="min-h-11 lg:min-h-11"
                onChange={(event) => onTaskDateChange(event.target.value)}
                value={selectedTaskDate}
              >
                <option value="">Tất cả ngày</option>
                {taskDateOptions.map((date) => (
                  <option key={date} value={date}>
                    {formatViDate(date)}
                  </option>
                ))}
              </Select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Trạng thái
              </span>
              <Select
                className="min-h-11 lg:min-h-11"
                onChange={(event) => onFilterChange(event.target.value as WorkerFilter)}
                value={filter}
              >
                {filterOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Mức ưu tiên
              </span>
              <Select
                className="min-h-11 lg:min-h-11"
                onChange={(event) =>
                  onPriorityChange(event.target.value as WorkerPriorityFilter)
                }
                value={selectedPriority}
              >
                <option value="">Tất cả mức</option>
                <option value="1">P1</option>
                <option value="2">P2</option>
                <option value="3">P3</option>
              </Select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Người thực hiện
              </span>
              <Select
                className="min-h-11 lg:min-h-11"
                onChange={(event) => onAssigneeChange(event.target.value)}
                value={selectedAssignee}
              >
                <option value="">Tất cả người thực hiện</option>
                {assigneeOptions.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </Select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Đơn vị
              </span>
              <Select
                className="min-h-11 lg:min-h-11"
                onChange={(event) => onUnitChange(event.target.value)}
                value={selectedUnit}
              >
                <option value="">Tất cả đơn vị</option>
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">
                Nhóm hiển thị
              </span>
              <Select
                className="min-h-11 lg:min-h-11"
                onChange={(event) =>
                  onGroupModeChange(event.target.value as WorkerGroupMode)
                }
                value={groupMode}
              >
                <option value="unit">Theo đơn vị</option>
                <option value="section">Theo section</option>
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
    </div>
  );
};
