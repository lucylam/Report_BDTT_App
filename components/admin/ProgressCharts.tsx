"use client";

import { useState } from "react";
import type { EChartsOption } from "echarts";
import { DashboardExportButton } from "@/components/admin/DashboardExportButton";
import { ExcelLikeChart } from "@/components/admin/ExcelLikeChart";
import { Icon, type IconName } from "@/components/ui";
import type {
  CompletionRow,
  CompletionBreakdownGroup,
  ExcelDashboardData,
  LeadStatusRow,
  MilestoneProgressRow,
  ResourceGroupDashboard,
  UnitLeadRow,
  UnitSectionLeadRow
} from "@/lib/dashboard";
import { cn } from "@/lib/ui";

const statusColors = {
  completed: "var(--chart-done-strong)",
  inProgress: "var(--chart-info)",
  cancelled: "var(--chart-danger)",
  notStarted: "var(--chart-warning)"
} as const;
const doneFill = "var(--chart-done-strong)";
const doneText = "var(--chart-done-text)";
const pnGroupDefinitions = [
  { key: "htdk", name: "HT Điều khiển" },
  { key: "tb-do", name: "TB Đo lường" },
  { key: "tbch", name: "TB Chấp hành" },
  { key: "thao-lap", name: "Tháo/Lắp TBĐK" }
] as const;
type PnGroupKey = (typeof pnGroupDefinitions)[number]["key"];
const normalizeChartLabel = (value: unknown): string =>
  String(value ?? "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const chartTextStyle = {
  color: "var(--foreground)",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  fontWeight: 600
} as const;

const excelTooltip = (valueLabel = "Giá trị"): NonNullable<EChartsOption["tooltip"]> => ({
  appendToBody: true,
  backgroundColor: "var(--surface)",
  borderColor: "var(--border-strong)",
  borderWidth: 1,
  confine: true,
  extraCssText: "box-shadow: var(--shadow-floating); border-radius: var(--radius-field);",
  textStyle: chartTextStyle,
  trigger: "item",
  valueFormatter: (value) => `${formatNumber(Number(value))} ${valueLabel}`
});

const percentAxis = {
  axisLabel: {
    ...chartTextStyle,
    color: "var(--text-muted)",
    formatter: "{value}%"
  },
  axisLine: { lineStyle: { color: "var(--chart-grid)" } },
  axisTick: { show: false },
  max: 100,
  min: 0,
  splitLine: { lineStyle: { color: "var(--chart-grid)", type: "solid" as const } },
  type: "value" as const
};

const categoryAxis = (data: readonly string[], rotate = 0) => ({
  axisLabel: {
    ...chartTextStyle,
    color: "var(--foreground)",
    formatter: (value: string) => wrapChartLabel(value, rotate ? 16 : 22),
    interval: 0,
    lineHeight: 18,
    rotate
  },
  axisLine: { lineStyle: { color: "var(--chart-grid)" } },
  axisTick: { alignWithLabel: true, lineStyle: { color: "var(--chart-grid)" } },
  data: [...data],
  type: "category" as const
});

const leadCategoryAxis = (data: readonly string[]) => ({
  ...categoryAxis(data),
  axisLabel: {
    ...categoryAxis(data).axisLabel,
    fontSize: 12,
    formatter: (value: string) => wrapChartLabel(value, 12),
    lineHeight: 16
  }
});

const wrapChartLabel = (value: string, maximumLineLength: number): string => {
  const words = normalizeChartLabel(value).split(" ");
  const lines: string[] = [];
  words.forEach((word) => {
    const current = lines.at(-1) ?? "";
    if (!current || `${current} ${word}`.length > maximumLineLength) {
      lines.push(word);
      return;
    }
    lines[lines.length - 1] = `${current} ${word}`;
  });
  return lines.join("\n");
};

type MetricTone = "attention" | "done" | "neutral" | "progress" | "remaining" | "worker";

const metricToneClasses: Record<MetricTone, string> = {
  attention: "text-[var(--warning-strong)]",
  done: "text-[var(--success-strong)]",
  neutral: "text-[var(--foreground)]",
  progress: "text-[var(--primary-strong)]",
  remaining: "text-[var(--text-muted)]",
  worker: "text-[var(--info-strong)]"
};

