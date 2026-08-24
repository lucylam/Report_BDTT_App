"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { DashboardExportButton } from "@/components/admin/DashboardExportButton";
import { Badge, Icon, type IconName } from "@/components/ui";
import type {
  CompletionRow,
  ExcelDashboardData,
  LeadStatusRow,
  ResourceGroupDashboard,
  UnitLeadRow
} from "@/lib/dashboard";
import { cn } from "@/lib/ui";

const statusColors = {
  completed: "var(--chart-done-strong)",
  inProgress: "var(--chart-info)",
  cancelled: "var(--chart-danger)",
  notStarted: "var(--chart-warning)"
} as const;
const doneFill = "var(--chart-done-strong)";
const remainingFill = "var(--chart-remaining-strong)";
const gridStroke = "var(--chart-grid)";
const softGridProps = {
  stroke: gridStroke,
  strokeDasharray: "0",
  strokeOpacity: 0.52
};
const softAxisProps = {
  axisLine: { stroke: gridStroke, strokeOpacity: 0.72 },
  tick: {
    fill: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    fontWeight: 500
  },
  tickLine: false
} as const;
const categoryAxisProps = {
  ...softAxisProps,
  tick: {
    fill: "var(--foreground)",
    fontFamily: "var(--font-sans)",
    fontSize: 12,
    fontWeight: 500
  }
} as const;
const legendTextStyle = {
  color: "var(--foreground)",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "18px"
} as const;
const compactLegendTextStyle = {
  ...legendTextStyle,
  fontSize: 12,
  lineHeight: "18px"
} as const;
const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: "var(--radius-field)",
  boxShadow: "var(--shadow-floating)",
  fontFamily: "var(--font-sans)",
  fontSize: "13px"
} as const;
const tooltipLabelStyle = {
  color: "var(--foreground)",
  fontWeight: 500
} as const;
const tooltipItemStyle = {
  color: "var(--text-muted)",
  fontWeight: 400
} as const;
const normalizeChartLabel = (value: unknown): string =>
  String(value ?? "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const formatAxisName = (value: unknown): string => {
  return normalizeChartLabel(value);
};
const getCategoryAxisWidth = (
  values: readonly unknown[],
  minimum = 96,
  maximum = 240
): number => {
  const longest = Math.max(0, ...values.map((value) => normalizeChartLabel(value).length));
  return Math.max(minimum, Math.min(maximum, Math.ceil(longest * 7 + 18)));
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
  reportDateLabel
}: {
  readonly dashboard: ExcelDashboardData;
  readonly reportDateLabel: string;
}): React.ReactElement => {
  const reportYear = reportDateLabel.match(/\d{4}/)?.[0] ?? "";
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
            <p className="mt-1 text-xs font-medium text-[var(--text-muted)] sm:text-sm">
              Ngày báo cáo: {reportDateLabel} · Dữ liệu tính từ DATA A:M và báo cáo worker đã gửi đến ngày này.
            </p>
          </div>
          <DashboardExportButton
            className="min-h-9 justify-self-start px-3 py-2 text-xs"
            dashboard={dashboard}
            reportDateLabel={reportDateLabel}
          />
        </div>
        <ExecutiveBoard dashboard={dashboard} reportDateLabel={reportDateLabel} />
      </header>

      <section className="grid min-w-0 items-stretch gap-3 xl:grid-cols-[minmax(340px,2fr)_minmax(0,3fr)]">
        <OverallPie executive={dashboard.executive} reportYear={reportYear} row={dashboard.overall} />
        <UnitProgressDotPlot
          data={dashboard.byOwnerUnit}
          subtitle="Vị trí ô vuông là % hoàn thành; số bên phải cho biết khối lượng đã làm trên tổng kế hoạch."
          title="Vị thế tiến độ theo đơn vị chủ quản"
        />
      </section>

      <section className="grid min-w-0 items-stretch gap-3 xl:grid-cols-2">
        <UnitLeadChart
          data={dashboard.byOwnerUnitAndLead}
          leadNames={dashboard.leadNames}
          title="Ma trận tiến độ đơn vị × nhóm trưởng"
        />
        <LeadStatusChart data={dashboard.leadStatus} />
      </section>

      <section className="glass-card min-w-0 rounded-[var(--radius-card)] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            subtitle="Phân tích sâu theo prefix Resource Names. Mỗi card chỉ hiện Top resource còn khối lượng lớn."
            title="Chi tiết theo phân nhóm resource"
          />
          <span className="rounded-[var(--radius-field)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] ring-1 ring-[var(--border)]">
            Chi tiết kỹ thuật
          </span>
        </div>
        <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {dashboard.resourceGroups.map((group) => (
            <ResourceGroupChart group={group} key={group.key} />
          ))}
        </div>
      </section>

      <DeferredDashboardNotice />
    </section>
  );
};

