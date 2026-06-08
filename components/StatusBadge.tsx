interface StatusBadgeProps {
  readonly label: string;
  readonly tone: "success" | "warning" | "danger" | "info" | "neutral";
}

const toneClass = {
  success: "bg-[var(--success)] text-white shadow-sm",
  warning: "bg-[var(--warning)] text-white shadow-sm",
  danger: "bg-[var(--danger)] text-white shadow-sm",
  info: "bg-[var(--info)] text-white shadow-sm",
  neutral: "bg-white text-slate-800 shadow-sm ring-1 ring-[var(--border-strong)]"
} as const;

export const StatusBadge = ({
  label,
  tone
}: StatusBadgeProps): React.ReactElement => {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold tabular-nums ${toneClass[tone]}`}
    >
      {label}
    </span>
  );
};
