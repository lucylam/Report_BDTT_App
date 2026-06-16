import type {
  AppData,
  ProgressPercent,
  ProgressRecord,
  Profile,
  Task
} from "@/types/domain";

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

export interface ExecutiveDashboardSummary {
  readonly activeTasks: number;
  readonly totalTasks: number;
  readonly cancelledTasks: number;
  readonly completedTasks: number;
  readonly inProgressTasks: number;
  readonly notStartedTasks: number;
  readonly unfinishedTasks: number;
  readonly updatedTasks: number;
  readonly submittedWorkers: number;
  readonly totalWorkers: number;
  readonly overallPercent: number;
}

export interface ExcelDashboardData {
  readonly overall: CompletionRow;
  readonly executive: ExecutiveDashboardSummary;
  readonly byOwnerUnit: CompletionRow[];
  readonly byOwnerUnitAndLead: UnitLeadRow[];
  readonly attentionOwnerUnits: CompletionRow[];
  readonly attentionLeads: LeadStatusRow[];
  readonly leadNames: string[];
  readonly leadStatus: LeadStatusRow[];
  readonly resourceGroups: ResourceGroupDashboard[];

  /*
   * Compatibility aliases for older dashboard calls. They point to the
   * Excel-style owner-unit data now.
   */
  readonly byUnit: CompletionRow[];
  readonly byUnitAndLead: UnitLeadRow[];
  readonly bySectionAndLead: UnitLeadRow[];
  readonly byLeadStatus: LeadStatusRow[];
}

export type PhaseOneDashboardData = ExcelDashboardData;

const unclassified = "Chưa phân loại";

const preferredOwnerUnitOrder = [
  "AMONIA",
  "ĐĐSX",
  "DIEN",
  "GIAO NHẬN",
  "HSE",
  "NPK",
  "SAN PHAM",
  "UREA",
  "UTILITY"
];

const preferredLeadOrder = [
  "HTĐK_VÕ QUANG MINH",
  "TB ĐO_NGUYỄN THANH HẢI",
  "TBCH_LÝ NGỌC LĨNH",
  "TLTBĐK_PHẠM QUYẾT CHIẾN"
];

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
  return normalizeDashboardKey(resourceName.split("_")[0] ?? "");
};

export const getCumulativePercent = (
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

const mergeCompletionRows = (name: string, rows: readonly CompletionRow[]): CompletionRow => {
  const done = rows.reduce((sum, row) => sum + row.done, 0);
  const remaining = rows.reduce((sum, row) => sum + row.remaining, 0);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return {
    name,
    done: round(done),
    remaining: round(remaining),
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100)
  };
};

const round = (value: number): number => Math.round(value * 100) / 100;

const createCompletionRows = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string,
  getName: (task: Task) => string,
  preferredOrder: readonly string[] = []
): CompletionRow[] => {
  const map = new Map<string, CompletionRow>();
  tasks.forEach((task) => {
    const rawName = getName(task)?.trim() || unclassified;
    const key = getDashboardKey(rawName);
    const current = map.get(key) ?? emptyCompletion(getPreferredDisplayName(rawName, preferredOrder));
    const displayName = chooseDisplayName(current.name, rawName, preferredOrder);
    map.set(
      key,
      addCompletion(
        {
          ...current,
          name: displayName
        },
        getCumulativePercent(progress, task.id, reportDate)
      )
    );
  });
  return Array.from(map.values()).sort((left, right) =>
    compareByPreferredOrder(left.name, right.name, preferredOrder, right.total - left.total)
  );
};

