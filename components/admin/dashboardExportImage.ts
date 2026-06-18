import type {
  CompletionRow,
  ExcelDashboardData,
  LeadStatusRow,
  ResourceGroupDashboard,
  UnitLeadRow
} from "@/lib/dashboard";

const width = 1920;
const pagePad = 42;
const gap = 18;

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
  done: "#6fa51f",
  remaining: "#b8b8af",
  accent: "#f2a24a",
  accentStrong: "#d76635",
  danger: "#df5b3a",
  info: "#4a90d9",
  slate: "#a6a69e",
  grid: "#ececea"
};

export interface DashboardExportTheme {
  readonly fontFamily?: string;
  readonly colors?: Partial<ExportColors>;
}

let colors: ExportColors = defaultColors;
let exportFontFamily =
  'var(--font-sans), "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

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
  reportDateLabel: string,
  theme: DashboardExportTheme = {}
): SvgReport => {
  colors = { ...defaultColors, ...theme.colors };
  exportFontFamily = theme.fontFamily?.trim() || exportFontFamily;

  const parts: string[] = [];
  const contentWidth = width - pagePad * 2;
  let y = pagePad;

  parts.push(background());
  parts.push(header(reportDateLabel, y));
  y += 96;

  parts.push(kpiStrip(dashboard, y, contentWidth));
  y += 112;

  const mainLeft = Math.round(contentWidth * 0.31);
  const mainMid = Math.round(contentWidth * 0.35);
  const mainRight = contentWidth - mainLeft - mainMid - gap * 2;
  const mainHeight = 292;
  parts.push(
    overallPanel(dashboard, { x: pagePad, y, w: mainLeft, h: mainHeight }),
    ownerUnitPanel(dashboard.byOwnerUnit, {
      x: pagePad + mainLeft + gap,
      y,
      w: mainMid,
      h: mainHeight
    }),
    leadStatusPanel(dashboard.leadStatus, {
      x: pagePad + mainLeft + gap + mainMid + gap,
      y,
      w: mainRight,
      h: mainHeight
    })
  );
  y += mainHeight + gap;

  parts.push(
    unitLeadPanel(dashboard.byOwnerUnitAndLead, dashboard.leadNames, {
      x: pagePad,
      y,
      w: Math.round((contentWidth - gap) * 0.5),
      h: 276
    }),
    attentionPanel(dashboard, {
      x: pagePad + Math.round((contentWidth - gap) * 0.5) + gap,
      y,
      w: Math.round((contentWidth - gap) * 0.5),
      h: 276
    })
  );
  y += 276 + gap;

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

  parts.push(notePanel({ x: pagePad, y, w: contentWidth, h: 58 }));
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

const header = (reportDateLabel: string, y: number): string => [
  text("DASH BOARD EXCEL", pagePad, y + 18, 15, 800, colors.primaryStrong, "track"),
  text("BÁO CÁO NGẮN TIẾN ĐỘ BDTT 2025 TỔ TB ĐL&ĐK", pagePad, y + 52, 30, 800, colors.text),
  text(
    `Ngày báo cáo: ${reportDateLabel} · Dữ liệu tính từ DATA A:M và báo cáo worker đã gửi đến ngày này.`,
    pagePad,
    y + 82,
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
      label: "Tổng hạng mục",
      value: formatNumber(executive.totalTasks),
      note: `${formatNumber(executive.activeTasks)} active`,
      color: colors.text
    },
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
      note: "trong ngày báo cáo",
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
        card(x, y, itemWidth, 92, 20),
        `<circle cx="${x + itemWidth - 24}" cy="${y + 24}" r="7" fill="${item.color}" opacity="0.72"/>`,
        text(item.label, x + 22, y + 30, 14, 800, colors.soft, "upper"),
        text(item.value, x + 22, y + 66, 34, 800, item.color),
        text(item.note, x + 132, y + 64, 13, 700, colors.muted)
      ].join("");
    })
    .join("");
};

