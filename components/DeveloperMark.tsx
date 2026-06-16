import { cn } from "@/lib/ui";

interface DeveloperMarkProps {
  readonly className?: string;
  readonly compact?: boolean;
  readonly variant?: "card" | "inline";
}

export const DeveloperMark = ({
  className,
  compact = false,
  variant = "card"
}: DeveloperMarkProps): React.ReactElement => {
  if (variant === "inline") {
    return (
      <p
        className={cn(
          "text-[11px] font-semibold leading-4 text-[var(--text-muted)]",
          className
        )}
      >
        Phát triển:{" "}
        <span className="text-[var(--foreground)]">Lâm Phùng Phước Vinh</span>
        {" · "}Xưởng Điều khiển{" · "}Zalo:{" "}
        <span className="tabular-nums text-[var(--foreground)]">0947765212</span>
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-[var(--radius-field)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-[11px] leading-4 text-[var(--text-muted)]",
        className
      )}
    >
      <p className="font-semibold uppercase tracking-normal text-[var(--text-soft)]">
        Phát triển nội bộ
      </p>
      <p className="mt-1 font-semibold text-[var(--foreground)]">
        Lâm Phùng Phước Vinh
      </p>
      {compact ? null : (
        <p className="mt-0.5 font-semibold">Xưởng Điều khiển</p>
      )}
      <p className="mt-0.5 font-semibold">
        Zalo: <span className="tabular-nums">0947765212</span>
      </p>
    </div>
  );
};
