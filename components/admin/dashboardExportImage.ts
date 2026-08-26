import type {
  CompletionRow,
  ExcelDashboardData,
  LeadStatusRow,
  ResourceGroupDashboard,
  UnitLeadRow
} from "@/lib/dashboard";

// Match the web dashboard width and let the exported report grow vertically.
const width = 1680;
const pagePad = 32;
const gap = 18;
const minimumFontSize = 16;
const fontScale = 1.25;

interface ExportColors {
  readonly bg: string;
  readonly surface: string;
  readonly mutedSurface: string;
  readonly border: string;
  readonly text: string;
  readonly muted: string;
  readonly soft: string;
  readonly primary: string;
  readonly primaryStrong: string;
  readonly primarySoft: string;
  readonly done: string;
  readonly remaining: string;
  readonly accent: string;
  readonly accentStrong: string;
  readonly danger: string;
  readonly info: string;
  readonly slate: string;
  readonly grid: string;
}

const defaultColors: ExportColors = {
  bg: "#f2f2f0",
  surface: "#ffffff",
  mutedSurface: "#f7f7f4",
  border: "#ececea",
  text: "#111111",
  muted: "#8b8b85",
  soft: "#a6a69e",
  primary: "#9bd13b",
  primaryStrong: "#6fa51f",
  primarySoft: "#edf8d5",
  done: "#007a5a",
  remaining: "#7c8892",
  accent: "#d56a00",
  accentStrong: "#d76635",
  danger: "#c53a32",
  info: "#0067a0",
  slate: "#7c8892",
  grid: "#ececea"
};

export interface DashboardExportTheme {
  readonly fontFamily?: string;
  readonly colors?: Partial<ExportColors>;
}

let colors: ExportColors = defaultColors;
let exportFontFamily =
  '"Inter", "Segoe UI", Arial, sans-serif';

interface SvgReport {
  readonly svg: string;
  readonly width: number;
  readonly height: number;
}

interface ChartRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const createCompactDashboardExportSvg = (
  dashboard: ExcelDashboardData,
  reportYear: string,
  theme: DashboardExportTheme = {}
): SvgReport => {
  colors = { ...defaultColors, ...theme.colors };
  exportFontFamily = theme.fontFamily?.trim() || exportFontFamily;

  const parts: string[] = [];
  const contentWidth = width - pagePad * 2;
  let y = pagePad;

  parts.push(background());
  parts.push(reportHeader(reportYear, { x: pagePad, y, w: contentWidth, h: 132 }));
  y += 132 + gap;

  parts.push(kpiStrip(dashboard, y, contentWidth));
  y += 156 + gap;

  parts.push(
    attentionPanel(dashboard, {
      x: pagePad,
      y,
      w: contentWidth,
      h: 290
    })
  );
  y += 290 + gap;

  const mainLeft = Math.round((contentWidth - gap) * 0.4);
  const mainRight = contentWidth - mainLeft - gap;
  const ownerUnitCount = dashboard.byOwnerUnit.filter((row) => row.total > 0).length;
  const mainHeight = Math.max(470, 150 + ownerUnitCount * 50);
  parts.push(
    overallPanel(dashboard, { x: pagePad, y, w: mainLeft, h: mainHeight }),
    ownerUnitPanel(dashboard.byOwnerUnit, {
      x: pagePad + mainLeft + gap,
      y,
      w: mainRight,
      h: mainHeight
    })
  );
  y += mainHeight + gap;

  const matrixRows = dashboard.byOwnerUnitAndLead.filter((row) =>
    dashboard.leadNames.some((lead) => (row.totals[lead] ?? 0) > 0)
  ).length;
  const matrixHeight = Math.max(440, 168 + matrixRows * 56);
  parts.push(
    unitLeadPanel(dashboard.byOwnerUnitAndLead, dashboard.leadNames, {
      x: pagePad,
      y,
      w: contentWidth,
      h: matrixHeight
    })
  );
  y += matrixHeight + gap;

  const leadHeight = Math.max(400, 156 + dashboard.leadStatus.length * 54);
  parts.push(
    leadStatusPanel(dashboard.leadStatus, {
      x: pagePad,
      y,
      w: contentWidth,
      h: leadHeight
    })
  );
  y += leadHeight + gap;

  const resourcePanelHeight = resourceGroupsHeight(dashboard.resourceGroups);
  parts.push(
    resourceGroupsPanel(dashboard.resourceGroups, {
      x: pagePad,
      y,
      w: contentWidth,
      h: resourcePanelHeight
    })
  );
  y += resourcePanelHeight + gap;

  parts.push(footerPanel({ x: pagePad, y, w: contentWidth, h: 58 }));
  y += 58 + pagePad;

  const height = Math.ceil(y);
  return {
    width,
    height,
    svg: [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
      `<style>${styleSheet()}</style>`,
      ...parts,
      `</svg>`
    ].join("")
  };
};

