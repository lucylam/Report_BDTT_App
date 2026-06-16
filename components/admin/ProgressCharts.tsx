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
import { Icon, type IconName } from "@/components/ui";
import type {
  CompletionRow,
  ExcelDashboardData,
  LeadStatusRow,
  ResourceGroupDashboard,
  UnitLeadRow
} from "@/lib/dashboard";
import { cn } from "@/lib/ui";

const seriesColors = [
  "var(--chart-primary)",
  "var(--chart-info)",
  "var(--chart-accent)",
  "var(--chart-danger)"
];
const statusColors = {
  completed: "var(--chart-primary)",
  inProgress: "var(--chart-accent)",
  cancelled: "var(--chart-danger)",
  notStarted: "var(--chart-muted)"
} as const;
const doneFill = "var(--chart-done-strong)";
const remainingFill = "var(--chart-remaining-strong)";
const gridStroke = "var(--chart-grid)";
const softGridProps = {
  stroke: gridStroke,
  strokeDasharray: "2 6",
  strokeOpacity: 0.42
};
const softAxisProps = {
  axisLine: { stroke: gridStroke, strokeOpacity: 0.5 },
  tick: { fill: "var(--text-muted)", fontSize: 11 },
  tickLine: false
} as const;
const tooltipStyle = {
  backgroundColor: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  boxShadow: "var(--shadow-soft-sm)"
} as const;

type MetricTone = "attention" | "done" | "neutral" | "progress" | "remaining" | "worker";

const metricToneClasses: Record<MetricTone, string> = {
  attention: "text-[var(--accent-strong)]",
  done: "text-[var(--success)]",
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
  return (
    <section className="grid min-w-0 gap-3" data-dashboard-export-root>
      <header className="glass-card overflow-hidden p-0">
        <div className="grid gap-3 border-b border-[var(--line)] bg-[var(--surface-muted)] px-4 py-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary-strong)]">
              DASH BOARD Excel
            </p>
            <h2 className="mt-1.5 text-balance text-base font-semibold tracking-tight sm:text-xl">
              BÁO CÁO NGẮN TIẾN ĐỘ BDTT 2025 TỔ TB ĐL&ĐK
            </h2>
            <p className="mt-1 text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
              Ngày báo cáo: {reportDateLabel} · Dữ liệu tính từ DATA A:M và báo cáo worker đã gửi đến ngày này.
            </p>
          </div>
          <DashboardExportButton className="min-h-9 justify-self-start px-3 py-2 text-xs" />
        </div>
        <ExecutiveBoard dashboard={dashboard} reportDateLabel={reportDateLabel} />
      </header>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(250px,0.55fr)_minmax(0,1.45fr)]">
        <OverallPie executive={dashboard.executive} row={dashboard.overall} />
        <CompletionChart
          data={dashboard.byOwnerUnit}
          subtitle="Khối lượng quy đổi theo Đơn vị chủ quản. Xanh là đã thực hiện, xám là phần còn lại."
          title="THỐNG KÊ TIẾN ĐỘ THEO ĐƠN VỊ CHỦ QUẢN"
        />
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-2">
        <UnitLeadChart
          data={dashboard.byOwnerUnitAndLead}
          leadNames={dashboard.leadNames}
          title="THỐNG KÊ % HOÀN THÀNH THEO ĐƠN VỊ VÀ NHÓM TRƯỞNG"
        />
        <LeadStatusChart data={dashboard.leadStatus} />
      </section>

      <section className="glass-card min-w-0 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            subtitle="Phân tích sâu theo prefix Resource Names. Mỗi card chỉ hiện Top resource còn khối lượng lớn."
            title="CHI TIẾT THEO PHÂN NHÓM RESOURCE"
          />
          <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">
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
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
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
          label="Worker báo cáo"
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
    <Icon name={metricIcons[tone]} />
    <p className="mt-3 truncate text-[11px] font-semibold uppercase text-[var(--text-soft)]">
      {label}
    </p>
    <p className="mt-1 text-3xl font-semibold leading-none tabular-nums">{value}</p>
    <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[var(--text-muted)]">
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
          <p className="mt-1 text-sm font-semibold leading-6 text-[var(--text-muted)]">{message}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
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
    <p className="text-[10px] uppercase text-[var(--text-soft)]">{label}</p>
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
      <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-strong)]">
        Top {Math.min(rows.length, 5)}
      </span>
    </div>
    {rows.length > 0 ? (
      <div className="mt-3 grid gap-2">{rows.slice(0, 5).map((row) => children(row))}</div>
    ) : (
      <p className="mt-3 rounded-[var(--radius-field)] bg-[var(--surface-muted)] p-3 text-sm font-semibold text-[var(--text-muted)]">
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
        <p className="mt-0.5 text-xs font-semibold text-[var(--text-muted)]">{meta}</p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--accent-strong)]">
        {percent}%
      </span>
    </div>
    <MiniProgressBar percent={percent} />
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
    <section className="glass-card min-w-0 p-4">
      <SectionTitle subtitle={subtitle} title={title} />
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
  <div className="min-w-0">
    <h2 className="text-balance text-sm font-semibold uppercase tracking-tight sm:text-base">
      {title}
    </h2>
    <p className="mt-0.5 text-xs font-semibold text-[var(--text-muted)] sm:text-sm">{subtitle}</p>
  </div>
);