const metricIcons: Record<MetricTone, IconName> = {
  attention: "bell",
  done: "check",
  neutral: "workorder",
  progress: "chart",
  remaining: "list",
  worker: "people"
} as const;

export const ProgressCharts = ({
  dashboard,
  reportYear
}: {
  readonly dashboard: ExcelDashboardData;
  readonly reportYear: string;
}): React.ReactElement => {
  return (
    <section
      className="mx-auto grid w-full max-w-[1680px] min-w-0 gap-3"
      data-dashboard-export-root
    >
      <header className="glass-card overflow-hidden rounded-[var(--radius-card)] p-0">
        <div className="grid gap-3 border-b border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-strong)]">
              Báo cáo Excel
            </p>
            <h2 className="mt-1.5 text-balance text-xl font-semibold leading-tight sm:text-2xl">
              Báo cáo ngắn tiến độ BDTT {reportYear} · Tổ TB ĐL&ĐK
            </h2>
            <p className="mt-1 text-xs font-medium text-[var(--text-muted)] [overflow-wrap:anywhere] lg:text-sm">
              Dữ liệu lũy kế · Mức tiến độ cao nhất của từng hạng mục.
            </p>
          </div>
          <DashboardExportButton
            className="min-h-9 justify-self-start px-3 py-2 text-xs"
          />
        </div>
        <ExecutiveBoard dashboard={dashboard} />
      </header>

      <section className="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(520px,1.15fr)_minmax(0,0.85fr)]">
        <OverallPie
          chartNumber={1}
          executive={dashboard.executive}
          reportYear={reportYear}
          row={dashboard.overall}
        />
        <OwnerUnitProgressChart chartNumber={2} data={dashboard.byOwnerUnit} />
      </section>

      <section className="grid min-w-0 items-stretch gap-3 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]">
        <LeadStatusColumns chartNumber={3} data={dashboard.leadStatus} />
        <UnitSectionLeadChart
          chartNumber={4}
          leadNames={dashboard.leadNames}
          sectionRows={dashboard.byUnitSectionAndLead}
          unitRows={dashboard.byOwnerUnitAndLead}
        />
      </section>

      <SubgroupProgressChart chartNumber={5} groups={dashboard.subgroupsByLead} />

      <section className="glass-card min-w-0 rounded-[var(--radius-card)] p-4 sm:p-5">
        <SectionTitle
          subtitle="Hạng mục quy đổi theo % hoàn thành."
          title="Tiến độ theo Nhóm và Phân nhóm chuyên môn"
        />
        <div className="mt-4 grid min-w-0 gap-3 xl:grid-cols-2">
          {dashboard.operationalGroups.map((group, index) => (
            <div className="min-w-0" key={group.key}>
              <OperationalGroupChart chartNumber={index + 6} group={group} />
            </div>
          ))}
        </div>
      </section>

      <ValveMilestoneChart chartNumber={13} rows={dashboard.valveMilestones} />

    </section>
  );
};

const ExecutiveBoard = ({
  dashboard
}: {
  readonly dashboard: ExcelDashboardData;
}): React.ReactElement => {
  const { executive, overall } = dashboard;
  return (
    <div className="grid gap-3 px-4 py-3 lg:px-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Tiến độ tổng"
          note={`${formatNumber(overall.done)}/${formatNumber(executive.activeTasks)} hạng mục quy đổi`}
          tone="progress"
          value={`${executive.overallPercent}%`}
        />
        <Metric
          label="Đã nhập tiến độ"
          note={`${formatNumber(executive.updatedTasks)}/${formatNumber(executive.activeTasks)} hạng mục có record`}
          tone="done"
          value={executive.updatedTasks}
        />
        <Metric
          label="Nhân sự báo cáo"
          note={`${formatNumber(executive.submittedWorkers)}/${formatNumber(executive.totalWorkers)} người đã từng báo cáo`}
          tone="worker"
          value={`${executive.submittedWorkers}/${executive.totalWorkers}`}
        />
        <Metric
          label="Chưa xong"
          note={`${formatNumber(executive.inProgressTasks)} đang làm · ${formatNumber(executive.notStartedTasks)} chưa bắt đầu`}
          tone="attention"
          value={executive.unfinishedTasks}
        />
      </div>

    </div>
  );
};

