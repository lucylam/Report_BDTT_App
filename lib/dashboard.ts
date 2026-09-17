import type {
  AppData,
  ProgressPercent,
  ProgressRecord,
  Task
} from "@/types/domain";
import {
  getActiveTasksByReporter,
  getReportablePersonnel,
  hasSubmittedAnyReport
} from "@/lib/reportingPersonnel";
import { ORG_GROUPS, getOrgTaskSubgroup } from "@/lib/org2026";
import { getTaskCumulativePercent } from "@/lib/progress";

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
  readonly totals: Record<string, number>;
}

export interface UnitSectionLeadRow {
  readonly unit: string;
  readonly section: string;
  readonly values: Record<string, number>;
  readonly totals: Record<string, number>;
}

export interface MilestoneProgressRow {
  readonly key: string;
  readonly label: string;
  readonly threshold: number;
  readonly count: number;
  readonly total: number;
  readonly percent: number;
}

export interface ResourceGroupDashboard {
  readonly key: string;
  readonly title: string;
  readonly rows: CompletionRow[];
}

export interface CompletionBreakdownGroup {
  readonly key: string;
  readonly name: string;
  readonly context: string;
  readonly rowLabels?: Readonly<Record<string, string>>;
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
  readonly nominalOverall: CompletionRow;
  readonly executive: ExecutiveDashboardSummary;
  readonly byLead: CompletionRow[];
  readonly bySubgroup: CompletionRow[];
  readonly subgroupsByLead: CompletionBreakdownGroup[];
  readonly bySpecialtyGroup: CompletionRow[];
  readonly byOwnerUnit: CompletionRow[];
  readonly bySection: CompletionRow[];
  readonly sectionsByOwnerUnit: CompletionBreakdownGroup[];
  readonly byOwnerUnitAndLead: UnitLeadRow[];
  readonly byUnitSectionAndLead: UnitSectionLeadRow[];
  readonly attentionOwnerUnits: CompletionRow[];
  readonly attentionLeads: LeadStatusRow[];
  readonly leadNames: string[];
  readonly leadStatus: LeadStatusRow[];
  readonly resourceGroups: ResourceGroupDashboard[];
  readonly operationalGroups: ResourceGroupDashboard[];
  readonly votingValveRows: CompletionRow[];
  readonly valveMilestones: MilestoneProgressRow[];

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

const preferredLeadNames = [
  "VÕ QUANG MINH",
  "NGUYỄN THANH HẢI",
  "LÝ NGỌC LĨNH",
  "PHẠM QUYẾT CHIẾN"
] as const;

const preferredLeadGroupLabels = [
  "HT Điều khiển",
  "TB Đo lường",
  "TB Chấp hành",
  "Tháo/Lắp TBĐK"
] as const;

const preferredLeadOrgGroups = [
  ORG_GROUPS.htDieuKhien,
  ORG_GROUPS.doLuong,
  ORG_GROUPS.chapHanh,
  ORG_GROUPS.thaoLap
] as const;

const operationalGroupDefinitions = [
  {
    key: "htdk",
    title: "Nhóm thiết bị Hệ thống điều khiển",
    taskGroups: ["DK-DCS", "DK-PLC", "DK-F&G"]
  },
  {
    key: "tbch",
    title: "Nhóm thiết bị Chấp hành",
    taskGroups: ["DK-VALVE", "DK-SP", "DK-PT"]
  },
  {
    key: "thao-lap",
    title: "Nhóm Tháo lắp TBĐK",
    taskGroups: ["DK-T.CA"]
  },
  {
    key: "amll",
    title: "Nhóm TB Đo - Áp, Mức, Lưu lượng",
    taskGroups: ["DK-AMLL"]
  },
  {
    key: "bently",
    title: "Nhóm TB Đo - Bently",
    taskGroups: ["DK-BENT"]
  },
  {
    key: "nhiet-do",
    title: "Nhóm TB Đo - Nhiệt độ",
    taskGroups: ["DK-NHIET"]
  },
  {
    key: "pi",
    title: "Nhóm TB Đo - PI",
    taskGroups: ["DK-HC"]
  }
] as const;

const votingValveTags = [
  "06HV-1005",
  "06PV-1021A",
  "06HV-1008",
  "06HV-1055",
  "06HV-1006",
  "04TV-2577"
] as const;

const valveMilestoneDefinitions = [
  { key: "workshop", label: "Đã mang về Workshop", threshold: 20 },
  { key: "separated", label: "Đã tách Actuator và Body", threshold: 30 },
  { key: "overhauled", label: "Đã thực hiện xong BDSC", threshold: 50 },
  { key: "site", label: "Đã mang ra Site", threshold: 70 },
  { key: "connected", label: "Đã đấu điện, khí", threshold: 90 }
] as const;

export const getCumulativePercent = (
  progress: readonly ProgressRecord[],
  taskId: string
): ProgressPercent => {
  return getTaskCumulativePercent(progress, taskId);
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
        getCumulativePercent(progress, task.id)
      )
    );
  });
  return Array.from(map.values()).sort((left, right) =>
    compareByPreferredOrder(left.name, right.name, preferredOrder, right.total - left.total)
  );
};