const ExecutiveBoard = ({
  dashboard,
  reportDateLabel
}: {
  readonly dashboard: ExcelDashboardData;
  readonly reportDateLabel: string;
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
          note={`${formatNumber(executive.submittedWorkers)}/${formatNumber(executive.totalWorkers)} người trong ngày`}
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

      <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <ExecutiveInsight dashboard={dashboard} reportDateLabel={reportDateLabel} />
        <AttentionOwnerUnits rows={dashboard.attentionOwnerUnits} />
        <AttentionLeads rows={dashboard.attentionLeads} />
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
  dashboard,
  reportDateLabel
}: {
  readonly dashboard: ExcelDashboardData;
  readonly reportDateLabel: string;
}): React.ReactElement => {
  const { executive, overall } = dashboard;
  const hasUpdates = executive.updatedTasks > 0;
  const title = hasUpdates ? "Tình hình điều hành" : "Chưa có cập nhật tiến độ";
  const message = hasUpdates
    ? `Đã ghi nhận ${formatNumber(executive.updatedTasks)} hạng mục có tiến độ đến ${reportDateLabel}. Tiến độ quy đổi toàn tổ đạt ${overall.percent}%.`
    : `Dashboard đang phản ánh kế hoạch gốc: ${formatNumber(executive.activeTasks)} hạng mục chưa có record tiến độ. Khi worker bấm Cập nhật, khu vực này sẽ tự chuyển sang báo cáo điều hành.`;

  return (
    <section className="rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4 ring-1 ring-[var(--border)]">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-field)] ring-1",
            hasUpdates
              ? "bg-[var(--primary-soft)] text-[var(--primary-strong)] ring-[var(--primary-soft)]"
              : "bg-[var(--accent-soft)] text-[var(--accent-strong)] ring-[var(--accent-soft)]"
          )}
        >
          <Icon name={hasUpdates ? "shield" : "bell"} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-sm font-medium leading-6 text-[var(--text-muted)]">{message}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <MiniStat label="Tổng active" value={executive.activeTasks} />
        <MiniStat label="Hoàn thành" value={executive.completedTasks} />
        <MiniStat label="Hủy" value={executive.cancelledTasks} />
      </div>
    </section>
  );
};

const MiniStat = ({
  label,
  value
}: {
  readonly label: string;
  readonly value: number;
}): React.ReactElement => (
  <div className="rounded-[var(--radius-field)] bg-[var(--surface)] px-3 py-2 ring-1 ring-[var(--border)]">
    <p className="text-[10px] font-normal uppercase text-[var(--text-soft)]">{label}</p>
    <p className="mt-1 text-lg font-semibold tabular-nums">{formatNumber(value)}</p>
  </div>
);

