import Image from "next/image";
import { cn } from "@/lib/ui";

interface CompanyBrandProps {
  readonly className?: string;
  readonly variant?: "compact" | "sidebar" | "full";
}

export const CompanyBrand = ({
  className,
  variant = "sidebar"
}: CompanyBrandProps): React.ReactElement => {
  const isCompact = variant === "compact";
  const isFull = variant === "full";
  const logoSize = isCompact ? "h-12 w-12" : isFull ? "h-20 w-20" : "h-16 w-16";

  return (
    <div
      aria-label="Tổng Công Ty Phân Bón Dầu Khí Cà Mau - Nhà máy Đạm Cà Mau"
      className={cn("flex min-w-0 items-center gap-3", className)}
    >
      <Image
        alt="PETROVIETNAM PVCFC"
        className={cn("shrink-0 object-contain", logoSize)}
        height={115}
        priority={isFull}
        src="/brand/pvcfc-logo.png"
        width={109}
      />
      {isCompact ? null : (
        <div className={cn("min-w-0", isFull ? "" : "flex-1")}>
          <p
            className={cn(
              "font-semibold uppercase leading-none text-[var(--primary-strong)]",
              isFull ? "text-xs" : "text-[10px]"
            )}
          >
            BDTT 2026
          </p>
          <p
            className={cn(
              "mt-1 font-semibold leading-tight text-[var(--foreground)]",
              isFull ? "text-base md:text-lg" : "text-sm"
            )}
          >
            Tổng Công Ty Phân Bón Dầu Khí Cà Mau
          </p>
          <p
            className={cn(
              "mt-1 font-semibold uppercase text-[var(--primary-strong)]",
              isFull ? "text-sm" : "text-xs"
            )}
          >
            Nhà máy Đạm Cà Mau
          </p>
          <p className={cn("mt-1 font-semibold text-[var(--text-muted)]", isFull ? "text-sm" : "text-xs")}>
            Xưởng Điều khiển
          </p>
          {isFull ? (
            <p className="mt-3 text-sm font-semibold text-[var(--text-muted)]">
              Tiến độ bảo dưỡng, giám sát WorkOrder và tổng hợp báo cáo nội bộ
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