export const buildExcelDashboard = (
  data: AppData
): ExcelDashboardData => {
  const activeTasks = data.tasks.filter((task) => !task.isCancelled);
  const activeLeadTasks = activeTasks.filter(hasDashboardLead);
  const leadTasks = data.tasks.filter(hasDashboardLead);
  const profileById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const profileByResource = new Map(
    data.profiles.map((profile) => [getDashboardKey(profile.resourceName), profile])
  );
  const leadNames = getLeadNames(leadTasks);
  const byLead = createCompletionRows(
    activeLeadTasks,
    data.progress,
    (task) => getDashboardLead(task.nhomTruong) ?? unclassified,
    preferredLeadOrder
  );
  const bySubgroup = createCompletionRows(
    activeTasks,
    data.progress,
    (task) => getTaskSubgroupName(task, profileById, profileByResource)
  );
  const subgroupsByLead = leadNames.flatMap((lead): CompletionBreakdownGroup[] => {
    const matchingLeadTasks = activeLeadTasks.filter(
      (task) => getDashboardLead(task.nhomTruong) === lead
    );
    if (matchingLeadTasks.length === 0) return [];
    const rows = createCompletionRows(
      matchingLeadTasks,
      data.progress,
      (task) => getTaskSubgroupName(task, profileById, profileByResource, false)
    );
    const leadOrgGroup = getLeadOrgGroup(lead);
    const subgroupLeaderByName = new Map(
      data.profiles
        .filter((profile) =>
          profile.orgRole === "pnt" &&
          Boolean(profile.subgroup) &&
          getDashboardKey(profile.orgGroup) === getDashboardKey(leadOrgGroup)
        )
        .map((profile) => [getDashboardKey(profile.subgroup), profile.fullName] as const)
    );
    return [{
      key: getDashboardKey(lead),
      name: getLeadGroupLabel(lead),
      context: normalizeChartSourceLabel(lead),
      rowLabels: Object.fromEntries(rows.map((row) => {
        const leaderName = subgroupLeaderByName.get(getDashboardKey(row.name));
        return [row.name, leaderName ? `${row.name} · ${leaderName}` : row.name];
      })),
      rows
    }];
  });
  const bySpecialtyGroup = createCompletionRows(
    activeTasks,
    data.progress,
    (task) => task.nhom
  );
  const byOwnerUnit = createCompletionRows(
    activeTasks,
    data.progress,
    (task) => task.donVi,
    preferredOwnerUnitOrder
  );
  const bySection = createCompletionRows(
    activeTasks,
    data.progress,
    (task) => task.section
  );
  const sectionsByOwnerUnit = byOwnerUnit.flatMap((unit): CompletionBreakdownGroup[] => {
    const unitTasks = activeTasks.filter(
      (task) => getDashboardKey(task.donVi) === getDashboardKey(unit.name)
    );
    if (unitTasks.length === 0) return [];
    return [{
      key: getDashboardKey(unit.name),
      name: unit.name,
      context: `${unitTasks.length} WO đang hoạt động`,
      rows: createCompletionRows(unitTasks, data.progress, (task) => task.section)
    }];
  });
  const overall = mergeCompletionRows("Tiến độ BDTT", byOwnerUnit);
  const nominalOverall = createCompletionRows(
    data.tasks,
    data.progress,
    () => "Tiến độ danh nghĩa"
  )[0] ?? emptyCompletion("Tiến độ danh nghĩa");
  const byOwnerUnitAndLead = buildGroupedLeadRows(
    activeLeadTasks,
    data.progress,
    leadNames,
    (task) => task.donVi,
    preferredOwnerUnitOrder
  );
  const bySectionAndLead = buildGroupedLeadRows(
    activeLeadTasks,
    data.progress,
    leadNames,
    (task) => task.section
  );
  const byUnitSectionAndLead = buildUnitSectionLeadRows(
    activeLeadTasks,
    data.progress,
    leadNames
  );
  const leadStatus = buildLeadStatusRows(leadTasks, data.progress, leadNames);
  const resourceGroups = bySpecialtyGroup.map((group) => ({
    key: getDashboardKey(group.name),
    title: group.name,
    rows: createCompletionRows(
      activeTasks.filter(
        (task) => getDashboardKey(task.nhom) === getDashboardKey(group.name)
      ),
      data.progress,
      (task) => task.resourceName
    )
  }));
  const operationalGroups = operationalGroupDefinitions.map((definition) => {
    const allowedGroups = new Set(definition.taskGroups.map(getDashboardKey));
    return {
      key: definition.key,
      title: definition.title,
      rows: createCompletionRows(
        activeTasks.filter((task) => allowedGroups.has(getDashboardKey(task.nhom))),
        data.progress,
        (task) => task.resourceName
      )
    };
  });
  const votingRowsByTag = new Map(
    createCompletionRows(
      activeTasks.filter((task) =>
        votingValveTags.some((tag) => getDashboardKey(tag) === getDashboardKey(task.tagname))
      ),
      data.progress,
      (task) => task.tagname,
      votingValveTags
    ).map((row) => [getDashboardKey(row.name), row])
  );
  const votingValveRows = votingValveTags.map(
    (tag) => votingRowsByTag.get(getDashboardKey(tag)) ?? emptyCompletion(tag)
  );
  const valveTasks = activeTasks.filter((task) =>
    getDashboardKey(task.resourceName).endsWith(getDashboardKey("Hữu Văn Cưng"))
  );
  const valveMilestones = valveMilestoneDefinitions.map((milestone) => {
    const count = valveTasks.filter(
      (task) => getCumulativePercent(data.progress, task.id) >= milestone.threshold
    ).length;
    return {
      ...milestone,
      count,
      total: valveTasks.length,
      percent: valveTasks.length === 0 ? 0 : Math.round((count / valveTasks.length) * 100)
    };
  });

  return {
    overall,
    nominalOverall,
    executive: buildExecutiveSummary(data, activeTasks, nominalOverall),
    byLead,
    bySubgroup,
    subgroupsByLead,
    bySpecialtyGroup,
    byOwnerUnit,
    bySection,
    sectionsByOwnerUnit,
    byOwnerUnitAndLead,
    byUnitSectionAndLead,
    attentionOwnerUnits: getAttentionOwnerUnits(byOwnerUnit),
    attentionLeads: getAttentionLeads(leadStatus),
    leadNames,
    leadStatus,
    resourceGroups,
    operationalGroups,
    votingValveRows,
    valveMilestones,
    byUnit: byOwnerUnit,
    byUnitAndLead: byOwnerUnitAndLead,
    bySectionAndLead,
    byLeadStatus: leadStatus
  };
};