const background = (): string =>
  `<rect width="100%" height="100%" fill="${colors.bg}"/>`;

const reportHeader = (reportYear: string, rect: ChartRect): string => [
  card(rect.x, rect.y, rect.w, rect.h, 22),
  roundedRect(rect.x, rect.y, 10, rect.h, 5, colors.primaryStrong),
  text("BÁO CÁO EXCEL", rect.x + 28, rect.y + 30, 15, 800, colors.primaryStrong, "track"),
  text(`Báo cáo ngắn tiến độ BDTT ${reportYear} · Tổ TB ĐL&ĐK`, rect.x + 28, rect.y + 76, 30, 600, colors.text),
  text(
    "Dữ liệu lũy kế toàn bộ kỳ · Mỗi hạng mục dùng mức tiến độ cao nhất đã ghi nhận.",
    rect.x + 28,
    rect.y + 116,
    17,
    700,
    colors.muted
  )
].join("");

const kpiStrip = (
  dashboard: ExcelDashboardData,
  y: number,
  contentWidth: number
): string => {
  const { executive, overall } = dashboard;
  const items = [
    {
      label: "Tiến độ tổng",
      value: `${executive.overallPercent}%`,
      note: `${formatNumber(overall.done)}/${formatNumber(executive.activeTasks)} quy đổi`,
      color: colors.primaryStrong
    },
    {
      label: "Đã nhập tiến độ",
      value: formatNumber(executive.updatedTasks),
      note: `${formatNumber(executive.updatedTasks)} hạng mục có record`,
      color: colors.done
    },
    {
      label: "Nhân sự báo cáo",
      value: `${formatNumber(executive.submittedWorkers)}/${formatNumber(executive.totalWorkers)}`,
      note: "đã từng báo cáo",
      color: colors.info
    },
    {
      label: "Chưa xong",
      value: formatNumber(executive.unfinishedTasks),
      note: `${formatNumber(executive.inProgressTasks)} đang làm · ${formatNumber(executive.notStartedTasks)} chưa làm`,
      color: colors.accentStrong
    }
  ];
  const itemGap = 14;
  const itemWidth = (contentWidth - itemGap * (items.length - 1)) / items.length;
  return items
    .map((item, index) => {
      const x = pagePad + index * (itemWidth + itemGap);
      return [
        card(x, y, itemWidth, 156, 20),
        `<circle cx="${x + itemWidth - 24}" cy="${y + 24}" r="7" fill="${item.color}" opacity="0.72"/>`,
        text(item.label, x + 22, y + 32, 14, 800, colors.soft, "upper"),
        text(item.value, x + 22, y + 90, 36, 800, item.color),
        text(item.note, x + 22, y + 134, 14, 700, colors.muted)
      ].join("");
    })
    .join("");
};

const overallPanel = (dashboard: ExcelDashboardData, rect: ChartRect): string => {
  const { executive, overall } = dashboard;
  const cx = rect.x + Math.round(rect.w * 0.3);
  const cy = rect.y + Math.round(rect.h * 0.56);
  const radius = 100;
  const doneAngle = Math.max(0.001, Math.min(359.999, overall.percent * 3.6));
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Tổng tiến độ BDTT", "Tỷ lệ hoàn thành trung bình toàn tổ", rect),
    donutPath(cx, cy, radius, 22, 359.999, colors.grid),
    donutPath(cx, cy, radius, 22, doneAngle, colors.done),
    text(`${overall.percent}%`, cx, cy + 9, 38, 800, colors.text, "middle"),
    text("Hoàn thành", cx, cy + 34, 14, 800, colors.muted, "middle"),
    miniLegend("Đã thực hiện", colors.done, rect.x + Math.round(rect.w * 0.57), cy - 46),
    text(formatNumber(overall.done), rect.x + rect.w - 38, cy - 46, 22, 800, colors.done, "middle"),
    miniLegend("Còn lại", colors.remaining, rect.x + Math.round(rect.w * 0.57), cy + 6),
    text(formatNumber(overall.remaining), rect.x + rect.w - 38, cy + 6, 22, 800, colors.remaining, "middle"),
    miniLegend("Hủy", colors.danger, rect.x + Math.round(rect.w * 0.57), cy + 58),
    text(formatNumber(executive.cancelledTasks), rect.x + rect.w - 38, cy + 58, 22, 800, colors.danger, "middle")
  ].join("");
};

