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
  const logoSize = isCompact ? "h-10 w-10" : isFull ? "h-16 w-16" : "h-14 w-14";

  return (
    <div
      aria-label="Tổng Công Ty Phân Bón Dầu Khí Cà Mau - Nhà máy Đạm Cà Mau"
      className={`flex min-w-0 items-center gap-4 ${className}`}
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
            className={`font-extrabold leading-tight text-[var(--foreground)] ${
              isFull ? "text-base md:text-lg" : "text-sm"
            }`}
          >
            Tổng Công Ty Phân Bón Dầu Khí Cà Mau
          </p>
          <p
            className={`mt-1 font-extrabold uppercase text-[var(--primary-strong)] ${
              isFull ? "text-sm" : "text-xs"
            }`}
          >
            Nhà máy Đạm Cà Mau
          </p>
          <p className={`${isFull ? "text-sm" : "text-xs"} mt-1 font-bold text-[var(--text-muted)]`}>
            Xưởng Điều khiển
          </p>
          {isFull ? (
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Chung một niềm tin - Vươn mình phát triển
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
