import Link from "next/link";

interface ModeSwitchProps {
  readonly activeMode: "workspace" | "supervision";
  readonly href: string;
  readonly className?: string;
}

export const ModeSwitch = ({
  activeMode,
  href,
  className = ""
}: ModeSwitchProps): React.ReactElement => {
  const isWorkspace = activeMode === "workspace";
  const targetLabel = isWorkspace ? "Giám sát" : "Workspace";

  return (
    <Link
      aria-label={`Chuyển sang ${targetLabel}`}
      className={`focus-ring group inline-flex min-h-12 w-full max-w-[18rem] items-center rounded-[var(--radius-field)] border border-[var(--primary)] bg-[var(--surface)] p-1 text-sm font-semibold text-[var(--primary-strong)] shadow-[var(--shadow-soft-sm)] transition duration-200 hover:bg-[var(--primary-soft)] hover:shadow-md sm:w-auto ${className}`}
      href={href}
    >
      <span className="relative grid w-full min-w-[13rem] grid-cols-2 rounded-[calc(var(--radius-field)-0.25rem)]">
        <span
          className={`absolute inset-y-0 left-0 w-1/2 rounded-[calc(var(--radius-field)-0.25rem)] bg-[var(--primary-strong)] shadow-md transition-transform duration-300 ease-out ${
            isWorkspace ? "translate-x-0" : "translate-x-full"
          }`}
        />
        <span
          className={`relative z-10 flex min-h-10 items-center justify-center rounded-[calc(var(--radius-field)-0.25rem)] px-4 transition-colors duration-200 ${
            isWorkspace ? "text-white" : "text-[var(--primary-strong)]"
          }`}
        >
          Workspace
        </span>
        <span
          className={`relative z-10 flex min-h-10 items-center justify-center rounded-[calc(var(--radius-field)-0.25rem)] px-4 transition-colors duration-200 ${
            isWorkspace ? "text-[var(--primary-strong)]" : "text-white"
          }`}
        >
          Giám sát
        </span>
      </span>
    </Link>
  );
};