const ownerUnitPanel = (rows: readonly CompletionRow[], rect: ChartRect): string => {
  const visibleRows = rows.filter((row) => row.total > 0);
  const labelX = rect.x + 24;
  const plotX = rect.x + 176;
  const plotW = rect.w - 282;
  const valueX = plotX + plotW + 12;
  const startY = rect.y + 126;
  const rowHeight = 50;
  const guides = [0, 25, 50, 75, 100]
    .map((tick) => {
      const x = plotX + (tick / 100) * plotW;
      return [
        `<line x1="${x}" y1="${startY - 16}" x2="${x}" y2="${startY + visibleRows.length * rowHeight}" stroke="${colors.grid}" stroke-width="1"/>`,
        text(`${tick}%`, x, startY - 22, 10, 700, colors.muted, tick === 0 ? "start" : "middle")
      ].join("");
    })
    .join("");
  const dots = visibleRows
    .map((row, index) => {
      const y = startY + index * rowHeight;
      const markerX = plotX + (Math.max(1, Math.min(99, row.percent)) / 100) * plotW;
      return [
        text(truncate(row.name, 21), labelX, y + 6, 13, 800, colors.text),
        `<line x1="${plotX}" y1="${y}" x2="${plotX + plotW}" y2="${y}" stroke="${colors.border}" stroke-width="2"/>`,
        `<rect x="${markerX - 5}" y="${y - 5}" width="10" height="10" fill="${colors.done}" stroke="${colors.surface}" stroke-width="2"/>`,
        text(`${row.percent}%`, markerX, y + 28, 11, 800, colors.text, "middle"),
        text(`${formatNumber(row.done)}/${formatNumber(row.total)}`, valueX, y + 6, 12, 800, colors.text)
      ].join("");
    })
    .join("");
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Vị thế tiến độ theo đơn vị chủ quản", "Vị trí ô vuông = % hoàn thành · số bên phải = đã làm/tổng", rect),
    guides,
    dots
  ].join("");
};

const leadStatusPanel = (rows: readonly LeadStatusRow[], rect: ChartRect): string => {
  const visibleRows = rows;
  const maxValue = Math.max(1, ...visibleRows.map((row) => row.total));
  const x = rect.x + 24;
  const barX = rect.x + Math.round(rect.w * 0.4);
  const barW = rect.w - (barX - rect.x) - 70;
  const rowH = 54;
  const y = rect.y + 116;
  const bars = visibleRows
    .map((row, index) => {
      const yy = y + index * rowH;
      const values = [
        { value: row.completed, color: colors.done },
        { value: row.inProgress, color: colors.accent },
        { value: row.cancelled, color: colors.danger },
        { value: row.notStarted, color: colors.slate }
      ];
      let currentX = barX;
      const segments = values.map((item) => {
        const w = (item.value / maxValue) * barW;
        const svg = roundedRect(currentX, yy + 7, Math.max(0, w), 12, 6, item.color, 0.9);
        currentX += w;
        return svg;
      });
      return [
        text(truncate(row.name, 27), x, yy + 18, 13, 800, colors.text),
        roundedRect(barX, yy + 7, barW, 12, 6, colors.grid, 0.9),
        ...segments,
        text(formatNumber(row.total), barX + barW + 12, yy + 19, 12, 800, colors.muted)
      ].join("");
    })
    .join("");
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Tiến độ theo các nhóm", "Hoàn thành / đang làm / hủy / chưa thực hiện", rect),
    bars,
    legendRow(
      [
        ["Hoàn thành", colors.done],
        ["Đang làm", colors.accent],
        ["Hủy", colors.danger],
        ["Chưa làm", colors.slate]
      ],
      rect.x + 24,
      rect.y + rect.h - 24
    )
  ].join("");
};

