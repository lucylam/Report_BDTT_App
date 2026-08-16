import { Select } from "@/components/ui";
import type { WorkerGroupMode } from "@/components/worker/taskView";
import type { WorkerFilter } from "@/components/worker/types";

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
  readonly unitOptions: readonly string[];
  readonly selectedUnit: string;
  readonly filter: WorkerFilter;
  readonly groupMode: WorkerGroupMode;
  readonly onFilterChange: (value: WorkerFilter) => void;
  readonly onSearchChange: (value: string) => void;
  readonly onUnitChange: (value: string) => void;
  readonly onGroupModeChange: (value: WorkerGroupMode) => void;
}

export const WorkerSearchControls = ({
  inputId,
  searchQuery,
  resultLabel,
  unitOptions,
  selectedUnit,
  filter,
  groupMode,
  onFilterChange,
  onSearchChange,
  onUnitChange,
  onGroupModeChange
}: WorkerSearchControlsProps): React.ReactElement => {
  const hasCustomFilter =
    searchQuery.trim().length > 0 ||
    selectedUnit.length > 0 ||
    filter !== "today" ||
    groupMode !== "unit";

  const resetFilters = (): void => {
    onSearchChange("");
    onUnitChange("");
    onFilterChange("today");
    onGroupModeChange("unit");
  };

  return (
    <div className="min-w-0">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_180px_180px_auto] xl:items-end">
        <label className="min-w-0 sm:col-span-2 xl:col-span-1" htmlFor={inputId}>
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
            onChange={(event) => onGroupModeChange(event.target.value as WorkerGroupMode)}
            value={groupMode}
          >
            <option value="unit">Theo đơn vị</option>
            <option value="section">Theo section</option>
          </Select>
        </label>

        {hasCustomFilter ? (
          <button
            className="focus-ring pressable min-h-11 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)] sm:self-end"
            onClick={resetFilters}
            type="button"
          >
            Đặt lại
          </button>
        ) : null}
      </div>

      <p aria-live="polite" className="mt-2 text-sm font-medium text-[var(--text-muted)]">
        {resultLabel}
      </p>
    </div>
  );
};
