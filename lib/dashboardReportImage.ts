import type {
  CompletionRow,
  LeadStatusRow,
  PhaseOneDashboardData,
  ResourceGroupDashboard,
  UnitLeadRow
} from "@/lib/dashboard";
import {
  formatViNumber,
  svgCard,
  svgLegendItem,
  svgPill,
  svgText
} from "@/lib/reportSvgPrimitives";

interface ReportSvgOptions {
  readonly dashboard: PhaseOneDashboardData;
  readonly reportDateLabel: string;
}

const width = 1600;
const ink = "#171717";
const muted = "#6f716f";
const primary = "#0f5d56";
const accent = "#f3bd5b";
const success = "#287342";
const warning = "#a86512";
const danger = "#a93a3a";
const slate = "#94a3b8";

export const createDashboardReportSvg = ({
  dashboard,
  reportDateLabel
}: ReportSvgOptions): string => {
  const sections = [
    reportHeader(reportDateLabel),
    summaryPanel(dashboard.overall, dashboard.byLeadStatus),
    ownerUnitPanel(dashboard.byUnit),
    sectionLeadPanel(dashboard.bySectionAndLead, dashboard.leadNames),
    statusPanel(dashboard.byLeadStatus),
    resourcePanels(dashboard.resourceGroups)
  ];
  const body = sections.join("");
  const height = reportHeight(dashboard.resourceGroups.length);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#f7f5ef"/>`,
    `<circle cx="240" cy="-40" r="360" fill="#f3bd5b" opacity="0.16"/>`,
    body,
    footer(height),
    "</svg>"
  ].join("");
};

const reportHeight = (resourceCount: number): number => {
  const resourceRows = Math.ceil(resourceCount / 2);
  return 1040 + resourceRows * 330 + 120;
};

const reportHeader = (reportDateLabel: string): string => {
  return [
    svgText("BÁO CÁO NGẮN TIẾN ĐỘ BDTT 2025", 64, 72, 36, 800, ink),
    svgText("Tổ TB Đo lường & Điều khiển", 64, 112, 20, 600, primary),
    svgText(`Ngày báo cáo: ${reportDateLabel}`, 64, 145, 18, 500, muted),
    svgPill("Dashboard export từ dữ liệu app", 1180, 64, 300, 46, primary, "#e1f0ed")
  ].join("");
};

const summaryPanel = (overall: CompletionRow, rows: readonly LeadStatusRow[]): string => {
  const x = 48;
  const y = 180;
  const status = rows.reduce(
    (acc, row) => ({
      completed: acc.completed + row.completed,
      inProgress: acc.inProgress + row.inProgress,
      cancelled: acc.cancelled + row.cancelled,
      notStarted: acc.notStarted + row.notStarted
    }),
    { completed: 0, inProgress: 0, cancelled: 0, notStarted: 0 }
  );
  return [
    svgCard(x, y, 1504, 250),
    svgText("TIẾN ĐỘ BDTT 2025 TỔ TB ĐL&ĐK", x + 28, y + 42, 22, 800, ink),
    donut(x + 130, y + 142, 74, overall.percent, primary, "#efe7d7"),
    svgText(`${overall.percent}%`, x + 97, y + 150, 34, 800, ink),
    svgText("Hoàn thành trung bình", x + 70, y + 188, 15, 600, muted),
    metric(x + 330, y + 84, "Tổng hạng mục", formatViNumber(overall.total), primary),
    metric(x + 560, y + 84, "Đã thực hiện", formatViNumber(overall.done), success),
    metric(x + 790, y + 84, "Còn lại", formatViNumber(overall.remaining), warning),
    metric(x + 1020, y + 84, "Cancel", formatViNumber(status.cancelled), danger),
    compactStatus(x + 330, y + 175, status)
  ].join("");
};