const AttentionOwnerUnits = ({
  rows
}: {
  readonly rows: readonly CompletionRow[];
}): React.ReactElement => (
  <AttentionCard
    emptyText="Tất cả đơn vị đã hoàn thành."
    rows={rows}
    title="Đơn vị cần ưu tiên"
  >
    {(row) => (
      <AttentionRow
        key={row.name}
        label={row.name}
        meta={`${formatNumber(row.remaining)} còn lại · ${row.percent}% hoàn thành`}
        percent={row.percent}
      />
    )}
  </AttentionCard>
);

const AttentionLeads = ({
  rows
}: {
  readonly rows: readonly LeadStatusRow[];
}): React.ReactElement => (
  <AttentionCard
    emptyText="Không còn nhóm nào cần bám tiến độ."
    rows={rows}
    title="Nhóm cần bám"
  >
    {(row) => {
      const open = row.notStarted + row.inProgress;
      const percent = row.total === 0 ? 0 : Math.round((row.completed / row.total) * 100);
      return (
        <AttentionRow
          key={row.name}
          label={row.name}
          meta={`${formatNumber(open)} chưa xong · ${formatNumber(row.completed)} hoàn thành`}
          percent={percent}
        />
      );
    }}
  </AttentionCard>
);

const AttentionCard = <T,>({
  children,
  emptyText,
  rows,
  title
}: {
  readonly children: (row: T) => React.ReactNode;
  readonly emptyText: string;
  readonly rows: readonly T[];
  readonly title: string;
}): React.ReactElement => (
  <section className="rounded-[var(--radius-card)] bg-[var(--surface)] p-4 ring-1 ring-[var(--border)]">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <Badge tone="accent">Top {Math.min(rows.length, 5)}</Badge>
    </div>
    {rows.length > 0 ? (
      <div className="mt-3 grid gap-2">{rows.slice(0, 5).map((row) => children(row))}</div>
    ) : (
      <p className="mt-3 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 text-sm font-medium text-[var(--text-muted)]">
        {emptyText}
      </p>
    )}
  </section>
);

const AttentionRow = ({
  label,
  meta,
  percent
}: {
  readonly label: string;
  readonly meta: string;
  readonly percent: number;
}): React.ReactElement => (
  <div className="min-w-0 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-[var(--text-muted)]">{meta}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--accent-strong)]">
        {percent}%
      </span>
    </div>
    {percent > 0 ? <MiniProgressBar percent={percent} /> : null}
  </div>
);

const MiniProgressBar = ({ percent }: { readonly percent: number }): React.ReactElement => (
  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
    <div
      className="h-full rounded-full bg-[var(--primary-strong)]"
      style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
    />
  </div>
);

const ChartShell = ({
  children,
  subtitle,
  title
}: {
  readonly children: React.ReactNode;
  readonly subtitle: string;
  readonly title: string;
}): React.ReactElement => {
  return (
    <section className="glass-card flex h-full min-w-0 flex-col rounded-[var(--radius-card)] p-4">
      <div className="border-b border-[var(--line)] pb-2">
        <SectionTitle subtitle={subtitle} title={title} />
      </div>
      {children}
    </section>
  );
};

const SectionTitle = ({
  subtitle,
  title
}: {
  readonly subtitle: string;
  readonly title: string;
}): React.ReactElement => (
  <div className="flex min-w-0 items-start gap-3">
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-field)] bg-[var(--info-soft)] text-[var(--info-strong)]">
      <Icon name="chart" />
    </span>
    <div className="min-w-0">
      <h2 className="text-balance text-base font-semibold leading-6 sm:text-lg">
        {title}
      </h2>
      <p className="mt-0.5 text-sm font-normal leading-5 text-[var(--text-muted)]">{subtitle}</p>
    </div>
  </div>
);