const unitLeadPanel = (
  rows: readonly UnitLeadRow[],
  leadNames: readonly string[],
  rect: ChartRect
): string => {
  const visibleLeads = leadNames.slice(0, 6);
  const visibleRows = rows
    .filter((row) => visibleLeads.some((lead) => (row.totals[lead] ?? 0) > 0))
    .slice(0, 10);

  if (visibleRows.length === 0 || visibleLeads.length === 0) {
    return [
      card(rect.x, rect.y, rect.w, rect.h, 22),
      panelTitle("Ma trận tiến độ đơn vị × nhóm trưởng", "Mỗi ô là % hoàn thành của đúng cụm phân công", rect),
      emptyMessage(rect, "Chưa có phân công theo đơn vị và nhóm trưởng để lập ma trận.")
    ].join("");
  }

  const tableX = rect.x + 24;
  const tableY = rect.y + 122;
  const unitWidth = 180;
  const cellWidth = (rect.w - 48 - unitWidth) / visibleLeads.length;
  const rowHeight = 56;
  const headers = visibleLeads
    .map((lead, index) =>
      text(
        truncate(normalizeLeadLabel(lead), 18),
        tableX + unitWidth + index * cellWidth + cellWidth / 2,
        tableY - 18,
        10,
        800,
        colors.muted,
        "middle"
      )
    )
    .join("");
  const cells = visibleRows
    .map((row, rowIndex) => {
      const y = tableY + rowIndex * rowHeight;
      return [
        text(truncate(row.name, 20), tableX, y + 35, 12, 800, colors.text),
        ...visibleLeads.map((lead, columnIndex) => {
          const total = row.totals[lead] ?? 0;
          const percent = row.values[lead] ?? 0;
          const x = tableX + unitWidth + columnIndex * cellWidth;
          const color = total === 0 ? colors.grid : getExportHeatColor(percent);
          return [
            `<rect x="${x + 2}" y="${y + 2}" width="${cellWidth - 4}" height="${rowHeight - 4}" fill="${color}" opacity="${total === 0 ? 0.55 : 0.18}"/>`,
            total > 0
              ? `<rect x="${x + 2}" y="${y + 2}" width="4" height="${rowHeight - 4}" fill="${color}"/>`
              : "",
            text(
              total > 0 ? `${percent}% · ${formatNumber(total)}` : "—",
              x + cellWidth / 2,
              y + 35,
              11,
              800,
              total > 0 ? colors.text : colors.muted,
              "middle"
            )
          ].join("");
        })
      ].join("");
    })
    .join("");
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Ma trận tiến độ đơn vị × nhóm trưởng", "Giá trị trong ô: % hoàn thành · số task", rect),
    headers,
    cells
  ].join("");
};

const getExportHeatColor = (percent: number): string => {
  if (percent >= 100) return colors.done;
  if (percent >= 75) return colors.primaryStrong;
  if (percent >= 50) return colors.info;
  if (percent >= 25) return colors.accent;
  if (percent > 0) return colors.danger;
  return colors.slate;
};