const overallPanel = (dashboard: ExcelDashboardData, rect: ChartRect): string => {
  const { executive, overall } = dashboard;
  const cx = rect.x + 106;
  const cy = rect.y + 164;
  const radius = 74;
  const doneAngle = Math.max(0.001, Math.min(359.999, overall.percent * 3.6));
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Tổng tiến độ BDTT", "Tỷ lệ hoàn thành trung bình toàn tổ", rect),
    donutPath(cx, cy, radius, 18, 359.999, colors.grid),
    donutPath(cx, cy, radius, 18, doneAngle, colors.done),
    text(`${overall.percent}%`, cx, cy + 9, 38, 800, colors.text, "middle"),
    text("Hoàn thành", cx, cy + 34, 14, 800, colors.muted, "middle"),
    miniLegend("Đã thực hiện", colors.done, rect.x + 214, rect.y + 122),
    text(formatNumber(overall.done), rect.x + 386, rect.y + 132, 22, 800, colors.done),
    miniLegend("Còn lại", colors.remaining, rect.x + 214, rect.y + 164),
    text(formatNumber(overall.remaining), rect.x + 386, rect.y + 174, 22, 800, colors.remaining),
    miniLegend("Hủy", colors.danger, rect.x + 214, rect.y + 206),
    text(formatNumber(executive.cancelledTasks), rect.x + 386, rect.y + 216, 22, 800, colors.danger)
  ].join("");
};

const ownerUnitPanel = (rows: readonly CompletionRow[], rect: ChartRect): string => {
  const visibleRows = rows.slice(0, 8);
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Tiến độ theo đơn vị chủ quản", "Stacked bar đã thực hiện / còn lại", rect),
    stackedBars(visibleRows, rect.x + 24, rect.y + 72, rect.w - 48, 196)
  ].join("");
};

const leadStatusPanel = (rows: readonly LeadStatusRow[], rect: ChartRect): string => {
  const visibleRows = rows.slice(0, 5);
  const maxValue = Math.max(1, ...visibleRows.map((row) => row.total));
  const x = rect.x + 24;
  const barX = rect.x + 248;
  const barW = rect.w - 286;
  const rowH = 34;
  const y = rect.y + 82;
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
        text(truncate(row.name, 20), x, yy + 18, 13, 800, colors.text),
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
  const series = [colors.done, colors.info, colors.accent, colors.danger];
  const leadColor = new Map(
    leadNames.slice(0, 4).map((lead, index) => [lead, series[index % series.length]])
  );
  const rankedRows = rows
    .flatMap((row) =>
      leadNames.slice(0, 4).map((lead) => ({
        lead,
        unit: row.name,
        value: row.values[lead] ?? 0,
        color: leadColor.get(lead) ?? colors.done
      }))
    )
    .filter((row) => row.value > 0)
    .sort((left, right) => {
      if (right.value !== left.value) return right.value - left.value;
      return `${left.unit} ${left.lead}`.localeCompare(`${right.unit} ${right.lead}`);
    })
    .slice(0, 7);

  if (rankedRows.length === 0) {
    return [
      card(rect.x, rect.y, rect.w, rect.h, 22),
      panelTitle("% hoàn thành theo đơn vị và nhóm trưởng", "Average %Complete, chỉ hiện khi đã có tiến độ để so sánh", rect),
      emptyMessage(rect, "Chưa có dữ liệu tiến độ > 0% để so sánh nhóm trưởng.")
    ].join("");
  }

  const labelX = rect.x + 24;
  const barX = rect.x + 312;
  const barW = rect.w - 392;
  const valueX = barX + barW + 18;
  const rowH = 25;
  const y = rect.y + 78;
  const bars = rankedRows
    .map((row, index) => {
      const yy = y + index * rowH;
      const fillW = Math.max(4, (row.value / 100) * barW);
      return [
        text(truncate(row.unit, 15), labelX, yy + 9, 12, 800, colors.text),
        text(truncate(normalizeLeadLabel(row.lead), 30), labelX, yy + 23, 11, 800, colors.text),
        roundedRect(barX, yy + 6, barW, 13, 7, colors.grid, 0.9),
        roundedRect(barX, yy + 6, fillW, 13, 7, row.color, 0.95),
        text(`${formatNumber(row.value)}%`, valueX, yy + 18, 12, 800, colors.text)
      ].join("");
    })
    .join("");
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("% hoàn thành theo đơn vị và nhóm trưởng", "Top các cụm có tiến độ; tên nhóm trưởng và % hiển thị trực tiếp trên ảnh", rect),
    bars
  ].join("");
};