const OverallPie = ({
  executive,
  reportYear,
  row
}: {
  readonly executive: ExcelDashboardData["executive"];
  readonly reportYear: string;
  readonly row: CompletionRow;
}): React.ReactElement => {
  if (row.total <= 0) {
    return (
      <EmptyChart
        subtitle="Chưa có hạng mục để tính tiến độ tổng."
        title={`Tiến độ BDTT ${reportYear} · Tổ TB ĐL&ĐK`}
      />
    );
  }
  const chartData = [
    { name: "Đã thực hiện", value: row.done },
    { name: "Còn lại", value: row.remaining }
  ];
  return (
    <ChartShell
      subtitle={`${formatNumber(row.total)} hạng mục · ${formatNumber(executive.updatedTasks)} hạng mục đã có cập nhật`}
      title={`Tiến độ BDTT ${reportYear} · Tổ TB ĐL&ĐK`}
    >
      <div className="flex flex-1 items-center justify-center pt-3">
        <div
          aria-label={`Tiến độ hoàn thành trung bình ${row.percent}%`}
          className="grid h-[260px] w-full grid-rows-[minmax(0,1fr)_auto] px-2"
          role="img"
        >
          <div className="relative min-h-0">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  cx="50%"
                  cy="88%"
                  data={chartData}
                  dataKey="value"
                  endAngle={0}
                  innerRadius={58}
                  nameKey="name"
                  outerRadius={84}
                  paddingAngle={0}
                  startAngle={180}
                  stroke="var(--card)"
                  strokeWidth={3}
                >
                  <Cell fill={doneFill} fillOpacity={1} />
                  <Cell fill={remainingFill} fillOpacity={0.92} />
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [formatNumber(Number(value)), "Hạng mục quy đổi"]}
                  itemStyle={tooltipItemStyle}
                  labelStyle={tooltipLabelStyle}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 text-center">
              <p className="font-mono text-3xl font-semibold tabular-nums">{row.percent}%</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Hoàn thành TB
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-[var(--line)] pt-2 text-xs font-medium text-[var(--foreground)]">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-3 rounded-full bg-[var(--chart-done-strong)]" />
              Đã thực hiện
            </span>
            <span className="inline-flex items-center justify-end gap-2">
              <span aria-hidden="true" className="h-2.5 w-3 rounded-full bg-[var(--chart-remaining-strong)]" />
              Còn lại
            </span>
          </div>
        </div>
      </div>
    </ChartShell>
  );
};

const UnitProgressDotPlot = ({
  data,
  subtitle,
  title
}: {
  readonly data: readonly CompletionRow[];
  readonly subtitle: string;
  readonly title: string;
}): React.ReactElement => {
  const rows = data.filter((row) => row.total > 0).slice(0, 10);
  if (rows.length === 0) return <EmptyChart subtitle={subtitle} title={title} />;

  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const done = rows.reduce((sum, row) => sum + row.done, 0);
  const overallPercent = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <ChartShell subtitle={subtitle} title={title}>
      <div
        aria-label={`So sánh phần trăm hoàn thành của ${rows.length} đơn vị. Mức hoàn thành chung là ${overallPercent}%.`}
        className="mt-3 min-w-0"
        role="img"
      >
        <div className="grid grid-cols-[minmax(5rem,1fr)_minmax(9rem,3fr)_auto] items-end gap-3 border-b border-[var(--line)] pb-2 text-xs font-medium text-[var(--text-muted)]">
          <span>Đơn vị</span>
          <div className="grid grid-cols-5 font-mono tabular-nums">
            {[0, 25, 50, 75, 100].map((tick) => (
              <span
                className={tick === 100 ? "text-right" : tick === 0 ? "text-left" : "text-center"}
                key={tick}
              >
                {tick}%
              </span>
            ))}
          </div>
          <span className="text-right">Đã làm/Tổng</span>
        </div>

        <div className="divide-y divide-[var(--line-soft)]">
          {rows.map((row) => {
            const markerPosition = Math.max(1, Math.min(99, row.percent));
            return (
              <div
                className="grid min-h-11 grid-cols-[minmax(5rem,1fr)_minmax(9rem,3fr)_auto] items-center gap-3 py-2"
                key={row.name}
              >
                <span className="min-w-0 break-words text-sm font-semibold leading-5">
                  {row.name}
                </span>
                <div className="relative h-7" title={`${row.name}: ${row.percent}%`}>
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--border-strong)]" />
                  {[0, 25, 50, 75, 100].map((tick) => (
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-[var(--chart-grid)]"
                      key={tick}
                      style={{ left: `${tick}%` }}
                    />
                  ))}
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--surface)] bg-[var(--chart-primary)] ring-1 ring-[var(--border-strong)]"
                    style={{ left: `${markerPosition}%` }}
                  />
                  <span
                    className="absolute -top-1 -translate-x-1/2 bg-[var(--surface)] px-1 font-mono text-xs font-semibold tabular-nums text-[var(--foreground)]"
                    style={{ left: `${markerPosition}%` }}
                  >
                    {row.percent}%
                  </span>
                </div>
                <span className="min-w-[4.75rem] text-right font-mono text-xs font-semibold tabular-nums text-[var(--foreground)]">
                  {formatNumber(row.done)}/{formatNumber(row.total)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-2 text-xs text-[var(--text-muted)]">
          <span>Ô vuông = vị trí % hoàn thành của từng đơn vị</span>
          <span className="font-mono font-semibold tabular-nums text-[var(--foreground)]">
            Toàn tổ: {overallPercent}%
          </span>
        </div>
      </div>
    </ChartShell>
  );
};