const ownerUnitPanel = (rows: readonly CompletionRow[]): string => {
  const x = 48;
  const y = 470;
  const chartRows = rows.slice(0, 9);
  return [
    svgCard(x, y, 710, 370),
    svgText("THỐNG KÊ TIẾN ĐỘ THEO ĐƠN VỊ CHỦ QUẢN", x + 24, y + 40, 18, 800, ink),
    stackedBars(chartRows, x + 24, y + 72, 660, 270)
  ].join("");
};

const sectionLeadPanel = (
  rows: readonly UnitLeadRow[],
  leadNames: readonly string[]
): string => {
  const x = 790;
  const y = 470;
  const chartRows = rows.slice(0, 8);
  const chartLeads = leadNames.slice(0, 4);
  return [
    svgCard(x, y, 762, 370),
    svgText("THỐNG KÊ TIẾN ĐỘ THEO ĐƠN VỊ CHỦ QUẢN VÀ THEO CỤM", x + 24, y + 40, 18, 800, ink),
    groupedPercentBars(chartRows, chartLeads, x + 24, y + 74, 710, 260)
  ].join("");
};

const statusPanel = (rows: readonly LeadStatusRow[]): string => {
  const x = 48;
  const y = 880;
  return [
    svgCard(x, y, 1504, 290),
    svgText("THỐNG KÊ TIẾN ĐỘ THEO CÁC NHÓM", x + 24, y + 40, 18, 800, ink),
    statusBars(rows.slice(0, 9), x + 24, y + 72, 1450, 190)
  ].join("");
};

const resourcePanels = (groups: readonly ResourceGroupDashboard[]): string => {
  return groups
    .map((group, index) => {
      const x = index % 2 === 0 ? 48 : 790;
      const y = 1210 + Math.floor(index / 2) * 330;
      return [
        svgCard(x, y, 710, 295),
        svgText(group.title.toUpperCase(), x + 24, y + 38, 16, 800, ink),
        group.rows.length > 0
          ? stackedBars(group.rows.slice(0, 7), x + 24, y + 64, 660, 210)
          : svgText("Chưa có dữ liệu trong DATA hiện tại", x + 24, y + 105, 16, 600, muted)
      ].join("");
    })
    .join("");
};

const stackedBars = (
  rows: readonly CompletionRow[],
  x: number,
  y: number,
  w: number,
  h: number
): string => {
  const rowH = Math.min(30, h / Math.max(rows.length, 1));
  return rows
    .map((row, index) => {
      const yy = y + index * rowH;
      const labelW = 210;
      const barW = w - labelW - 90;
      const doneW = row.total === 0 ? 0 : (row.done / row.total) * barW;
      const remainW = Math.max(0, barW - doneW);
      return [
        svgText(row.name, x, yy + 18, 13, 600, ink),
        `<rect x="${x + labelW}" y="${yy + 6}" width="${barW}" height="14" rx="7" fill="#efe7d7"/>`,
        `<rect x="${x + labelW}" y="${yy + 6}" width="${doneW}" height="14" rx="7" fill="${primary}"/>`,
        `<rect x="${x + labelW + doneW}" y="${yy + 6}" width="${remainW}" height="14" rx="7" fill="#e8ddca"/>`,
        svgText(`${row.percent}%`, x + labelW + barW + 16, yy + 18, 13, 700, muted)
      ].join("");
    })
    .join("");
};