const attentionPanel = (dashboard: ExcelDashboardData, rect: ChartRect): string => {
  const unitRows = dashboard.attentionOwnerUnits.slice(0, 4);
  const leadRows = dashboard.attentionLeads.slice(0, 4);
  const innerGap = 14;
  const innerX = rect.x + 20;
  const innerY = rect.y + 66;
  const innerW = (rect.w - 40 - innerGap * 2) / 3;
  const innerH = rect.h - 86;
  const list = (
    items: string[],
    x: number,
    title: string,
    accentColor: string
  ): string => [
    roundedRect(x, innerY, innerW, innerH, 16, colors.mutedSurface, 1, colors.border),
    text(title, x + 18, innerY + 28, 14, 800, colors.text),
    ...items.map((item, index) => [
      `<circle cx="${x + 24}" cy="${innerY + 62 + index * 36}" r="5" fill="${accentColor}" opacity="0.85"/>`,
      text(truncate(item, 43), x + 38, innerY + 68 + index * 36, 12, 800, colors.muted)
    ].join(""))
  ].join("");
  const summaryX = innerX;
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Tình hình điều hành", "Tổng hợp lũy kế và các điểm cần ưu tiên", rect),
    roundedRect(summaryX, innerY, innerW, innerH, 16, colors.primarySoft, 1, colors.border),
    text("TỔNG QUAN", summaryX + 18, innerY + 28, 14, 800, colors.primaryStrong, "track"),
    text(`${dashboard.executive.overallPercent}%`, summaryX + 18, innerY + 92, 38, 800, colors.primaryStrong),
    text("tiến độ quy đổi", summaryX + 130, innerY + 88, 13, 800, colors.muted),
    text(`${formatNumber(dashboard.executive.activeTasks)} active`, summaryX + 18, innerY + 140, 14, 800, colors.text),
    text(`${formatNumber(dashboard.executive.completedTasks)} hoàn thành`, summaryX + 180, innerY + 140, 14, 800, colors.done),
    text(`${formatNumber(dashboard.executive.cancelledTasks)} hủy`, summaryX + 370, innerY + 140, 14, 800, colors.danger),
    list(
      unitRows.map((row) => `${row.name}: ${formatNumber(row.remaining)} còn lại · ${row.percent}%`),
      innerX + innerW + innerGap,
      "Đơn vị cần ưu tiên",
      colors.accent
    ),
    list(
      leadRows.map((row) => `${row.name}: ${formatNumber(row.notStarted + row.inProgress)} chưa xong`),
      innerX + (innerW + innerGap) * 2,
      "Nhóm cần bám",
      colors.danger
    )
  ].join("");
};

const resourceGroupsPanel = (
  groups: readonly ResourceGroupDashboard[],
  rect: ChartRect
): string => {
  const columns = 2;
  const innerPad = 24;
  const cardGap = 14;
  const tileW = (rect.w - innerPad * 2 - cardGap * (columns - 1)) / columns;
  const tileH = 300;
  const headerH = 88;
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Chi tiết theo nhóm task", "Nhóm lấy từ cột E Google Sheet; mỗi card hiển thị Top người thực hiện ở cột L", {
      ...rect,
      y: rect.y
    }),
    ...groups.map((group, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = rect.x + innerPad + col * (tileW + cardGap);
      const y = rect.y + headerH + row * (tileH + cardGap);
      return resourceTile(group, { x, y, w: tileW, h: tileH });
    })
  ].join("");
};

const resourceTile = (group: ResourceGroupDashboard, rect: ChartRect): string => {
  const rows = group.rows.slice(0, 5);
  return [
    roundedRect(rect.x, rect.y, rect.w, rect.h, 18, colors.mutedSurface, 1, colors.border),
    text(truncate(group.title.toUpperCase(), 48), rect.x + 16, rect.y + 30, 15, 800, colors.text),
    text("Nguồn DATA!E:E", rect.x + 16, rect.y + 52, 13, 800, colors.muted),
    compactBars(rows, rect.x + 16, rect.y + 76, rect.w - 32, rect.h - 98)
  ].join("");
};

const footerPanel = (rect: ChartRect): string => [
  card(rect.x, rect.y, rect.w, rect.h, 18),
  text("BDTT WebApp · dashboard report image", rect.x + 22, rect.y + 36, 13, 700, colors.soft)
].join("");

const resourceGroupsHeight = (groups: readonly ResourceGroupDashboard[]): number => {
  const rows = Math.ceil(groups.length / 2);
  return 88 + rows * 300 + Math.max(0, rows - 1) * 14 + 24;
};