const Metric = ({
  label,
  note,
  tone,
  value
}: {
  readonly label: string;
  readonly note: string;
  readonly tone: MetricTone;
  readonly value: number | string;
}): React.ReactElement => (
  <div className={cn("metric-card min-w-0 rounded-[var(--radius-card)] p-4", metricToneClasses[tone])}>
    <div className="flex min-w-0 items-center gap-2 pr-6">
      <Icon name={metricIcons[tone]} />
      <p className="min-w-0 text-xs font-semibold uppercase leading-5 text-current opacity-80 [overflow-wrap:anywhere]">
        {label}
      </p>
    </div>
    <p className="mt-2 text-2xl font-semibold leading-none tabular-nums">{value}</p>
    <p className="mt-2 text-xs font-medium leading-5 text-[var(--text-muted)] [overflow-wrap:anywhere]">
      {note}
    </p>
  </div>
);

const ExecutiveInsight = ({
  executive,
  overall
}: {
  readonly executive: ExcelDashboardData["executive"];
  readonly overall: CompletionRow;
}): React.ReactElement => {
  const hasUpdates = executive.updatedTasks > 0;
  const message = hasUpdates
    ? `${formatNumber(executive.updatedTasks)} hạng mục đã cập nhật · Tiến độ quy đổi ${overall.percent}%.`
    : `${formatNumber(executive.activeTasks)} hạng mục chưa có cập nhật tiến độ.`;

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-[var(--primary-strong)]">
          <Icon name={hasUpdates ? "shield" : "bell"} />
        </span>
        <h3 className="text-sm font-semibold">Tình hình điều hành</h3>
      </div>
      <p className="mt-1 text-sm font-medium leading-5 text-[var(--text-muted)] [overflow-wrap:anywhere]">{message}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <MiniStat label="Tổng WO" value={executive.activeTasks} />
        <MiniStat label="Hoàn thành" value={executive.completedTasks} />
        <MiniStat label="Hủy" value={executive.cancelledTasks} />
      </div>
    </div>
  );
};

const MiniStat = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: number;
}): React.ReactElement => (
  <div className="border-l-2 border-[var(--line)] px-3 py-1">
    <p className="text-[10px] font-normal uppercase text-[var(--text-soft)]">{label}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums">{formatNumber(value)}</p>
  </div>
);

const ChartShell = ({
  chartNumber,
  children,
  subtitle,
  title
}: {
  readonly chartNumber?: number;
  readonly children: React.ReactNode;
  readonly subtitle?: string;
  readonly title: string;
}): React.ReactElement => {
  return (
    <section className="glass-card flex min-w-0 flex-col rounded-[var(--radius-card)] p-4 sm:p-5">
      <div>
        <SectionTitle chartNumber={chartNumber} subtitle={subtitle} title={title} />
      </div>
      {children}
    </section>
  );
};

const SectionTitle = ({
  chartNumber,
  subtitle,
  title
}: {
  readonly chartNumber?: number;
  readonly subtitle?: string;
  readonly title: string;
}): React.ReactElement => (
  <div className="flex min-w-0 items-start gap-3">
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--primary-pale)] text-[var(--primary-strong)] ring-1 ring-[var(--primary-soft)]">
      <Icon name="chart" />
    </span>
    <div className="min-w-0">
      {chartNumber ? (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--primary-strong)]">
          Biểu đồ {String(chartNumber).padStart(2, "0")}
        </p>
      ) : null}
      <h2 className="text-balance text-[15px] font-semibold leading-5 sm:text-base">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-1 text-sm font-medium leading-5 text-[var(--text-muted)] [overflow-wrap:anywhere]">{subtitle}</p>
      ) : null}
    </div>
  </div>
);

