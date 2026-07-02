"use client";

import {
  createCompactDashboardExportSvg,
  type DashboardExportTheme
} from "@/components/admin/dashboardExportImage";
import type { ExcelDashboardData } from "@/lib/dashboard";
import { cn } from "@/lib/ui";

const EXPORT_SCALE = 3;
const MAX_CANVAS_SIDE = 12000;
const MAX_CANVAS_PIXELS = 80_000_000;
const EXPORT_ROOT_SELECTOR = "[data-dashboard-export-root]";
const EXPORT_HIDDEN_SELECTOR = "[data-export-hidden]";

interface DashboardExportButtonProps {
  readonly className?: string;
  readonly dashboard?: ExcelDashboardData;
  readonly reportDateLabel?: string;
}

export const DashboardExportButton = ({
  className,
  dashboard,
  reportDateLabel = ""
}: DashboardExportButtonProps): React.ReactElement => {
  const exportPng = async (button: HTMLButtonElement): Promise<void> => {
    await document.fonts.ready;
    await nextFrame();
    const pngBlob = dashboard
      ? await renderCompactDashboardAsPng(dashboard, reportDateLabel)
      : await captureCurrentDashboardAsPng(button);
    downloadBlob(pngBlob, "bdtt-dashboard-compact-hq.png");
  };

  return (
    <button
      className={cn(
        "focus-ring pressable min-h-12 min-w-0 max-w-full rounded-[var(--radius-field)] bg-[var(--primary-strong)] px-4 py-3 text-center text-sm font-semibold leading-tight whitespace-normal text-[var(--primary-contrast)] shadow-[var(--shadow-soft-sm)] [overflow-wrap:anywhere] hover:bg-[var(--primary)]",
        className
      )}
      data-export-hidden="true"
      onClick={(event) => {
        void exportPng(event.currentTarget);
      }}
      type="button"
    >
      Export ảnh báo cáo HQ
    </button>
  );
};

const captureCurrentDashboardAsPng = async (button: HTMLButtonElement): Promise<Blob> => {
  const target = button.closest<HTMLElement>(EXPORT_ROOT_SELECTOR);
  if (!target) throw new Error("Không tìm thấy dashboard để export.");
  return captureElementAsPng(target);
};

const renderCompactDashboardAsPng = async (
  dashboard: ExcelDashboardData,
  reportDateLabel: string
): Promise<Blob> => {
  const report = createCompactDashboardExportSvg(
    dashboard,
    reportDateLabel,
    readDashboardExportTheme()
  );
  const scale = exportScale(report.width, report.height);
  const image = await loadImage(svgToDataUrl(report.svg));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(report.width * scale);
  canvas.height = Math.round(report.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không tạo được canvas export.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.drawImage(image, 0, 0, report.width, report.height);
  return canvasToPngBlob(canvas);
};

const readDashboardExportTheme = (): DashboardExportTheme => {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  const value = (name: string, fallback: string): string =>
    root.getPropertyValue(name).trim() || fallback;

  return {
    fontFamily: body.fontFamily,
    colors: {
      bg: value("--background", "#f2f2f0"),
      surface: value("--surface", "#ffffff"),
      mutedSurface: value("--surface-muted", "#f7f7f4"),
      border: value("--line", "#ececea"),
      text: value("--foreground", "#111111"),
      muted: value("--text-muted", "#8b8b85"),
      soft: value("--text-soft", "#a6a69e"),
      primary: value("--primary", "#9bd13b"),
      primaryStrong: value("--primary-strong", "#6fa51f"),
      primarySoft: value("--primary-soft", "#edf8d5"),
      done: value("--chart-done-strong", "#6fa51f"),
      remaining: value("--chart-remaining-strong", "#b8b8af"),
      accent: value("--chart-accent", "#f2a24a"),
      accentStrong: value("--accent-strong", "#d76635"),
      danger: value("--chart-danger", "#df5b3a"),
      info: value("--chart-info", "#4a90d9"),
      slate: value("--chart-muted", "#a6a69e"),
      grid: value("--line", "#ececea")
    }
  };
};

const captureElementAsPng = async (target: HTMLElement): Promise<Blob> => {
  const rect = target.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  if (width <= 0 || height <= 0) throw new Error("Dashboard export không có kích thước hợp lệ.");

  const scale = exportScale(width, height);
  const svg = elementToSvg(target, width, height);
  const image = await loadImage(svgToDataUrl(svg));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không tạo được canvas export.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.drawImage(image, 0, 0, width, height);
  return canvasToPngBlob(canvas);
};

const elementToSvg = (
  target: HTMLElement,
  width: number,
  height: number
): string => {
  const clone = target.cloneNode(true) as HTMLElement;
  inlineComputedStyles(target, clone);
  clone.querySelectorAll(EXPORT_HIDDEN_SELECTOR).forEach((node) => node.remove());

  const wrapper = document.createElement("div");
  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.className = document.documentElement.className;
  wrapper.setAttribute(
    "style",
    [
      rootCssVariables(),
      `width:${width}px`,
      `min-height:${height}px`,
      `background:${getComputedStyle(document.body).backgroundColor}`,
      `color:${getComputedStyle(document.body).color}`,
      "margin:0",
      "padding:0",
      "box-sizing:border-box",
      "overflow:hidden"
    ].join(";")
  );

  wrapper.append(clone);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<foreignObject width="100%" height="100%">`,
    new XMLSerializer().serializeToString(wrapper),
    `</foreignObject>`,
    `</svg>`
  ].join("");
};

const svgToDataUrl = (svg: string): string => {
  const bytes = new TextEncoder().encode(svg);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:image/svg+xml;base64,${window.btoa(binary)}`;
};

const inlineComputedStyles = (source: Element, clone: Element): void => {
  const computed = getComputedStyle(source);
  const declarations: string[] = [];
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    declarations.push(`${property}:${computed.getPropertyValue(property)}`);
  }
  clone.setAttribute("style", declarations.join(";"));

  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);
  sourceChildren.forEach((sourceChild, index) => {
    const cloneChild = cloneChildren[index];
    if (cloneChild) inlineComputedStyles(sourceChild, cloneChild);
  });
};

const rootCssVariables = (): string => {
  const computed = getComputedStyle(document.documentElement);
  const declarations: string[] = [];
  for (let index = 0; index < computed.length; index += 1) {
    const property = computed.item(index);
    if (property.startsWith("--")) {
      declarations.push(`${property}:${computed.getPropertyValue(property)}`);
    }
  }
  return declarations.join(";");
};

const exportScale = (width: number, height: number): number => {
  const sideLimitedScale = MAX_CANVAS_SIDE / Math.max(width, height);
  const pixelLimitedScale = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
  return Math.max(1, Math.min(EXPORT_SCALE, sideLimitedScale, pixelLimitedScale));
};

const nextFrame = (): Promise<void> => {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không tạo được ảnh dashboard."));
    image.src = url;
  });
};

const canvasToPngBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("Không tạo được file PNG export."));
    }, "image/png");
  });
};

const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
};
