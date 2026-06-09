import Image from "next/image";

interface CompanyBrandProps {
  readonly className?: string;
  readonly variant?: "compact" | "sidebar" | "full";
}

export const CompanyBrand = ({
  className = "",
  variant = "sidebar"
}: CompanyBrandProps): React.ReactElement => {
  const isCompact = variant === "compact";
  const isFull = variant === "full";
  const logoSize = isCompact ? "h-11 w-11" : isFull ? "h-20 w-20" : "h-16 w-16";

  return (
    <div
      aria-label="Tổng Công Ty Phân Bón Dầu Khí Cà Mau - Nhà máy Đạm Cà Mau"
      className={`flex items-center gap-4 ${className}`}
    >
      <Image
        alt="PETROVIETNAM PVCFC"
        className={`shrink-0 object-contain ${logoSize}`}
        height={115}
        src="/brand/pvcfc-logo.png"
        width={109}
      />
      {isCompact ? null : (
        <div className={`min-w-0 ${isFull ? "" : "flex-1"}`}>
          <p
            className={`font-bold leading-tight text-[var(--foreground)] ${
              isFull ? "text-lg md:text-xl" : "text-sm"
            }`}
          >
            Tổng Công Ty Phân Bón Dầu Khí Cà Mau
          </p>
          <p
            className={`mt-0.5 font-bold uppercase tracking-wide text-[var(--primary-strong)] ${
              isFull ? "text-sm md:text-base" : "text-xs"
            }`}
          >
            Nhà máy Đạm Cà Mau
          </p>
          <p
            className={`${isFull ? "text-sm" : "text-xs"} mt-1 font-semibold text-[var(--text-muted)]`}
          >
            Xưởng Điều khiển
          </p>
          {isFull ? (
            <p className="mt-3 text-sm font-semibold text-slate-700 md:text-base">
              Chung một niềm tin - Vươn mình phát triển
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