export const buildExcelDashboard = (
  data: AppData,
  reportDate: string
): ExcelDashboardData => {
  const activeTasks = data.tasks.filter((task) => !task.isCancelled);
  const byOwnerUnit = createCompletionRows(
    activeTasks,
    data.progress,
    reportDate,
    (task) => task.donVi,
    preferredOwnerUnitOrder
  );
  const overall = mergeCompletionRows("Tiến độ BDTT", byOwnerUnit);
  const leadNames = getLeadNames(data.tasks);
  const byOwnerUnitAndLead = buildGroupedLeadRows(
    activeTasks,
    data.progress,
    reportDate,
    leadNames,
    (task) => task.donVi,
    preferredOwnerUnitOrder
  );
  const leadStatus = buildLeadStatusRows(data.tasks, data.progress, reportDate, leadNames);
  const resourceGroups = resourceGroupOrder.map((key) => ({
    key,
    title: resourceGroupLabels[key] ?? key,
    rows: createCompletionRows(
      activeTasks.filter((task) => getResourcePrefix(task.resourceName) === normalizeDashboardKey(key)),
      data.progress,
      reportDate,
      (task) => task.resourceName
    )
  }));

  return {
    overall,
    executive: buildExecutiveSummary(data, activeTasks, overall, reportDate),
    byOwnerUnit,
    byOwnerUnitAndLead,
    attentionOwnerUnits: getAttentionOwnerUnits(byOwnerUnit),
    attentionLeads: getAttentionLeads(leadStatus),
    leadNames,
    leadStatus,
    resourceGroups,
    byUnit: byOwnerUnit,
    byUnitAndLead: byOwnerUnitAndLead,
    bySectionAndLead: byOwnerUnitAndLead,
    byLeadStatus: leadStatus
  };
};

export const buildPhaseOneDashboard = buildExcelDashboard;

const buildExecutiveSummary = (
  data: AppData,
  activeTasks: readonly Task[],
  overall: CompletionRow,
  reportDate: string
): ExecutiveDashboardSummary => {
  const activeTaskIds = new Set(activeTasks.map((task) => task.id));
  const cumulativeRecords = data.progress.filter(
    (record) => activeTaskIds.has(record.taskId) && record.reportDate <= reportDate
  );
  const todayRecords = data.progress.filter(
    (record) => activeTaskIds.has(record.taskId) && record.reportDate === reportDate
  );
  const statuses = activeTasks.map((task) =>
    getStatus(task, getCumulativePercent(data.progress, task.id, reportDate))
  );

  return {
    activeTasks: activeTasks.length,
    totalTasks: data.tasks.length,
    cancelledTasks: data.tasks.length - activeTasks.length,
    completedTasks: statuses.filter((status) => status === "completed").length,
    inProgressTasks: statuses.filter((status) => status === "inProgress").length,
    notStartedTasks: statuses.filter((status) => status === "notStarted").length,
    unfinishedTasks: statuses.filter((status) => status !== "completed").length,
    updatedTasks: new Set(cumulativeRecords.map((record) => record.taskId)).size,
    submittedWorkers: new Set(todayRecords.map((record) => record.userId)).size,
    totalWorkers: getReportableWorkers(data.profiles).length,
    overallPercent: overall.percent
  };
};

const getReportableWorkers = (profiles: readonly Profile[]): Profile[] => {
  return profiles.filter(
    (profile) => profile.role === "worker" && profile.canLogin && !profile.isPlaceholder
  );
};

const getAttentionOwnerUnits = (rows: readonly CompletionRow[]): CompletionRow[] => {
  return [...rows]
    .filter((row) => row.total > 0 && row.percent < 100)
    .sort((left, right) => {
      if (left.percent !== right.percent) return left.percent - right.percent;
      if (right.remaining !== left.remaining) return right.remaining - left.remaining;
      return right.total - left.total;
    })
    .slice(0, 5);
};

const getAttentionLeads = (rows: readonly LeadStatusRow[]): LeadStatusRow[] => {
  return [...rows]
    .filter((row) => row.notStarted + row.inProgress > 0)
    .sort((left, right) => {
      const rightOpen = right.notStarted + right.inProgress;
      const leftOpen = left.notStarted + left.inProgress;
      if (rightOpen !== leftOpen) return rightOpen - leftOpen;
      return right.total - left.total;
    })
    .slice(0, 5);
};

const buildLeadStatusRows = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string,
  leadNames: readonly string[]
): LeadStatusRow[] => {
  const map = new Map<string, LeadStatusRow>();
  tasks.forEach((task) => {
    const rawName = task.nhomTruong || unclassified;
    const key = getDashboardKey(rawName);
    const current =
      map.get(key) ??
      {
        name: getPreferredDisplayName(rawName, leadNames),
        completed: 0,
        inProgress: 0,
        cancelled: 0,
        notStarted: 0,
        total: 0
      };
    const name = chooseDisplayName(current.name, rawName, leadNames);
    const status = getStatus(task, getCumulativePercent(progress, task.id, reportDate));
    map.set(key, {
      ...current,
      name,
      [status]: current[status] + 1,
      total: current.total + 1
    });
  });
  return Array.from(map.values()).sort((left, right) =>
    compareByPreferredOrder(left.name, right.name, leadNames, right.total - left.total)
  );
};