const OverallPie = ({
  chartNumber,
  executive,
  reportYear,
  row
}: {
  readonly chartNumber: number;
  readonly executive: ExcelDashboardData["executive"];
  readonly reportYear: string;
  readonly row: CompletionRow;
}): React.ReactElement => {
  if (row.total <= 0) {
    return (
      <EmptyChart
        chartNumber={chartNumber}
        subtitle="Chưa có hạng mục để tính tiến độ tổng."
        title={`Tiến độ BDTT ${reportYear} · Tổ TB ĐL&ĐK`}
      />
    );
  }
  const option: EChartsOption = {
    animationDuration: 500,
    aria: { enabled: true },
    color: [doneFill, "var(--chart-remaining-soft)"],
    legend: {
      bottom: 0,
      icon: "square",
      itemHeight: 12,
      itemWidth: 12,
      textStyle: chartTextStyle
    },
    series: [
      {
        avoidLabelOverlap: true,
        center: ["50%", "45%"],
        data: [
          { name: "Đã thực hiện", value: row.done },
          { name: "Còn lại", value: row.remaining }
        ],
        emphasis: { scale: true, scaleSize: 5 },
        itemStyle: {
          borderColor: "var(--surface)",
          borderRadius: 5,
          borderWidth: 3
        },
        label: { show: false },
        labelLine: { show: false },
        radius: ["55%", "78%"],
        type: "pie"
      }
    ],
    tooltip: excelTooltip("Hạng mục quy đổi")
  };
  return (
    <ChartShell
      chartNumber={chartNumber}
      title={`Tiến độ BDTT ${reportYear} · Tổ TB ĐL&ĐK`}
    >
      <div className="grid content-center gap-5 pt-3 sm:grid-cols-[minmax(17rem,1fr)_minmax(18rem,1fr)] sm:items-center">
        <div className="relative mx-auto w-full max-w-[390px]">
          <ExcelLikeChart
            ariaLabel={`Tiến độ hoàn thành ${row.percent}%`}
            className="min-h-[320px]"
            height={320}
            option={option}
          />
          <div className="pointer-events-none absolute inset-x-0 top-[45%] flex -translate-y-1/2 flex-col items-center justify-center px-2 text-center">
            <p className="text-4xl font-semibold tabular-nums text-[var(--primary-strong)] sm:text-5xl">{row.percent}%</p>
            <p className="mt-1 whitespace-nowrap text-base font-semibold text-[var(--text-muted)]">Hoàn thành</p>
          </div>
        </div>
        <div className="min-w-0">
          <ExecutiveInsight executive={executive} overall={row} />
          <div className="mobile-adaptive-grid mt-4 grid grid-cols-2 gap-3">
            <ChartMetric label="Đã thực hiện" tone="done" value={row.done} />
            <ChartMetric label="Còn lại" tone="remaining" value={row.remaining} />
          </div>
        </div>
      </div>
    </ChartShell>
  );
};

const ChartMetric = ({
  label,
  tone,
  value
}: {
  readonly label: string;
  readonly tone: "done" | "remaining";
  readonly value: number;
}): React.ReactElement => (
  <div className="border-l-2 border-[var(--line)] px-3 py-1">
    <p className="text-xs font-medium leading-4 text-[var(--text-muted)]">{label}</p>
    <p className={cn("mt-2 text-xl font-semibold tabular-nums", metricToneClasses[tone])}>
      {formatNumber(value)}
    </p>
  </div>
);

