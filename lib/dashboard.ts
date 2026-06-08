import type { AppData, ProgressRecord, ProgressPercent, Task } from "@/types/domain";

export interface CompletionRow {
  readonly name: string;
  readonly done: number;
  readonly remaining: number;
  readonly total: number;
  readonly percent: number;
}

export interface LeadStatusRow {
  readonly name: string;
  readonly completed: number;
  readonly inProgress: number;
  readonly cancelled: number;
  readonly notStarted: number;
  readonly total: number;
}

export interface UnitLeadRow {
  readonly name: string;
  readonly values: Record<string, number>;
}

export interface ResourceGroupDashboard {
  readonly key: string;
  readonly title: string;
  readonly rows: CompletionRow[];
}

export interface PhaseOneDashboardData {
  readonly overall: CompletionRow;
  readonly byUnit: CompletionRow[];
  readonly byUnitAndLead: UnitLeadRow[];
  readonly bySectionAndLead: UnitLeadRow[];
  readonly leadNames: string[];
  readonly byLeadStatus: LeadStatusRow[];
  readonly resourceGroups: ResourceGroupDashboard[];
}

const resourceGroupLabels: Record<string, string> = {
  "HTĐK": "Nhóm thiết bị hệ thống điều khiển",
  TBCH: "Nhóm thiết bị chấp hành",
  AMLL: "Nhóm TB đo - Áp, mức, lưu lượng",
  BENT: "Nhóm TB đo - Bently",
  "NHIỆT": "Nhóm TB đo - Nhiệt độ",
  PI: "Nhóm TB đo - PI",
  "TLTBĐK": "Nhóm tháo lắp TBĐK"
};

const resourceGroupOrder = ["HTĐK", "TBCH", "AMLL", "BENT", "NHIỆT", "PI", "TLTBĐK"];

const getResourcePrefix = (resourceName: string): string => {
  return resourceName.split("_")[0]?.trim().toUpperCase() ?? "";
};

const getCumulativePercent = (
  progress: readonly ProgressRecord[],
  taskId: string,
  reportDate: string
): ProgressPercent => {
  return progress
    .filter((record) => record.taskId === taskId && record.reportDate <= reportDate)
    .reduce<ProgressPercent>(
      (max, record) => (record.percent > max ? record.percent : max),
      0
    );
};

const getStatus = (
  task: Task,
  percent: ProgressPercent
): "completed" | "inProgress" | "cancelled" | "notStarted" => {
  if (task.isCancelled) return "cancelled";
  if (percent === 100) return "completed";
  if (percent > 0) return "inProgress";
  return "notStarted";
};

const emptyCompletion = (name: string): CompletionRow => ({
  name,
  done: 0,
  remaining: 0,
  total: 0,
  percent: 0
});

const addCompletion = (row: CompletionRow, percent: ProgressPercent): CompletionRow => {
  const done = row.done + percent / 100;
  const total = row.total + 1;
  const remaining = row.remaining + (100 - percent) / 100;
  return {
    ...row,
    done: round(done),
    remaining: round(remaining),
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100)
  };
};

const round = (value: number): number => Math.round(value * 10) / 10;

const createCompletionRows = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string,
  getName: (task: Task) => string
): CompletionRow[] => {
  const map = new Map<string, CompletionRow>();
  tasks.forEach((task) => {
    const name = getName(task) || "Chưa phân loại";
    const current = map.get(name) ?? emptyCompletion(name);
    map.set(name, addCompletion(current, getCumulativePercent(progress, task.id, reportDate)));
  });
  return Array.from(map.values()).sort((left, right) => right.total - left.total);
};

export const buildPhaseOneDashboard = (
  data: AppData,
  reportDate: string
): PhaseOneDashboardData => {
  const activeTasks = data.tasks.filter((task) => !task.isCancelled);
  const byUnit = createCompletionRows(
    activeTasks,
    data.progress,
    reportDate,
    (task) => task.donVi
  );
  const overall = byUnit.reduce<CompletionRow>(
    (acc, row) => ({
      name: "Tiến độ BDTT",
      done: round(acc.done + row.done),
      remaining: round(acc.remaining + row.remaining),
      total: acc.total + row.total,
      percent:
        acc.total + row.total === 0
          ? 0
          : Math.round(((acc.done + row.done) / (acc.total + row.total)) * 100)
    }),
    emptyCompletion("Tiến độ BDTT")
  );

  const leadNames = Array.from(
    new Set(data.tasks.map((task) => task.nhomTruong).filter(Boolean))
  ).sort();
  const byUnitAndLead = buildUnitLeadRows(activeTasks, data.progress, reportDate, leadNames);
  const bySectionAndLead = buildGroupedLeadRows(
    activeTasks,
    data.progress,
    reportDate,
    leadNames,
    (task) => task.section
  );
  const byLeadStatus = buildLeadStatusRows(data.tasks, data.progress, reportDate);
  const resourceGroups = resourceGroupOrder.map((key) => ({
    key,
    title: resourceGroupLabels[key] ?? key,
    rows: createCompletionRows(
      activeTasks.filter((task) => getResourcePrefix(task.resourceName) === key),
      data.progress,
      reportDate,
      (task) => task.resourceName
    )
  }));

  return {
    overall,
    byUnit,
    byUnitAndLead,
    bySectionAndLead,
    leadNames,
    byLeadStatus,
    resourceGroups
  };
};

const buildLeadStatusRows = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string
): LeadStatusRow[] => {
  const map = new Map<string, LeadStatusRow>();
  tasks.forEach((task) => {
    const name = task.nhomTruong || "Chưa phân loại";
    const current =
      map.get(name) ??
      {
        name,
        completed: 0,
        inProgress: 0,
        cancelled: 0,
        notStarted: 0,
        total: 0
      };
    const status = getStatus(task, getCumulativePercent(progress, task.id, reportDate));
    map.set(name, {
      ...current,
      [status]: current[status] + 1,
      total: current.total + 1
    });
  });
  return Array.from(map.values()).sort((left, right) => right.total - left.total);
};

const buildUnitLeadRows = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string,
  leadNames: readonly string[]
): UnitLeadRow[] => {
  return buildGroupedLeadRows(tasks, progress, reportDate, leadNames, (task) => task.donVi);
};

const buildGroupedLeadRows = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string,
  leadNames: readonly string[],
  getGroupName: (task: Task) => string
): UnitLeadRow[] => {
  const grouped = new Map<string, Map<string, { total: number; percentSum: number }>>();
  tasks.forEach((task) => {
    const unit = getGroupName(task) || "Chưa phân loại";
    const lead = task.nhomTruong || "Chưa phân loại";
    const unitMap = grouped.get(unit) ?? new Map<string, { total: number; percentSum: number }>();
    const current = unitMap.get(lead) ?? { total: 0, percentSum: 0 };
    unitMap.set(lead, {
      total: current.total + 1,
      percentSum:
        current.percentSum + getCumulativePercent(progress, task.id, reportDate)
    });
    grouped.set(unit, unitMap);
  });

  return Array.from(grouped.entries())
    .map(([name, unitMap]) => {
      const values: Record<string, number> = {};
      leadNames.forEach((lead) => {
        const item = unitMap.get(lead);
        values[lead] = item && item.total > 0 ? Math.round(item.percentSum / item.total) : 0;
      });
      return { name, values };
    })
    .sort((left, right) => {
      const leftTotal = Object.values(left.values).reduce((sum, value) => sum + value, 0);
      const rightTotal = Object.values(right.values).reduce((sum, value) => sum + value, 0);
      return rightTotal - leftTotal;
    });
};