export const buildPhaseOneDashboard = buildExcelDashboard;

const buildExecutiveSummary = (
  data: AppData,
  activeTasks: readonly Task[],
  nominalOverall: CompletionRow
): ExecutiveDashboardSummary => {
  const activeTaskIds = new Set(activeTasks.map((task) => task.id));
  const reportablePersonnel = getReportablePersonnel(data.profiles, activeTasks);
  const reportablePersonnelIds = new Set(
    reportablePersonnel.map((profile) => profile.id)
  );
  const activeTasksByReporter = getActiveTasksByReporter(activeTasks);
  const cumulativeRecords = data.progress.filter(
    (record) => activeTaskIds.has(record.taskId)
  );
  const personnelRecords = cumulativeRecords.filter((record) =>
    reportablePersonnelIds.has(record.userId)
  );
  const statuses = activeTasks.map((task) =>
    getStatus(task, getCumulativePercent(data.progress, task.id))
  );
  const submittedPersonnel = reportablePersonnel.filter((profile) =>
    hasSubmittedAnyReport({
      activeTasks: activeTasksByReporter.get(profile.id) ?? [],
      progress: personnelRecords,
      profileId: profile.id
    })
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
    submittedWorkers: submittedPersonnel.length,
    totalWorkers: reportablePersonnel.length,
    overallPercent: nominalOverall.percent
  };
};

const getTaskSubgroupName = (
  task: Task,
  profileById: ReadonlyMap<string, AppData["profiles"][number]>,
  profileByResource: ReadonlyMap<string, AppData["profiles"][number]>,
  includeGroup = true
): string => {
  const assignedProfile = task.assignedTo ? profileById.get(task.assignedTo) : undefined;
  const candidateIds = [task.assignedTo, task.reporterId].filter(
    (profileId): profileId is string => Boolean(profileId)
  );
  const profile = assignedProfile?.orgRole === "nhomTruong"
    ? assignedProfile
    : candidateIds
      .map((profileId) => profileById.get(profileId))
      .find((candidate) => Boolean(candidate?.subgroup))
      ?? profileByResource.get(getDashboardKey(task.resourceName));

  if (!profile) return unclassified;
  const subgroup = getOrgTaskSubgroup(profile.username, profile.subgroup)
    || (profile.orgRole === "nhomTruong" ? profile.fullName.trim() : "");
  if (!subgroup) return unclassified;
  return includeGroup && profile.orgGroup
    ? `${profile.orgGroup} · ${subgroup}`
    : subgroup;
};

