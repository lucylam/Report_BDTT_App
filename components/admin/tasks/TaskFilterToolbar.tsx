import type {
  QuickFilter,
  StatusFilter,
  TaskKpis
} from "@/components/admin/tasks/taskTableModel";

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
  readonly onQueryChange: (value: string) => void;
  readonly onGroupChange: (value: string) => void;
  readonly onUnitChange: (value: string) => void;
  readonly onSectionChange: (value: string) => void;
  readonly onPriorityChange: (value: string) => void;
  readonly onStatusChange: (value: StatusFilter) => void;
  readonly onQuickFilterChange: (value: QuickFilter) => void;
}

const inputControlClass =
  "focus-ring control-pill min-h-12 w-full rounded-full px-4 text-base font-semibold text-slate-800 placeholder:text-slate-500";

const selectControlClass =
  "focus-ring control-pill min-h-11 w-full rounded-full px-3 text-sm font-semibold text-slate-800";

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
  onQueryChange,
  onGroupChange,
  onUnitChange,
  onSectionChange,
  onPriorityChange,
  onStatusChange,
  onQuickFilterChange
}: TaskFilterToolbarProps): React.ReactElement => {
  return (
    <section className="soft-panel p-4">
      <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.4fr)_repeat(5,minmax(120px,1fr))]">
        <label>
          <span className="mb-2 block text-xs font-bold uppercase text-[var(--primary-strong)]">
            Tìm nhanh
          </span>
          <input
            className={inputControlClass}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Tag, WO, hạng mục, resource, section..."
            value={query}
          />
        </label>
        <FilterSelect label="Nhóm" onChange={onGroupChange} value={group} values={groups} />
        <FilterSelect label="Đơn vị" onChange={onUnitChange} value={unit} values={units} />
        <FilterSelect
          label="Section"
          onChange={onSectionChange}
          value={section}
          values={sections}
        />
        <label>
          <span className="mb-2 block text-xs font-bold uppercase text-slate-700">Priority</span>
          <select className={selectControlClass} onChange={(event) => onPriorityChange(event.target.value)} value={priority}>
            <option value="all">Tất cả P</option>
            <option value="1">P1</option>
            <option value="2">P2</option>
            <option value="3">P3</option>
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-bold uppercase text-slate-700">Trạng thái</span>
          <select
            className={selectControlClass}
            onChange={(event) => onStatusChange(event.target.value as StatusFilter)}
            value={status}
          >
            <option value="all">Tất cả</option>
            <option value="completed">Hoàn thành</option>
            <option value="inProgress">Đang thực hiện</option>
            <option value="notStarted">Chưa thực hiện</option>
            <option value="cancelled">Cancel</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <QuickChip count={kpis.total} label="Tất cả" selected={quickFilter === "all"} onClick={() => onQuickFilterChange("all")} />
        <QuickChip count={kpis.p1Open} label="P1 chưa xong" selected={quickFilter === "p1Open"} onClick={() => onQuickFilterChange("p1Open")} />
        <QuickChip count={kpis.cancelled} label="Cancel" selected={quickFilter === "cancelled"} onClick={() => onQuickFilterChange("cancelled")} />
        <QuickChip count={kpis.notStarted} label="Chưa thực hiện" selected={quickFilter === "notStarted"} onClick={() => onQuickFilterChange("notStarted")} />
        <QuickChip count={kpis.inProgress} label="Đang thực hiện" selected={quickFilter === "inProgress"} onClick={() => onQuickFilterChange("inProgress")} />
      </div>
    </section>
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
}): React.ReactElement => {
  return (
    <label>
      <span className="mb-2 block text-xs font-bold uppercase text-slate-700">{label}</span>
      <select className={selectControlClass} onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="all">{label}</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
};

const QuickChip = ({
  count,
  label,
  selected,
  onClick
}: {
  readonly count: number;
  readonly label: string;
  readonly selected: boolean;
  readonly onClick: () => void;
}): React.ReactElement => {
  return (
    <button
      className={`focus-ring pressable min-h-10 rounded-full border px-4 text-sm font-bold ${
        selected
          ? "border-[var(--primary-strong)] bg-[var(--primary-strong)] text-white shadow-md"
          : "border-white/80 bg-white/85 text-slate-800 shadow-sm hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary-strong)]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}: {count}
    </button>
  );
};