const attentionPanel = (dashboard: ExcelDashboardData, rect: ChartRect): string => {
  const unitRows = dashboard.attentionOwnerUnits.slice(0, 4);
  const leadRows = dashboard.attentionLeads.slice(0, 4);
  const list = (items: string[], x: number, y: number, title: string): string => [
    text(title, x, y, 14, 800, colors.text),
    ...items.map((item, index) => [
      `<circle cx="${x + 7}" cy="${y + 28 + index * 31}" r="5" fill="${colors.accent}" opacity="0.85"/>`,
      text(truncate(item, 42), x + 22, y + 33 + index * 31, 13, 800, colors.muted)
    ].join(""))
  ].join("");
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Các điểm cần chú ý", "Ưu tiên theo phần còn lại và trạng thái mở", rect),
    list(
      unitRows.map((row) => `${row.name}: ${formatNumber(row.remaining)} còn lại · ${row.percent}%`),
      rect.x + 24,
      rect.y + 82,
      "Đơn vị cần ưu tiên"
    ),
    list(
      leadRows.map((row) => `${row.name}: ${formatNumber(row.notStarted + row.inProgress)} chưa xong`),
      rect.x + Math.round(rect.w / 2) + 8,
      rect.y + 82,
      "Nhóm cần bám"
    )
  ].join("");
};

const resourceGroupsPanel = (
  groups: readonly ResourceGroupDashboard[],
  rect: ChartRect
): string => {
  const columns = 4;
  const innerPad = 24;
  const cardGap = 14;
  const tileW = (rect.w - innerPad * 2 - cardGap * (columns - 1)) / columns;
  const tileH = 158;
  const headerH = 68;
  return [
    card(rect.x, rect.y, rect.w, rect.h, 22),
    panelTitle("Chi tiết theo phân nhóm resource", "Mỗi nhóm chỉ hiển thị Top resource có khối lượng lớn để ảnh ngắn gọn", {
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
  const rows = group.rows.slice(0, 4);
  return [
    roundedRect(rect.x, rect.y, rect.w, rect.h, 18, colors.mutedSurface, 1, colors.border),
    text(truncate(group.title.toUpperCase(), 31), rect.x + 16, rect.y + 28, 14, 800, colors.text),
    text(group.key, rect.x + 16, rect.y + 52, 13, 800, colors.muted),
    compactBars(rows, rect.x + 16, rect.y + 66, rect.w - 32, rect.h - 82)
  ].join("");
};

const notePanel = (rect: ChartRect): string => [
  card(rect.x, rect.y, rect.w, rect.h, 18),
  text("Ghi chú: Các chart milestone/VOTTING cần thêm dữ liệu nguồn nên không đưa vào ảnh compact.", rect.x + 22, rect.y + 36, 15, 800, colors.muted),
  text("BDTT WebApp · dashboard report image", rect.x + rect.w - 320, rect.y + 36, 13, 700, colors.soft)
].join("");

const resourceGroupsHeight = (groups: readonly ResourceGroupDashboard[]): number => {
  const rows = Math.ceil(groups.length / 4);
  return 68 + rows * 158 + Math.max(0, rows - 1) * 14 + 24;
};

const stackedBars = (
  rows: readonly CompletionRow[],
  x: number,
  y: number,
  w: number,
  h: number
): string => {
  const maxTotal = Math.max(1, ...rows.map((row) => row.total));
  const rowH = h / Math.max(1, rows.length);
  return rows
    .map((row, index) => {
      const yy = y + index * rowH;
      const labelW = 120;
      const barX = x + labelW;
      const barW = w - labelW - 46;
      const doneW = (row.done / maxTotal) * barW;
      const remainingW = (row.remaining / maxTotal) * barW;
      return [
        text(truncate(row.name, 14), x, yy + 18, 12, 800, colors.text),
        roundedRect(barX, yy + 8, barW, 10, 5, colors.grid, 0.9),
        roundedRect(barX, yy + 8, Math.max(0, doneW), 10, 5, colors.done, 0.96),
        roundedRect(barX + doneW, yy + 8, Math.max(0, remainingW), 10, 5, colors.remaining, 0.9),
        text(`${row.percent}%`, barX + barW + 12, yy + 18, 12, 800, colors.muted)
      ].join("");
    })
    .join("");
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
      const labelW = 196;
      const barW = Math.max(90, w - labelW - 40);
      return [
        text(truncate(row.name, 16), x, yy + 17, 11, 800, colors.text),
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
  return `<text x="${round(x)}" y="${round(y)}" fill="${color}" font-size="${size}" font-weight="${Math.min(weight, 700)}"${textAnchor}${extraClass}>${escapeXml(value)}</text>`;
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
  '"Segoe UI Variable", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

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