const buildGroupedLeadRows = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  reportDate: string,
  leadNames: readonly string[],
  getGroupName: (task: Task) => string,
  preferredOrder: readonly string[] = []
): UnitLeadRow[] => {
  const grouped = new Map<
    string,
    {
      name: string;
      leads: Map<string, { total: number; percentSum: number }>;
    }
  >();
  tasks.forEach((task) => {
    const rawGroupName = getGroupName(task)?.trim() || unclassified;
    const groupKey = getDashboardKey(rawGroupName);
    const rawLead = task.nhomTruong || unclassified;
    const leadKey = getDashboardKey(rawLead);
    const currentGroup = grouped.get(groupKey) ?? {
      name: getPreferredDisplayName(rawGroupName, preferredOrder),
      leads: new Map<string, { total: number; percentSum: number }>()
    };
    const group = {
      ...currentGroup,
      name: chooseDisplayName(currentGroup.name, rawGroupName, preferredOrder)
    };
    const current = group.leads.get(leadKey) ?? { total: 0, percentSum: 0 };
    group.leads.set(leadKey, {
      total: current.total + 1,
      percentSum: current.percentSum + getCumulativePercent(progress, task.id, reportDate)
    });
    grouped.set(groupKey, group);
  });

  return Array.from(grouped.entries())
    .map(([, group]) => {
      const values: Record<string, number> = {};
      leadNames.forEach((lead) => {
        const item = group.leads.get(getDashboardKey(lead));
        values[lead] = item && item.total > 0 ? Math.round(item.percentSum / item.total) : 0;
      });
      return { name: group.name, values };
    })
    .sort((left, right) =>
      compareByPreferredOrder(
        left.name,
        right.name,
        preferredOrder,
        sumLeadValues(right) - sumLeadValues(left)
      )
    );
};

const getLeadNames = (tasks: readonly Task[]): string[] => {
  const names = Array.from(
    tasks.reduce<Map<string, string>>((map, task) => {
      const name = task.nhomTruong || "";
      if (!name) return map;
      const key = getDashboardKey(name);
      map.set(key, chooseDisplayName(map.get(key) ?? name, name, preferredLeadOrder));
      return map;
    }, new Map<string, string>()).values()
  );
  return names.sort((left, right) =>
    compareByPreferredOrder(left, right, preferredLeadOrder, left.localeCompare(right, "vi"))
  );
};

const compareByPreferredOrder = (
  left: string,
  right: string,
  preferredOrder: readonly string[],
  fallback: number
): number => {
  const leftKey = getDashboardKey(left);
  const rightKey = getDashboardKey(right);
  const normalizedOrder = preferredOrder.map(getDashboardKey);
  const leftIndex = normalizedOrder.indexOf(leftKey);
  const rightIndex = normalizedOrder.indexOf(rightKey);
  if (leftIndex >= 0 && rightIndex >= 0) return leftIndex - rightIndex;
  if (leftIndex >= 0) return -1;
  if (rightIndex >= 0) return 1;
  return fallback;
};

const getDashboardKey = (value: string): string => {
  const normalized = normalizeDashboardKey(value);
  return normalized || normalizeDashboardKey(unclassified);
};

const normalizeDashboardKey = (value: string): string => {
  return value
    .trim()
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
};

const getPreferredDisplayName = (
  value: string,
  preferredOrder: readonly string[]
): string => {
  const key = getDashboardKey(value);
  return preferredOrder.find((item) => getDashboardKey(item) === key) ?? value;
};

const chooseDisplayName = (
  currentName: string,
  nextName: string,
  preferredOrder: readonly string[]
): string => {
  const current = getPreferredDisplayName(currentName, preferredOrder);
  const next = getPreferredDisplayName(nextName, preferredOrder);
  if (getDashboardKey(current) !== getDashboardKey(next)) return current;
  if (preferredOrder.some((item) => item === current)) return current;
  if (preferredOrder.some((item) => item === next)) return next;
  if (!hasVietnameseSignal(current) && hasVietnameseSignal(next)) return next;
  return current;
};

const hasVietnameseSignal = (value: string): boolean => {
  return /[^\u0000-\u007f]|Đ|đ/.test(value);
};

const sumLeadValues = (row: UnitLeadRow): number => {
  return Object.values(row.values).reduce((sum, value) => sum + value, 0);
};