const getLeadGroupLabel = (lead: string): string => {
  const leadKey = getDashboardKey(lead);
  const preferredIndex = preferredLeadOrder.findIndex(
    (preferredLead) => getDashboardKey(preferredLead) === leadKey
  );
  if (preferredIndex >= 0) return preferredLeadGroupLabels[preferredIndex] ?? lead;
  return normalizeChartSourceLabel(lead).split(" ").slice(0, -3).join(" ") || normalizeChartSourceLabel(lead);
};

const getLeadOrgGroup = (lead: string): string => {
  const leadKey = getDashboardKey(lead);
  const preferredIndex = preferredLeadOrder.findIndex(
    (preferredLead) => getDashboardKey(preferredLead) === leadKey
  );
  return preferredLeadOrgGroups[preferredIndex] ?? getLeadGroupLabel(lead);
};

const normalizeChartSourceLabel = (value: string): string => {
  return value.replace(/_+/g, " ").replace(/\s+/g, " ").trim();
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
  leadNames: readonly string[]
): LeadStatusRow[] => {
  const map = new Map<string, LeadStatusRow>();
  tasks.forEach((task) => {
    const rawName = getDashboardLead(task.nhomTruong);
    if (!rawName) return;
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
    const status = getStatus(task, getCumulativePercent(progress, task.id));
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
    const rawLead = getDashboardLead(task.nhomTruong);
    if (!rawLead) return;
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
      percentSum: current.percentSum + getCumulativePercent(progress, task.id)
    });
    grouped.set(groupKey, group);
  });

  return Array.from(grouped.entries())
    .map(([, group]) => {
      const values: Record<string, number> = {};
      const totals: Record<string, number> = {};
      leadNames.forEach((lead) => {
        const item = group.leads.get(getDashboardKey(lead));
        values[lead] = item && item.total > 0 ? Math.round(item.percentSum / item.total) : 0;
        totals[lead] = item?.total ?? 0;
      });
      return { name: group.name, values, totals };
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

const buildUnitSectionLeadRows = (
  tasks: readonly Task[],
  progress: readonly ProgressRecord[],
  leadNames: readonly string[]
): UnitSectionLeadRow[] => {
  const grouped = new Map<
    string,
    {
      unit: string;
      section: string;
      leads: Map<string, { total: number; percentSum: number }>;
    }
  >();

  tasks.forEach((task) => {
    const rawUnit = task.donVi?.trim() || unclassified;
    const rawSection = task.section?.trim() || unclassified;
    const lead = getDashboardLead(task.nhomTruong);
    if (!lead) return;
    const unit = getPreferredDisplayName(rawUnit, preferredOwnerUnitOrder);
    const key = `${getDashboardKey(unit)}|${getDashboardKey(rawSection)}`;
    const current = grouped.get(key) ?? {
      unit,
      section: rawSection,
      leads: new Map<string, { total: number; percentSum: number }>()
    };
    const leadKey = getDashboardKey(lead);
    const leadValue = current.leads.get(leadKey) ?? { total: 0, percentSum: 0 };
    current.leads.set(leadKey, {
      total: leadValue.total + 1,
      percentSum: leadValue.percentSum + getCumulativePercent(progress, task.id)
    });
    grouped.set(key, current);
  });

  return Array.from(grouped.values())
    .map((group) => {
      const values: Record<string, number> = {};
      const totals: Record<string, number> = {};
      leadNames.forEach((lead) => {
        const item = group.leads.get(getDashboardKey(lead));
        values[lead] = item && item.total > 0
          ? Math.round(item.percentSum / item.total)
          : 0;
        totals[lead] = item?.total ?? 0;
      });
      return {
        unit: group.unit,
        section: group.section,
        values,
        totals
      };
    })
    .sort((left, right) => {
      const unitOrder = compareByPreferredOrder(
        left.unit,
        right.unit,
        preferredOwnerUnitOrder,
        left.unit.localeCompare(right.unit, "vi")
      );
      return unitOrder !== 0
        ? unitOrder
        : left.section.localeCompare(right.section, "vi", { numeric: true });
    });
};

const getLeadNames = (tasks: readonly Task[]): string[] => {
  const names = Array.from(
    tasks.reduce<Map<string, string>>((map, task) => {
      const name = getDashboardLead(task.nhomTruong);
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

const getDashboardLead = (value: string): string | null => {
  const key = getDashboardKey(value);
  const directMatch = preferredLeadOrder.find((lead) => getDashboardKey(lead) === key);
  if (directMatch) return directMatch;

  const nameIndex = preferredLeadNames.findIndex((name) => {
    const nameKey = getDashboardKey(name);
    return key === nameKey || key.endsWith(` ${nameKey}`);
  });
  return nameIndex >= 0 ? preferredLeadOrder[nameIndex] ?? null : null;
};

const hasDashboardLead = (task: Task): boolean => {
  return getDashboardLead(task.nhomTruong) !== null;
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