const compactBars = (
  rows: readonly CompletionRow[],
  x: number,
  y: number,
  w: number,
  h: number
): string => {
  if (rows.length === 0) {
    return text("Không có dữ liệu", x, y + 36, 13, 800, colors.soft);
  }
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));
  const rowH = h / rows.length;
  return rows
    .map((row, index) => {
      const yy = y + index * rowH;
      const labelW = Math.min(300, Math.round(w * 0.42));
      const barW = Math.max(90, w - labelW - 40);
      return [
        text(truncate(row.name, 24), x, yy + 17, 11, 800, colors.text),
        roundedRect(x + labelW, yy + 8, barW, 8, 4, colors.grid, 0.9),
        roundedRect(x + labelW, yy + 8, (row.done / maxTotal) * barW, 8, 4, colors.done, 0.96),
        roundedRect(
          x + labelW + (row.done / maxTotal) * barW,
          yy + 8,
          (row.remaining / maxTotal) * barW,
          8,
          4,
          colors.remaining,
          0.9
        ),
        text(`${row.percent}%`, x + labelW + barW + 10, yy + 17, 10, 800, colors.muted)
      ].join("");
    })
    .join("");
};

const card = (x: number, y: number, w: number, h: number, r: number): string =>
  roundedRect(x, y, w, h, r, colors.surface, 1, colors.border);

const panelTitle = (title: string, subtitle: string, rect: ChartRect): string => [
  text(title.toUpperCase(), rect.x + 24, rect.y + 31, 17, 800, colors.text),
  text(subtitle, rect.x + 24, rect.y + 56, 14, 700, colors.muted)
].join("");

const emptyMessage = (rect: ChartRect, message: string): string =>
  [
    roundedRect(rect.x + 24, rect.y + 88, rect.w - 48, rect.h - 118, 18, colors.mutedSurface, 1, colors.border),
    text(message, rect.x + rect.w / 2, rect.y + rect.h / 2 + 8, 16, 700, colors.muted, "middle")
  ].join("");

const roundedRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  opacity = 1,
  stroke?: string
): string => {
  if (w <= 0 || h <= 0) return "";
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" rx="${r}" fill="${fill}" opacity="${opacity}"${stroke ? ` stroke="${stroke}"` : ""}/>`;
};

const text = (
  value: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  anchor: "start" | "middle" | "upper" | "track" = "start"
): string => {
  const textAnchor = anchor === "middle" ? ` text-anchor="middle"` : "";
  const extraClass = anchor === "upper" || anchor === "track" ? ` class="${anchor}"` : "";
  const renderedSize = Math.max(minimumFontSize, round(size * fontScale));
  return `<text x="${round(x)}" y="${round(y)}" fill="${color}" font-size="${renderedSize}" font-weight="${Math.min(weight, 700)}"${textAnchor}${extraClass}>${escapeXml(value)}</text>`;
};

const miniLegend = (label: string, color: string, x: number, y: number): string => [
  `<circle cx="${x}" cy="${y - 4}" r="7" fill="${color}"/>`,
  text(label, x + 18, y, 14, 800, colors.muted)
].join("");

const legendRow = (
  items: readonly (readonly [string, string])[],
  x: number,
  y: number
): string => {
  let currentX = x;
  return items
    .map(([label, color]) => {
      const item = [
        `<circle cx="${currentX}" cy="${y - 4}" r="6" fill="${color}"/>`,
        text(label, currentX + 14, y, 11, 800, colors.text)
      ].join("");
      currentX += 14 + label.length * 6.2 + 18;
      return item;
    })
    .join("");
};

const donutPath = (
  cx: number,
  cy: number,
  radius: number,
  strokeWidth: number,
  angle: number,
  color: string
): string => {
  const startAngle = -90;
  const endAngle = startAngle + angle;
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = angle <= 180 ? "0" : "1";
  return `<path d="M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
};

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { readonly x: number; readonly y: number } => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: round(centerX + radius * Math.cos(angleInRadians)),
    y: round(centerY + radius * Math.sin(angleInRadians))
  };
};

const styleSheet = (): string => `
  text {
    font-family: ${sanitizeCssFontFamily(exportFontFamily)};
    dominant-baseline: auto;
  }
  .upper {
    text-transform: uppercase;
  }
  .track {
    letter-spacing: 2px;
  }
`;

const sanitizeCssFontFamily = (value: string): string =>
  value.replace(/[;\n\r{}]/g, "").trim() ||
  '"Inter", "Segoe UI", Arial, sans-serif';

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
};

const normalizeLeadLabel = (value: string): string => {
  const parts = value.split("_");
  return parts.length > 1 ? parts.slice(1).join(" ") : value;
};

const formatNumber = (value: number): string =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(value);

const round = (value: number): number => Math.round(value * 100) / 100;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