const CompletionChart = ({
  compact = false,
  data,
  showLegend = true,
  subtitle,
  title
}: {
  readonly compact?: boolean;
  readonly data: readonly CompletionRow[];
  readonly showLegend?: boolean;
  readonly subtitle: string;
  readonly title: string;
}): React.ReactElement => {
  if (data.length === 0 || !data.some((row) => row.total > 0)) {
    return <EmptyChart subtitle={subtitle} title={title} />;
  }
  const chartRows = [...data].slice(0, compact ? 5 : 10);
  if (compact) {
    return <CompactCompletionBars rows={chartRows} subtitle={subtitle} title={title} />;
  }
  const categoryAxisWidth = getCategoryAxisWidth(chartRows.map((row) => row.name));

  return (
    <ChartShell subtitle={subtitle} title={title}>
      <div className="mt-3 h-[260px] min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap={8}
            data={chartRows}
            layout="vertical"
            margin={{ bottom: 8, left: 4, right: 32, top: 4 }}
          >
            <CartesianGrid {...softGridProps} horizontal={false} />
            <XAxis
              {...softAxisProps}
              tickMargin={8}
              tickFormatter={(value) => formatNumber(Number(value))}
              type="number"
            />
            <YAxis
              {...categoryAxisProps}
              dataKey="name"
              tickFormatter={formatAxisName}
              tickMargin={8}
              type="category"
              width={categoryAxisWidth}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [formatNumber(Number(value)), ""]}
              itemStyle={tooltipItemStyle}
              labelFormatter={formatAxisName}
              labelStyle={tooltipLabelStyle}
            />
            {showLegend ? <Legend iconSize={10} iconType="square" wrapperStyle={legendTextStyle} /> : null}
            <Bar
              barSize={12}
              dataKey="done"
              fill={doneFill}
              fillOpacity={0.98}
              name="Đã thực hiện"
              radius={[6, 0, 0, 6]}
              stackId="a"
            />
            <Bar
              barSize={12}
              dataKey="remaining"
              fill={remainingFill}
              fillOpacity={0.84}
              name="Còn lại"
              radius={[0, 6, 6, 0]}
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
};

