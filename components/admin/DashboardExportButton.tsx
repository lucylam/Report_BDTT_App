"use client";

import { createDashboardReportSvg } from "@/lib/dashboardReportImage";
import type { PhaseOneDashboardData } from "@/lib/dashboard";

interface DashboardExportButtonProps {
  readonly dashboard: PhaseOneDashboardData;
  readonly reportDateLabel: string;
}

export const DashboardExportButton = ({
  dashboard,
  reportDateLabel
}: DashboardExportButtonProps): React.ReactElement => {
  const exportPng = async (): Promise<void> => {
    const svg = createDashboardReportSvg({ dashboard, reportDateLabel });
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    try {
      const image = await loadImage(url);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Không tạo được canvas export.");
      context.drawImage(image, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      downloadUrl(pngUrl, "bdtt-dashboard-report.png");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <button
      className="focus-ring pressable min-h-12 rounded-full bg-[var(--primary-strong)] px-4 py-3 text-sm font-bold text-white shadow-[var(--shadow-soft-sm)]"
      onClick={() => {
        void exportPng();
      }}
      type="button"
    >
      Export ảnh báo cáo
    </button>
  );
};

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không tạo được ảnh dashboard."));
    image.src = url;
  });
};

const downloadUrl = (url: string, fileName: string): void => {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