const OverallPie = ({
  executive,
  row
}: {
  readonly executive: ExcelDashboardData["executive"];
  readonly row: CompletionRow;
}): React.ReactElement => {
  const chartData = [
    { name: "Đã thực hiện", value: row.done },
    { name: "Còn lại", value: row.remaining }
  ];
  return (
    <ChartShell
      subtitle={`${formatNumber(row.total)} hạng mục · ${formatNumber(executive.updatedTasks)} hạng mục đã có cập nhật`}
      title="TIẾN ĐỘ BDTT 2025 TỔ TB ĐL&ĐK"
    >
      <div className="relative mt-3 h-[210px] sm:h-[235px]">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius="58%"
              nameKey="name"
              outerRadius="78%"
              paddingAngle={row.done > 0 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              <Cell fill={doneFill} fillOpacity={0.96} />
              <Cell fill={remainingFill} fillOpacity={0.9} />
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [formatNumber(Number(value)), "Hạng mục quy đổi"]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center pb-6">
          <div className="text-center">
            <p className="text-3xl font-semibold tabular-nums">{row.percent}%</p>
            <p className="mt-1 text-[11px] font-semibold uppercase text-[var(--text-muted)]">
              Hoàn thành TB
            </p>
          </div>
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
  if (data.length === 0) return <EmptyChart subtitle={subtitle} title={title} />;
  const chartRows = [...data].slice(0, compact ? 5 : 10);
  return (
    <ChartShell subtitle={subtitle} title={title}>
      <div className={compact ? "mt-3 h-[165px] sm:h-[185px]" : "mt-3 h-[260px] sm:h-[300px]"}>
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap={compact ? 5 : 8}
            data={chartRows}
            layout="vertical"
            margin={{ bottom: 2, left: 0, right: 8, top: 4 }}
          >
            <CartesianGrid {...softGridProps} />
            <XAxis
              {...softAxisProps}
              tickFormatter={(value) => formatNumber(Number(value))}
              type="number"
            />
            <YAxis
              {...softAxisProps}
              dataKey="name"
              type="category"
              width={compact ? 104 : 112}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatNumber(Number(value)), ""]} />
            {showLegend ? <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /> : null}
            <Bar
              barSize={compact ? 9 : 12}
              dataKey="done"
              fill={doneFill}
              fillOpacity={0.98}
              name="Đã thực hiện"
              radius={[6, 0, 0, 6]}
              stackId="a"
            />
            <Bar
              barSize={compact ? 9 : 12}
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

const UnitLeadChart = ({
  data,
  leadNames,
  title
}: {
  readonly data: readonly UnitLeadRow[];
  readonly leadNames: readonly string[];
  readonly title: string;
}): React.ReactElement => {
  const rows = data.map((item) => ({ name: item.name, ...item.values }));
  const hasSignal = rows.some((row) =>
    leadNames.some((lead) => Number(row[lead as keyof typeof row] ?? 0) > 0)
  );
  if (rows.length === 0 || leadNames.length === 0 || !hasSignal) {
    return (
      <EmptyChart
        subtitle="Chart này chỉ hiện khi đã có ít nhất một tiến độ > 0% để so sánh nhóm trưởng."
        title={title}
      />
    );
  }
  return (
    <ChartShell
      subtitle="Average %Complete theo Đơn vị chủ quản và Nhóm trưởng, dùng để nhìn nhóm nào đang kéo tiến độ."
      title={title}
    >
      <div className="mt-3 h-[245px] sm:h-[275px]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap={8}
            data={rows.slice(0, 10)}
            layout="vertical"
            margin={{ bottom: 2, left: 0, right: 8, top: 4 }}
          >
            <CartesianGrid {...softGridProps} />
            <XAxis
              {...softAxisProps}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              type="number"
            />
            <YAxis {...softAxisProps} dataKey="name" type="category" width={112} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value}%`, ""]} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 10, lineHeight: "16px" }} />
            {leadNames.slice(0, 4).map((lead, index) => (
              <Bar
                barSize={10}
                dataKey={lead}
                fill={seriesColors[index % seriesColors.length]}
                fillOpacity={0.9}
                key={lead}
                name={lead}
                radius={[5, 5, 5, 5]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
};

const LeadStatusChart = ({
  data
}: {
  readonly data: readonly LeadStatusRow[];
}): React.ReactElement => {
  if (data.length === 0) {
    return (
      <EmptyChart
        subtitle="Chưa có hạng mục để thống kê trạng thái theo nhóm trưởng."
        title="THỐNG KÊ TIẾN ĐỘ THEO CÁC NHÓM"
      />
    );
  }
  return (
    <ChartShell
      subtitle="Stacked status theo Nhóm trưởng. Xám = chưa thực hiện, cam = đang thực hiện, xanh = hoàn thành."
      title="THỐNG KÊ TIẾN ĐỘ THEO CÁC NHÓM"
    >
      <div className="mt-3 h-[245px] sm:h-[275px]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            barCategoryGap={8}
            data={data}
            layout="vertical"
            margin={{ bottom: 2, left: 0, right: 8, top: 4 }}
          >
            <CartesianGrid {...softGridProps} />
            <XAxis {...softAxisProps} allowDecimals={false} type="number" />
            <YAxis {...softAxisProps} dataKey="name" type="category" width={148} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 10, lineHeight: "16px" }} />
            <Bar
              barSize={12}
              dataKey="completed"
              fill={statusColors.completed}
              fillOpacity={0.92}
              name="Hoàn thành"
              radius={[6, 0, 0, 6]}
              stackId="a"
            />
            <Bar
              barSize={12}
              dataKey="inProgress"
              fill={statusColors.inProgress}
              fillOpacity={0.9}
              name="Đang thực hiện"
              stackId="a"
            />
            <Bar
              barSize={12}
              dataKey="cancelled"
              fill={statusColors.cancelled}
              fillOpacity={0.88}
              name="Hủy"
              stackId="a"
            />
            <Bar
              barSize={12}
              dataKey="notStarted"
              fill={statusColors.notStarted}
              fillOpacity={0.72}
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
    <div className="mt-4 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4 text-sm font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]">
      Không có dữ liệu đủ ý nghĩa để hiển thị chart.
    </div>
  </ChartShell>
);

const DeferredDashboardNotice = (): React.ReactElement => {
  return (
    <section className="rounded-[var(--radius-card)] border border-dashed border-[var(--line)] bg-[var(--surface)] p-4">
      <h2 className="text-sm font-semibold">Các chart milestone/VOTTING cần thêm dữ liệu nguồn</h2>
      <p className="mt-1 text-xs font-semibold leading-5 text-[var(--text-muted)]">
        Đợt này bỏ qua BDSC Van ĐK, BDSC Máy động, Sheet1!A2:C7 và bảng VOTTING vì app hiện chỉ có DATA A:M cùng progress worker.
      </p>
    </section>
  );
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
};