const CompactCompletionBars = ({
  rows,
  subtitle,
  title
}: {
  readonly rows: readonly CompletionRow[];
  readonly subtitle: string;
  readonly title: string;
}): React.ReactElement => {
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));

  return (
    <ChartShell subtitle={subtitle} title={title}>
      <div className="mt-3 divide-y divide-[var(--line-soft)] border-y border-[var(--line)]">
        {rows.map((row) => {
          const totalWidth = `${Math.max(10, (row.total / maxTotal) * 100)}%`;
          const doneWidth = row.total === 0 ? "0%" : `${(row.done / row.total) * 100}%`;

          return (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5" key={row.name}>
              <div className="min-w-0">
                <p className="min-w-0 text-sm font-semibold leading-5 text-[var(--foreground)] [overflow-wrap:anywhere]">
                  {row.name}
                </p>
                <p className="mt-0.5 text-xs font-medium leading-5 text-[var(--text-muted)]">
                  {formatNumber(row.done)} đã thực hiện · {formatNumber(row.remaining)} còn lại · tổng {formatNumber(row.total)}
                </p>
              </div>
              <div className="grid w-28 shrink-0 grid-cols-[1fr_auto] items-center gap-2">
                <div
                  aria-label={`${row.name}: ${formatNumber(row.done)} đã thực hiện, ${formatNumber(row.remaining)} còn lại, ${row.percent}% hoàn thành`}
                  className="h-2 overflow-hidden rounded-full bg-[var(--line)]"
                  role="img"
                >
                  <div
                    className="h-full max-w-full overflow-hidden rounded-full bg-[var(--chart-remaining-soft)]"
                    style={{ width: totalWidth }}
                  >
                    <div
                      className="h-full rounded-full bg-[var(--chart-done-strong)]"
                      style={{ width: doneWidth }}
                    />
                  </div>
                </div>
                <span className="min-w-9 text-right text-xs font-semibold tabular-nums text-[var(--foreground)]">
                  {row.percent}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </ChartShell>
  );
};

const UnitLeadChart = ({
  data,
  leadNames,
  title
}: {
  readonly data: readonly UnitLeadRow[];
  readonly leadNames: readonly string[];
  readonly title: string;
}): React.ReactElement => {
  const visibleLeads = leadNames.slice(0, 4);
  const rows = data
    .filter((row) => visibleLeads.some((lead) => (row.totals[lead] ?? 0) > 0))
    .slice(0, 10);
  if (rows.length === 0 || visibleLeads.length === 0) {
    return (
      <EmptyChart
        subtitle="Chưa có phân công theo đơn vị và nhóm trưởng để lập ma trận."
        title={title}
      />
    );
  }
  const desktopGridClass =
    visibleLeads.length === 1
      ? "md:grid-cols-[minmax(8rem,1.15fr)_minmax(7rem,4fr)]"
      : visibleLeads.length === 2
        ? "md:grid-cols-[minmax(8rem,1.15fr)_repeat(2,minmax(7rem,1fr))]"
        : visibleLeads.length === 3
          ? "md:grid-cols-[minmax(8rem,1.15fr)_repeat(3,minmax(7rem,1fr))]"
          : "md:grid-cols-[minmax(8rem,1.15fr)_repeat(4,minmax(7rem,1fr))]";

  return (
    <ChartShell
      subtitle="Mỗi ô là % hoàn thành trong đúng cụm đơn vị–nhóm trưởng; số nhỏ là lượng task được tính."
      title={title}
    >
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-y border-[var(--line)] py-2 text-xs text-[var(--text-muted)]">
        <HeatLegend className="bg-[var(--danger-soft)]" label="1–24%" />
        <HeatLegend className="bg-[var(--warning-soft)]" label="25–49%" />
        <HeatLegend className="bg-[var(--info-soft)]" label="50–74%" />
        <HeatLegend className="bg-[var(--primary-soft)]" label="75–99%" />
        <HeatLegend className="bg-[var(--success-soft)]" label="100%" />
      </div>

      <div
        aria-label={`Ma trận tiến độ gồm ${rows.length} đơn vị và ${visibleLeads.length} nhóm trưởng.`}
        className="mt-3"
        role="table"
      >
        <div className={cn("hidden border-b border-[var(--line)] md:grid", desktopGridClass)} role="row">
          <div className="p-2 text-xs font-semibold uppercase text-[var(--text-muted)]" role="columnheader">
            Đơn vị
          </div>
          {visibleLeads.map((lead) => (
            <div
              className="min-w-0 break-words border-l border-[var(--line)] p-2 text-xs font-semibold leading-5 text-[var(--foreground)]"
              key={lead}
              role="columnheader"
            >
              {normalizeChartLabel(lead)}
            </div>
          ))}
        </div>

        <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
          {rows.map((row) => (
            <div
              className={cn("grid grid-cols-2 gap-2 py-3 md:gap-0 md:py-0", desktopGridClass)}
              key={row.name}
              role="row"
            >
              <div
                className="col-span-2 min-w-0 break-words text-sm font-semibold leading-5 md:col-span-1 md:flex md:items-center md:p-2"
                role="rowheader"
              >
                {row.name}
              </div>
              {visibleLeads.map((lead) => {
                const taskCount = row.totals[lead] ?? 0;
                const percent = row.values[lead] ?? 0;
                return (
                  <div
                    className={cn(
                      "min-h-14 min-w-0 border-l-4 p-2 md:flex md:min-h-16 md:flex-col md:justify-center md:border-b-0 md:border-l md:border-[var(--line)]",
                      taskCount === 0
                        ? "border-l-[var(--line)] bg-[var(--surface-muted)] text-[var(--text-muted)]"
                        : getHeatCellClass(percent)
                    )}
                    key={lead}
                    role="cell"
                    title={`${normalizeChartLabel(lead)} · ${row.name}: ${percent}% trên ${taskCount} task`}
                  >
                    <span className="block break-words text-xs font-medium leading-4 md:hidden">
                      {normalizeChartLabel(lead)}
                    </span>
                    {taskCount > 0 ? (
                      <>
                        <strong className="mt-1 block font-mono text-base font-semibold tabular-nums md:mt-0">
                          {percent}%
                        </strong>
                        <span className="block text-xs font-medium opacity-80">
                          {formatNumber(taskCount)} task
                        </span>
                      </>
                    ) : (
                      <span className="mt-1 block text-sm md:mt-0">Không phân công</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </ChartShell>
  );
};

const HeatLegend = ({
  className,
  label
}: {
  readonly className: string;
  readonly label: string;
}): React.ReactElement => (
  <span className="inline-flex items-center gap-1.5">
    <span aria-hidden="true" className={cn("h-3 w-3 rounded-[0.25rem] border border-[var(--border-strong)]", className)} />
    {label}
  </span>
);

const getHeatCellClass = (percent: number): string => {
  if (percent >= 100) {
    return "border-l-[var(--success-strong)] bg-[var(--success-soft)] text-[var(--success-strong)]";
  }
  if (percent >= 75) {
    return "border-l-[var(--primary-strong)] bg-[var(--primary-soft)] text-[var(--primary-strong)]";
  }
  if (percent >= 50) {
    return "border-l-[var(--info-strong)] bg-[var(--info-soft)] text-[var(--info-strong)]";
  }
  if (percent >= 25) {
    return "border-l-[var(--warning-strong)] bg-[var(--warning-soft)] text-[var(--warning-strong)]";
  }
  if (percent > 0) {
    return "border-l-[var(--danger-strong)] bg-[var(--danger-soft)] text-[var(--danger-strong)]";
  }
  return "border-l-[var(--border-strong)] bg-[var(--surface-muted)] text-[var(--foreground)]";
};

const LeadStatusChart = ({
  data
}: {
  readonly data: readonly LeadStatusRow[];
}): React.ReactElement => {
  const hasSignal = data.some(
    (row) => row.completed + row.inProgress + row.cancelled + row.notStarted > 0
  );
  if (data.length === 0 || !hasSignal) {
    return (
      <EmptyChart
        subtitle="Chưa có hạng mục để thống kê trạng thái theo nhóm trưởng."
        title="Thống kê tiến độ theo các nhóm"
      />
    );
  }
  const visibleRows = data.slice(0, 10);
  const categoryAxisWidth = getCategoryAxisWidth(
    visibleRows.map((row) => row.name),
    132
  );
  return (
    <ChartShell
      subtitle="Cơ cấu trạng thái theo nhóm trưởng: vàng đất là chưa thực hiện, xanh lam là đang thực hiện, xanh lá là hoàn thành."
      title="Thống kê tiến độ theo các nhóm"
    >
      <div className="mt-3 h-[280px] min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap={8}
            data={visibleRows}
            layout="vertical"
            margin={{ bottom: 8, left: 4, right: 32, top: 4 }}
          >
            <CartesianGrid {...softGridProps} horizontal={false} />
            <XAxis {...softAxisProps} allowDecimals={false} tickMargin={8} type="number" />
            <YAxis
              {...categoryAxisProps}
              dataKey="name"
              tickFormatter={formatAxisName}
              tickMargin={8}
              type="category"
              width={categoryAxisWidth}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={tooltipItemStyle}
              labelFormatter={formatAxisName}
              labelStyle={tooltipLabelStyle}
            />
            <Legend iconSize={10} iconType="square" wrapperStyle={compactLegendTextStyle} />
            <Bar
              barSize={14}
              dataKey="completed"
              fill={statusColors.completed}
              fillOpacity={0.96}
              name="Hoàn thành"
              radius={[6, 0, 0, 6]}
              stackId="a"
            />
            <Bar
              barSize={14}
              dataKey="inProgress"
              fill={statusColors.inProgress}
              fillOpacity={0.96}
              name="Đang thực hiện"
              stackId="a"
            />
            <Bar
              barSize={14}
              dataKey="cancelled"
              fill={statusColors.cancelled}
              fillOpacity={0.96}
              name="Hủy"
              stackId="a"
            />
            <Bar
              barSize={14}
              dataKey="notStarted"
              fill={statusColors.notStarted}
              fillOpacity={0.92}
              name="Chưa thực hiện"
              radius={[0, 6, 6, 0]}
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
};

const ResourceGroupChart = ({
  group
}: {
  readonly group: ResourceGroupDashboard;
}): React.ReactElement => {
  return (
    <CompletionChart
      compact
      data={group.rows}
      showLegend={false}
      subtitle={
        group.rows.length === 0
          ? "Chưa có hạng mục thuộc nhóm này trong dữ liệu hiện tại."
          : `${group.key} · Top ${Math.min(group.rows.length, 5)} resource còn khối lượng lớn`
      }
      title={group.title}
    />
  );
};

const EmptyChart = ({
  subtitle,
  title
}: {
  readonly subtitle: string;
  readonly title: string;
}): React.ReactElement => (
  <ChartShell subtitle={subtitle} title={title}>
    <div className="mt-4 flex min-h-[260px] flex-1 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--line)] bg-[var(--surface-muted)] p-4 text-center text-sm font-medium text-[var(--text-muted)]">
      Không có dữ liệu đủ ý nghĩa để hiển thị chart.
    </div>
  </ChartShell>
);

const DeferredDashboardNotice = (): React.ReactElement => {
  return (
    <section className="rounded-[var(--radius-card)] border border-dashed border-[var(--line)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold">Các chart milestone/VOTTING cần thêm dữ liệu nguồn</h2>
      <p className="mt-1 text-xs font-medium leading-5 text-[var(--text-muted)]">
        Đợt này bỏ qua BDSC Van ĐK, BDSC Máy động, Sheet1!A2:C7 và bảng VOTTING vì app hiện chỉ có DATA A:M cùng progress worker.
      </p>
    </section>
  );
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
};
