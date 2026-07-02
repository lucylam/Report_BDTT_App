import Link from "next/link";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/ui";

interface ModeSwitchProps {
  readonly activeMode: "workspace" | "supervision";
  readonly href: string;
  readonly className?: string;
}

export const ModeSwitch = ({
  activeMode,
  href,
  className
}: ModeSwitchProps): React.ReactElement => {
  const isWorkspace = activeMode === "workspace";
  const targetLabel = isWorkspace ? "Giám sát" : "Workspace";

  return (
    <Link
      aria-label={`Chuyển sang ${targetLabel}`}
      className={cn(
        "focus-ring group inline-flex min-h-11 w-full max-w-[18rem] min-w-0 items-center overflow-hidden rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] p-1 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-soft-sm)] transition hover:bg-[var(--surface-muted)] sm:w-auto",
        className
      )}
      href={href}
    >
      <span className="relative grid w-full min-w-0 grid-cols-2 rounded-[calc(var(--radius-field)-0.25rem)] sm:min-w-[12.5rem]">
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-1/2 rounded-[calc(var(--radius-field)-0.25rem)] bg-[var(--foreground)] shadow-md transition-transform duration-300 ease-out",
            isWorkspace ? "translate-x-0" : "translate-x-full"
          )}
        />
        <span
          className={cn(
            "relative z-10 flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-[calc(var(--radius-field)-0.25rem)] px-2 transition-colors duration-200 sm:px-3",
            isWorkspace ? "text-[var(--surface)]" : "text-[var(--text-muted)]"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" name="list" />
          <span className="min-w-0 truncate">Workspace</span>
        </span>
        <span
          className={cn(
            "relative z-10 flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-[calc(var(--radius-field)-0.25rem)] px-2 transition-colors duration-200 sm:px-3",
            isWorkspace ? "text-[var(--text-muted)]" : "text-[var(--surface)]"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" name="dashboard" />
          Giám sát
        </span>
      </span>
    </Link>
  );
};
