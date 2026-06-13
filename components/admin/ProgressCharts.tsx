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
import type {
  CompletionRow,
  LeadStatusRow,
  PhaseOneDashboardData,
  ResourceGroupDashboard,
  UnitLeadRow
} from "@/lib/dashboard";

const colors = ["#6fa51f", "#4a90d9", "#f2a24a", "#df5b3a"];
const statusColors = {
  completed: "#6fa51f",
  inProgress: "#e0852f",
  cancelled: "#df5b3a",
  notStarted: "#a6a69e"
} as const;
const pieRemainingFill = "#e6e6e2";

export const ProgressCharts = ({
  dashboard,
  reportDateLabel
}: {
  readonly dashboard: PhaseOneDashboardData;
  readonly reportDateLabel: string;
}): React.ReactElement => {
  return (
    <section className="grid gap-5">
      <div className="glass-card p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[var(--primary)]">
              Dashboard báo cáo
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Báo cáo ngắn tiến độ BDTT 2025
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Bố cục theo tab DASH BOARD Excel, dữ liệu tính trực tiếp từ app ngày {reportDateLabel}.
            </p>
          </div>
          <DashboardExportButton dashboard={dashboard} reportDateLabel={reportDateLabel} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <OverallPie row={dashboard.overall} />
        <CompletionChart
          data={dashboard.byUnit}
          title="Thống kê tiến độ theo đơn vị chủ quản"
        />
      </div>

      <UnitLeadChart
        data={dashboard.bySectionAndLead}
        leadNames={dashboard.leadNames}
        title="Thống kê tiến độ theo đơn vị chủ quản và theo cụm"
      />

      <LeadStatusChart data={dashboard.byLeadStatus} />

      <section className="glass-card p-5">
        <h2 className="text-xl font-semibold">Chi tiết theo phân nhóm resource</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Tương ứng cụm chart resource trong DASH BOARD: HTĐK, TBCH, AMLL, BENT, NHIỆT, PI, TLTBĐK.
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {dashboard.resourceGroups.map((group) => (
            <ResourceGroupChart group={group} key={group.key} />
          ))}
        </div>
      </section>

      <DeferredDashboardNotice />
    </section>
  );
};

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
    <section className="glass-card p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
      {children}
    </section>
  );
};

const OverallPie = ({ row }: { readonly row: CompletionRow }): React.ReactElement => {
  const chartData = [
    { name: "Đã thực hiện", value: row.done },
    { name: "Còn lại", value: row.remaining }
  ];
  return (
    <ChartShell
      subtitle={`${row.total} hạng mục, hoàn thành trung bình ${row.percent}%`}
      title="Tiến độ BDTT 2025"
    >
      <div className="h-[360px]">
        <ResponsiveContainer height="100%" width="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius={72}
              nameKey="name"
              outerRadius={118}
              paddingAngle={2}
            >
              <Cell fill="#6fa51f" />
              <Cell fill={pieRemainingFill} />
            </Pie>
            <Tooltip formatter={(value) => [formatNumber(Number(value)), "Hạng mục"]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
};

const CompletionChart = ({
  data,
  title
}: {
  readonly data: readonly CompletionRow[];
  readonly title: string;
}): React.ReactElement => {
  return (
    <ChartShell
      subtitle="Series Đã thực hiện / Còn lại tương đương Excel Pivot"
      title={title}
    >
      <div className="h-[420px]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={[...data].slice(0, 12)} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid stroke="rgba(24,24,24,0.06)" strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" tick={{ fontSize: 12 }} type="category" width={130} />
            <Tooltip formatter={(value) => [formatNumber(Number(value)), ""]} />
            <Legend />
            <Bar dataKey="done" fill="#6fa51f" name="Đã thực hiện" stackId="a" />
            <Bar dataKey="remaining" fill={pieRemainingFill} name="Còn lại" stackId="a" />
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
  return (
    <ChartShell
      subtitle="Average %Complete theo Section/Cụm và nhóm trưởng, tương ứng vùng Pivot A91:E100"
      title={title}
    >
      <div className="h-[520px]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={rows} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid stroke="rgba(24,24,24,0.06)" strokeDasharray="3 3" />
            <XAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} type="number" />
            <YAxis dataKey="name" tick={{ fontSize: 12 }} type="category" width={130} />
            <Tooltip formatter={(value) => [`${value}%`, ""]} />
            <Legend />
            {leadNames.slice(0, 4).map((lead, index) => (
              <Bar dataKey={lead} fill={colors[index % colors.length]} key={lead} name={lead} />
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
  return (
    <ChartShell
      subtitle="Hoàn thành / Đang thực hiện / Cancel / Chưa thực hiện theo nhóm trưởng"
      title="Thống kê tiến độ theo các nhóm"
    >
      <div className="h-[420px]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid stroke="rgba(24,24,24,0.06)" strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" tick={{ fontSize: 12 }} type="category" width={170} />
            <Tooltip />
            <Legend />
            <Bar dataKey="completed" fill={statusColors.completed} name="Hoàn thành" stackId="a" />
            <Bar dataKey="inProgress" fill={statusColors.inProgress} name="Đang thực hiện" stackId="a" />
            <Bar dataKey="cancelled" fill={statusColors.cancelled} name="Cancel" stackId="a" />
            <Bar dataKey="notStarted" fill={statusColors.notStarted} name="Chưa thực hiện" stackId="a" />
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
  if (group.rows.length === 0) {
    return (
      <ChartShell subtitle="Chưa có hạng mục thuộc nhóm này trong dữ liệu hiện tại" title={group.title}>
        <div className="mt-4 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)] ring-1 ring-[var(--border)]">
          Không có dữ liệu để hiển thị.
        </div>
      </ChartShell>
    );
  }
  return <CompletionChart data={group.rows} title={group.title} />;
};

const DeferredDashboardNotice = (): React.ReactElement => {
  const items = [
    "BDSC máy động milestone 0/0.3/0.5/0.9",
    "BDSC Van ĐK / Hữu Văn Cưng milestone",
    "Chart phụ từ Sheet1!A2:C7",
    "Hai bảng VOTTING cuối dashboard"
  ];
  return (
    <section className="glass-card border-dashed p-5">
      <h2 className="text-lg font-semibold">Dashboard sẽ bổ sung ở giai đoạn sau</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">
        Các phần này không render giả vì hiện chưa có đủ trường dữ liệu trong DATA A:M.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            className="rounded-full bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text-muted)] ring-1 ring-[var(--border)]"
            key={item}
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);
};
