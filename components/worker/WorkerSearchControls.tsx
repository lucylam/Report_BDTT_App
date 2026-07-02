import type { WorkerGroupMode } from "@/components/worker/taskView";

interface WorkerSearchControlsProps {
  readonly inputId: string;
  readonly searchQuery: string;
  readonly resultLabel: string;
  readonly unitChips: readonly string[];
  readonly groupMode: WorkerGroupMode;
  readonly onSearchChange: (value: string) => void;
  readonly onGroupModeChange: (value: WorkerGroupMode) => void;
}

export const WorkerSearchControls = ({
  inputId,
  searchQuery,
  resultLabel,
  unitChips,
  groupMode,
  onSearchChange,
  onGroupModeChange
}: WorkerSearchControlsProps): React.ReactElement => {
  return (
    <div className="glass-card rounded-[var(--radius-card)] p-3">
      <label className="block" htmlFor={inputId}>
        <span className="mobile-compact-label block font-semibold uppercase text-[var(--primary-strong)]">
          Tìm nhanh tag / WO / khu vực
        </span>
        <div className="control-pill mt-2 flex min-h-12 items-center gap-2 rounded-[var(--radius-field)] px-3 focus-within:border-[var(--primary)] focus-within:ring-4 focus-within:ring-[var(--primary-soft)] md:min-h-12">
          <span aria-hidden="true" className="text-sm font-semibold text-[var(--primary)]">
            Tìm
          </span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[var(--text-soft)] md:text-base"
            id={inputId}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="VD: 41PT, 1007, UREA, 164156"
            type="search"
            value={searchQuery}
          />
          {searchQuery ? (
            <button
              className="focus-ring pressable min-h-10 shrink-0 rounded-[var(--radius-field)] bg-[var(--primary-soft)] px-3 text-sm font-semibold leading-tight text-[var(--primary-strong)]"
              onClick={() => onSearchChange("")}
              type="button"
            >
              Xóa
            </button>
          ) : null}
        </div>
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mobile-compact-label min-w-0 font-semibold text-[var(--text-muted)]">
          {resultLabel}
        </span>
        {unitChips.map((unit) => {
          const active = searchQuery.trim().toLowerCase() === unit.toLowerCase();
          return (
            <button
              className={`focus-ring pressable mobile-action-button max-w-full min-w-0 rounded-full border px-3 text-xs font-semibold ${
                active
                  ? "border-[var(--primary)] bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-soft-sm)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
              }`}
              key={unit}
              onClick={() => onSearchChange(active ? "" : unit)}
              type="button"
            >
              <span className="mobile-button-label">{unit}</span>
            </button>
          );
        })}
      </div>

      <div className="control-pill mt-3 grid grid-cols-2 gap-1 rounded-[var(--radius-field)] p-1">
        <GroupButton
          active={groupMode === "unit"}
          label="Theo đơn vị"
          onClick={() => onGroupModeChange("unit")}
        />
        <GroupButton
          active={groupMode === "section"}
          label="Theo section"
          onClick={() => onGroupModeChange("section")}
        />
      </div>
    </div>
  );
};

const GroupButton = ({
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
      className={`focus-ring pressable mobile-action-button min-w-0 rounded-[var(--radius-field)] px-2 text-xs font-semibold ${
        active
          ? "bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-md"
          : "text-[var(--text-muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="mobile-button-label">{label}</span>
    </button>
  );
};