const OwnerUnitProgressChart = ({
  chartNumber,
  data
}: {
  readonly chartNumber: number;
  readonly data: readonly CompletionRow[];
}): React.ReactElement => {
  const rows = data.filter((row) => row.total > 0);
  if (rows.length === 0) {
    return (
      <EmptyChart
        chartNumber={chartNumber}
        subtitle="Chưa có dữ liệu Đơn vị chủ quản để tổng hợp."
        title="Tiến độ theo Đơn vị chủ quản"
      />
    );
  }

  const option: EChartsOption = {
    animationDuration: 450,
    aria: { enabled: true },
    grid: { bottom: 34, containLabel: true, left: 10, right: 56, top: 44 },
    legend: {
      icon: "square",
      itemHeight: 12,
      itemWidth: 12,
      left: 0,
      textStyle: chartTextStyle,
      top: 0
    },
    series: [
      {
        barMaxWidth: 26,
        data: rows.map((row) => clampPercent(row.percent)),
        itemStyle: { borderRadius: [4, 0, 0, 4], color: doneFill },
        label: {
          color: doneText,
          formatter: (params) => Number(params.value) >= 12 ? `${params.value}%` : "",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 700,
          position: "insideRight",
          show: true
        },
        name: "Đã thực hiện",
        stack: "total",
        type: "bar"
      },
      {
        barMaxWidth: 26,
        data: rows.map((row) => 100 - clampPercent(row.percent)),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: "var(--chart-remaining-strong)" },
        label: {
          color: "var(--foreground)",
          formatter: (params) => {
            const row = rows[params.dataIndex];
            return row && row.percent < 12 ? `${row.percent}%` : "";
          },
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 700,
          position: "right",
          show: true
        },
        name: "Còn lại",
        stack: "total",
        type: "bar"
      }
    ],
    tooltip: { ...excelTooltip("%"), trigger: "axis" },
    xAxis: percentAxis,
    yAxis: {
      ...categoryAxis(rows.map((row) => normalizeChartLabel(row.name))),
      axisLabel: {
        ...chartTextStyle,
        color: "var(--foreground)",
        formatter: (value: string) => wrapChartLabel(value, 24),
        lineHeight: 16
      }
    }
  };

  return (
    <ChartShell
      chartNumber={chartNumber}
      title="Tiến độ theo Đơn vị chủ quản"
    >
      <ExcelLikeChart
        ariaLabel="Biểu đồ thanh ngang tiến độ theo Đơn vị chủ quản"
        className="mt-4"
        height={Math.max(290, rows.length * 42 + 82)}
        option={option}
      />
    </ChartShell>
  );
};