const groupedPercentBars = (
  rows: readonly UnitLeadRow[],
  leadNames: readonly string[],
  x: number,
  y: number,
  w: number,
  h: number
): string => {
  const colors = [primary, "#356d8d", accent, danger];
  const rowH = Math.min(28, h / Math.max(rows.length, 1));
  const labelW = 120;
  const barW = w - labelW - 16;
  return [
    leadNames
      .map((lead, index) =>
        svgLegendItem(lead, x + labelW + index * 150, y - 10, colors[index % colors.length], muted)
      )
      .join(""),
    rows
      .map((row, rowIndex) => {
        const yy = y + rowIndex * rowH;
        const segmentW = barW / Math.max(leadNames.length, 1);
        const bars = leadNames
          .map((lead, index) => {
            const value = row.values[lead] ?? 0;
            const height = Math.max(2, (value / 100) * 18);
            const bx = x + labelW + index * segmentW + 8;
            return `<rect x="${bx}" y="${yy + 22 - height}" width="${Math.max(12, segmentW - 18)}" height="${height}" rx="4" fill="${colors[index % colors.length]}"/>`;
          })
          .join("");
        return [svgText(row.name, x, yy + 18, 13, 600, ink), bars].join("");
      })
      .join("")
  ].join("");
};

const statusBars = (
  rows: readonly LeadStatusRow[],
  x: number,
  y: number,
  w: number,
  h: number
): string => {
  const rowH = Math.min(26, h / Math.max(rows.length, 1));
  const labelW = 250;
  const barW = w - labelW - 90;
  return [
    svgLegendItem("Hoàn thành", x + labelW, y - 8, success, muted),
    svgLegendItem("Đang thực hiện", x + labelW + 150, y - 8, warning, muted),
    svgLegendItem("Cancel", x + labelW + 330, y - 8, danger, muted),
    svgLegendItem("Chưa thực hiện", x + labelW + 440, y - 8, slate, muted),
    rows
      .map((row, index) => {
        const yy = y + 24 + index * rowH;
        const total = Math.max(row.total, 1);
        const parts = [
          { value: row.completed, color: success },
          { value: row.inProgress, color: warning },
          { value: row.cancelled, color: danger },
          { value: row.notStarted, color: slate }
        ];
        let offset = 0;
        const rects = parts
          .map((part) => {
            const ww = (part.value / total) * barW;
            const rect = `<rect x="${x + labelW + offset}" y="${yy + 4}" width="${ww}" height="14" rx="7" fill="${part.color}"/>`;
            offset += ww;
            return rect;
          })
          .join("");
        return [
          svgText(row.name, x, yy + 16, 13, 600, ink),
          `<rect x="${x + labelW}" y="${yy + 4}" width="${barW}" height="14" rx="7" fill="#efe7d7"/>`,
          rects,
          svgText(String(row.total), x + labelW + barW + 18, yy + 16, 13, 700, muted)
        ].join("");
      })
      .join("")
  ].join("");
};

const compactStatus = (
  x: number,
  y: number,
  status: { readonly completed: number; readonly inProgress: number; readonly cancelled: number; readonly notStarted: number }
): string => {
  return [
    statusPill("Hoàn thành", status.completed, x, y, success),
    statusPill("Đang thực hiện", status.inProgress, x + 210, y, warning),
    statusPill("Chưa thực hiện", status.notStarted, x + 450, y, slate),
    statusPill("Cancel", status.cancelled, x + 690, y, danger)
  ].join("");
};

const statusPill = (label: string, value: number, x: number, y: number, color: string): string => {
  return [
    `<rect x="${x}" y="${y}" width="180" height="44" rx="22" fill="${color}" opacity="0.12"/>`,
    svgText(label, x + 18, y + 18, 12, 700, color),
    svgText(String(value), x + 126, y + 29, 20, 800, color)
  ].join("");
};

const metric = (x: number, y: number, label: string, value: string, colorValue: string): string => {
  return [
    svgText(label, x, y, 14, 700, muted),
    svgText(value, x, y + 46, 42, 800, colorValue)
  ].join("");
};

const donut = (cx: number, cy: number, r: number, percent: number, color: string, background: string): string => {
  const circumference = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  return [
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${background}" stroke-width="18"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round" stroke-dasharray="${filled} ${circumference - filled}" transform="rotate(-90 ${cx} ${cy})"/>`
  ].join("");
};

const footer = (height: number): string => {
  return svgText("BDTT Webapp - dashboard report image", 64, height - 44, 14, 600, muted);
};
