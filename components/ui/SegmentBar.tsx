export type SegmentTone =
  | "primary"
  | "success"
  | "accent"
  | "warning"
  | "danger"
  | "info"
  | "yellow"
  | "neutral";

const toneVar: Record<SegmentTone, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  accent: "var(--accent)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
  yellow: "var(--yellow)",
  neutral: "var(--text-soft)"
};

export interface Segment {
  readonly value: number;
  readonly tone?: SegmentTone;
  /** Màu tùy chỉnh (ghi đè tone) — ví dụ gán theo đơn vị/người phụ trách. */
  readonly color?: string;
  readonly label?: string;
}

interface SegmentBarProps {
  readonly segments: readonly Segment[];
  /** Hiện chú thích (chấm màu + nhãn + giá trị) bên dưới thanh. */
  readonly legend?: boolean;
  readonly className?: string;
}

/**
 * Thanh phân bổ nhiều màu theo tỉ lệ (clone allocation bar của family-budget).
 * BDTT: phân bổ công việc theo trạng thái / đơn vị / mức ưu tiên.
 */
export const SegmentBar = ({
  segments,
  legend = false,
  className
}: SegmentBarProps): React.ReactElement => {
  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <div className={className}>
      <div className="flex h-5 w-full overflow-hidden rounded-sm bg-[var(--line)]">
        {visible.map((segment, index) => (
          <div
            className="h-full"
            key={segment.label ?? index}
            style={{
              flexGrow: segment.value,
              flexBasis: 0,
              minWidth: "7%",
              backgroundColor: segment.color ?? toneVar[segment.tone ?? "neutral"]
            }}
            title={segment.label ? `${segment.label}: ${segment.value}` : undefined}
          />
        ))}
      </div>
      {legend ? (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {visible.map((segment, index) => (
            <li
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]"
              key={segment.label ?? index}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.color ?? toneVar[segment.tone ?? "neutral"] }}
              />
              {segment.label ? <span>{segment.label}</span> : null}
              <span className="tabular-nums text-[var(--foreground)]">{segment.value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