const SubgroupProgressChart = ({
  chartNumber,
  groups
}: {
  readonly chartNumber: number;
  readonly groups: readonly CompletionBreakdownGroup[];
}): React.ReactElement => {
  const [selectedKey, setSelectedKey] = useState<PnGroupKey>(pnGroupDefinitions[0].key);
  const selectedDefinition = pnGroupDefinitions.find((group) => group.key === selectedKey)
    ?? pnGroupDefinitions[0];
  const selectedGroup = groups.find((group) => group.name === selectedDefinition.name);
  const rows = selectedGroup?.rows.filter((row) => row.total > 0) ?? [];
  const option: EChartsOption = {
    animationDuration: 450,
    aria: { enabled: true },
    grid: { bottom: 32, containLabel: true, left: 10, right: 108, top: 44 },
    legend: {
      icon: "square",
      itemHeight: 12,
      itemWidth: 12,
      left: 0,
      textStyle: chartTextStyle,
      top: 0
    },
    series: [
      {
        barMaxWidth: 26,
        data: rows.map((row) => clampPercent(row.percent)),
        itemStyle: { borderRadius: [4, 0, 0, 4], color: doneFill },
        label: {
          color: doneText,
          formatter: (params) => Number(params.value) >= 12 ? `${params.value}%` : "",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 700,
          position: "insideRight",
          show: true
        },
        name: "Đã thực hiện",
        stack: "progress",
        type: "bar"
      },
      {
        barMaxWidth: 26,
        data: rows.map((row) => 100 - clampPercent(row.percent)),
        itemStyle: { borderRadius: [0, 4, 4, 0], color: "var(--chart-remaining-strong)" },
        label: {
          color: "var(--foreground)",
          formatter: (params) => {
            const row = rows[params.dataIndex];
            return row ? `${formatNumber(row.done)}/${formatNumber(row.total)} WO` : "";
          },
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 700,
          position: "right",
          show: true
        },
        name: "Còn lại",
        stack: "progress",
        type: "bar"
      }
    ],
    tooltip: { ...excelTooltip("%"), trigger: "axis" },
    xAxis: percentAxis,
    yAxis: {
      ...categoryAxis(rows.map((row) => normalizeChartLabel(row.name))),
      axisLabel: {
        ...chartTextStyle,
        color: "var(--foreground)",
        formatter: (value: string) => wrapChartLabel(value, 24),
        lineHeight: 16
      },
      inverse: true
    }
  };

  return (
    <ChartShell
      chartNumber={chartNumber}
      subtitle="Chọn Nhóm để xem từng PN."
      title="Tiến độ theo Phân nhóm (PN)"
    >
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Chọn Nhóm để xem tiến độ Phân nhóm">
        {pnGroupDefinitions.map((group) => {
          const active = group.key === selectedDefinition.key;
          return (
            <button
              aria-pressed={active}
              className={cn(
                "inline-flex min-h-11 items-center justify-center rounded-[var(--radius-field)] border px-3 py-1.5 text-sm font-semibold leading-5 transition-colors [overflow-wrap:anywhere]",
                active
                  ? "border-[var(--primary-strong)] bg-[var(--primary-strong)] text-[var(--on-success)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              )}
              key={group.key}
              onClick={() => setSelectedKey(group.key)}
              type="button"
            >
              {group.name}
            </button>
          );
        })}
      </div>
      {rows.length > 0 ? (
        <ExcelLikeChart
          ariaLabel={`Biểu đồ thanh tiến độ các PN thuộc ${selectedDefinition.name}`}
          className="mt-3"
          height={Math.max(260, rows.length * 44 + 88)}
          option={option}
        />
      ) : (
        <div className="mt-4 flex min-h-52 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-4 text-center text-sm font-medium text-[var(--text-muted)]">
          Chưa có dữ liệu PN thuộc Nhóm {selectedDefinition.name}.
        </div>
      )}
    </ChartShell>
  );
};

const LeadStatusColumns = ({
  chartNumber,
  data
}: {
  readonly chartNumber: number;
  readonly data: readonly LeadStatusRow[];
}): React.ReactElement => {
  const rows = data.filter((row) => row.total > 0);
  if (rows.length === 0) {
    return (
      <EmptyChart
        chartNumber={chartNumber}
        subtitle="Chưa có hạng mục được phân vào bốn Nhóm phụ trách."
        title="Thống kê trạng thái theo bốn Nhóm"
      />
    );
  }

  const statusSeries = [
    { color: statusColors.completed, key: "completed" as const, label: "Hoàn thành", text: doneText },
    { color: statusColors.inProgress, key: "inProgress" as const, label: "Đang làm", text: "var(--on-info)" },
    { color: statusColors.cancelled, key: "cancelled" as const, label: "Đã hủy", text: "var(--on-danger)" },
    { color: statusColors.notStarted, key: "notStarted" as const, label: "Chưa làm", text: "var(--on-warning)" }
  ];
  const option: EChartsOption = {
    animationDuration: 450,
    aria: { enabled: true },
    grid: { bottom: 74, containLabel: true, left: 38, right: 16, top: 56 },
    legend: {
      icon: "square",
      itemGap: 16,
      itemHeight: 12,
      itemWidth: 12,
      textStyle: chartTextStyle,
      top: 0
    },
    series: statusSeries.map((status) => ({
      barMaxWidth: 64,
      data: rows.map((row) => row.total > 0 ? Math.round((row[status.key] / row.total) * 100) : 0),
      itemStyle: { color: status.color },
      label: {
        color: status.text,
        formatter: (params) => Number(params.value) >= 8 ? `${params.value}%` : "",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        fontWeight: 700,
        position: "inside",
        show: true
      },
      name: status.label,
      stack: "status",
      type: "bar"
    })),
    tooltip: { ...excelTooltip("%"), trigger: "axis" },
    xAxis: leadCategoryAxis(rows.map((row) => normalizeChartLabel(row.name))),
    yAxis: percentAxis
  };

  return (
    <ChartShell
      chartNumber={chartNumber}
      title="Thống kê trạng thái theo bốn Nhóm"
    >
      <ExcelLikeChart
        ariaLabel="Biểu đồ cột chồng 100% trạng thái theo bốn Nhóm"
        className="mt-4"
        height={350}
        option={option}
      />
    </ChartShell>
  );
};

const UnitSectionLeadChart = ({
  chartNumber,
  leadNames,
  sectionRows,
  unitRows
}: {
  readonly chartNumber: number;
  readonly leadNames: readonly string[];
  readonly sectionRows: readonly UnitSectionLeadRow[];
  readonly unitRows: readonly UnitLeadRow[];
}): React.ReactElement => {
  const unitNames = unitRows
    .filter((row) => leadNames.some((lead) => (row.totals[lead] ?? 0) > 0))
    .map((row) => row.name);
  const [requestedUnit, setRequestedUnit] = useState(unitNames[0] ?? "");
  const [requestedSection, setRequestedSection] = useState("");
  const selectedUnit = unitNames.includes(requestedUnit) ? requestedUnit : (unitNames[0] ?? "");
  const sectionNames = sectionRows
    .filter((row) => row.unit === selectedUnit)
    .map((row) => row.section)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => left.localeCompare(right, "vi"));
  const selectedSection = sectionNames.includes(requestedSection) ? requestedSection : "";
  const selectedRow = selectedSection
    ? sectionRows.find((row) => row.unit === selectedUnit && row.section === selectedSection)
    : unitRows.find((row) => row.name === selectedUnit);
  const hasData = Boolean(selectedRow && leadNames.some((lead) => (selectedRow.totals[lead] ?? 0) > 0));

  if (unitNames.length === 0) {
    return (
      <EmptyChart
        chartNumber={chartNumber}
        subtitle="Chưa có phân công đồng thời theo Đơn vị và Nhóm trưởng."
        title="Tiến độ theo Đơn vị và Section"
      />
    );
  }

  const visibleLeads = selectedRow
    ? leadNames.filter((lead) => (selectedRow.totals[lead] ?? 0) > 0)
    : [];
  const option: EChartsOption = {
    animationDuration: 450,
    aria: { enabled: true },
    grid: { bottom: 78, containLabel: true, left: 42, right: 16, top: 24 },
    series: [
      {
        barMaxWidth: 74,
        data: visibleLeads.map((lead) => clampPercent(selectedRow?.values[lead] ?? 0)),
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: doneFill
        },
        label: {
          color: "var(--foreground)",
          formatter: "{c}%",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          fontWeight: 700,
          position: "top",
          show: true
        },
        name: "%Complete trung bình",
        type: "bar"
      }
    ],
    tooltip: excelTooltip("%"),
    xAxis: leadCategoryAxis(visibleLeads.map(normalizeChartLabel)),
    yAxis: percentAxis
  };

  return (
    <ChartShell
      chartNumber={chartNumber}
      title="Tiến độ theo Đơn vị và Section"
    >
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
          Đơn vị
          <select
            className="min-h-11 min-w-0 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)]"
            onChange={(event) => {
              setRequestedUnit(event.target.value);
              setRequestedSection("");
            }}
            value={selectedUnit}
          >
            {unitNames.map((unit) => (
              <option key={unit} value={unit}>{normalizeChartLabel(unit)}</option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
          Section
          <select
            className="min-h-11 min-w-0 rounded-[var(--radius-field)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] disabled:opacity-60"
            disabled={sectionNames.length === 0}
            onChange={(event) => setRequestedSection(event.target.value)}
            value={selectedSection}
          >
            <option value="">Tất cả Section</option>
            {sectionNames.map((section) => (
              <option key={section} value={section}>{normalizeChartLabel(section)}</option>
            ))}
          </select>
        </label>
      </div>
      {hasData && selectedRow ? (
        <ExcelLikeChart
          ariaLabel={`Biểu đồ cột tiến độ ${normalizeChartLabel(selectedUnit)} ${selectedSection || "tất cả Section"}`}
          className="mt-4"
          height={330}
          option={option}
        />
      ) : (
        <div className="mt-4 flex min-h-48 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-4 text-center text-sm font-medium text-[var(--text-muted)]">
          Không có WO phù hợp với Đơn vị và Section đã chọn.
        </div>
      )}
    </ChartShell>
  );
};

const OperationalGroupChart = ({
  chartNumber,
  group
}: {
  readonly chartNumber: number;
  readonly group: ResourceGroupDashboard;
}): React.ReactElement => {
  const rows = group.rows.filter((row) => row.total > 0);
  if (rows.length === 0) {
    return (
      <EmptyChart
        chartNumber={chartNumber}
        subtitle="Chưa có hạng mục thuộc nhóm chuyên môn này trong dữ liệu hiện tại."
        title={group.title}
      />
    );
  }
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const done = rows.reduce((sum, row) => sum + row.done, 0);
  const option: EChartsOption = {
    animationDuration: 450,
    aria: { enabled: true },
    grid: { bottom: rows.length > 5 ? 106 : 76, containLabel: true, left: 42, right: 16, top: 50 },
    legend: {
      icon: "square",
      itemHeight: 12,
      itemWidth: 12,
      textStyle: chartTextStyle,
      top: 0
    },
    series: [
      {
        barMaxWidth: 54,
        data: rows.map((row) => clampPercent(row.percent)),
        itemStyle: { color: doneFill },
        label: {
          color: doneText,
          formatter: (params) => Number(params.value) >= 10 ? `${params.value}%` : "",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 700,
          position: "inside",
          show: true
        },
        name: "Đã thực hiện",
        stack: "progress",
        type: "bar"
      },
      {
        barMaxWidth: 54,
        data: rows.map((row) => 100 - clampPercent(row.percent)),
        itemStyle: { color: "var(--chart-remaining-strong)" },
        name: "Còn lại",
        stack: "progress",
        type: "bar"
      }
    ],
    tooltip: { ...excelTooltip("%"), trigger: "axis" },
    xAxis: categoryAxis(
      rows.map((row) => normalizeChartLabel(row.name)),
      rows.length > 5 ? 35 : 0
    ),
    yAxis: percentAxis
  };

  return (
    <ChartShell
      chartNumber={chartNumber}
      subtitle={`${formatNumber(total)} WO · ${formatNumber(done)} đã thực hiện`}
      title={group.title}
    >
      <ExcelLikeChart
        ariaLabel={`Biểu đồ cột chồng 100% ${group.title}`}
        className="mt-4"
        height={rows.length > 5 ? 380 : 330}
        option={option}
      />
    </ChartShell>
  );
};

const ValveMilestoneChart = ({
  chartNumber,
  rows
}: {
  readonly chartNumber: number;
  readonly rows: readonly MilestoneProgressRow[];
}): React.ReactElement => {
  const total = rows[0]?.total ?? 0;
  if (total <= 0) {
    return (
      <EmptyChart
        chartNumber={chartNumber}
        subtitle="Chưa có hạng mục của Hữu Văn Cưng để lập pipeline BDSC van."
        title="Phân nhóm BDSC cùng Cơ khí và giám sát Van"
      />
    );
  }

  const option: EChartsOption = {
    animationDuration: 450,
    aria: { enabled: true },
    grid: { bottom: 32, containLabel: true, left: 10, right: 88, top: 20 },
    series: [
      {
        backgroundStyle: { color: "var(--chart-remaining-soft)" },
        barMaxWidth: 30,
        data: rows.map((row) => clampPercent(row.percent)),
        itemStyle: { borderRadius: 4, color: doneFill },
        label: {
          color: "var(--foreground)",
          formatter: (params) => {
            const row = rows[params.dataIndex];
            return row ? `${row.percent}% · ${row.count}/${row.total} WO` : `${params.value}%`;
          },
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 700,
          position: "right",
          show: true
        },
        name: "WO đạt mốc",
        showBackground: true,
        type: "bar"
      }
    ],
    tooltip: excelTooltip("%"),
    xAxis: percentAxis,
    yAxis: {
      ...categoryAxis(rows.map((row, index) => `${index + 1}. ${row.label}`)),
      axisLabel: {
        ...chartTextStyle,
        color: "var(--foreground)",
        formatter: (value: string) => wrapChartLabel(value, 27),
        lineHeight: 16
      },
      inverse: true
    }
  };

  return (
    <ChartShell
      chartNumber={chartNumber}
      subtitle="Các mốc được tính lũy kế."
      title="Phân nhóm BDSC cùng Cơ khí và giám sát Van"
    >
      <ExcelLikeChart
        ariaLabel="Biểu đồ thanh pipeline lũy kế BDSC van"
        className="mt-4"
        height={340}
        option={option}
      />
    </ChartShell>
  );
};

const EmptyChart = ({
  chartNumber,
  subtitle,
  title
}: {
  readonly chartNumber?: number;
  readonly subtitle: string;
  readonly title: string;
}): React.ReactElement => (
  <ChartShell chartNumber={chartNumber} subtitle={subtitle} title={title}>
    <div className="mt-3 flex min-h-40 flex-1 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-4 text-center text-sm font-medium text-[var(--text-muted)] lg:mt-4 lg:min-h-[260px]">
      Không có dữ liệu đủ ý nghĩa để hiển thị chart.
    </div>
  </ChartShell>
);

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
};

const clampPercent = (value: number): number => {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
};
