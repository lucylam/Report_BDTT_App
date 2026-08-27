import Link from "next/link";
import { Icon, type IconName } from "@/components/ui";
import { cn } from "@/lib/ui";

interface ModeSwitchProps {
  readonly activeMode: "workspace" | "supervision" | "taskInfo";
  readonly className?: string;
  readonly showSupervision?: boolean;
}

interface ModeItem {
  readonly key: ModeSwitchProps["activeMode"];
  readonly href: string;
  readonly icon: IconName;
  readonly label: string;
}

export const ModeSwitch = ({
  activeMode,
  className,
  showSupervision = false
}: ModeSwitchProps): React.ReactElement => {
  const items: ModeItem[] = [
    { key: "workspace", href: "/worker", icon: "list", label: "Workspace" },
    { key: "taskInfo", href: "/task-info", icon: "calendar", label: "Thông tin" }
  ];
  if (showSupervision) {
    items.splice(1, 0, {
      key: "supervision",
      href: "/admin",
      icon: "dashboard",
      label: "Giám sát"
    });
  }

  return (
    <nav
      aria-label="Chuyển màn hình BDTT"
      className={cn(
        "mobile-mode-switch grid min-h-11 w-full min-w-0 items-center gap-1 rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] p-1 text-sm font-semibold text-[var(--foreground)] shadow-[var(--shadow-soft-sm)] lg:w-auto",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = activeMode === item.key;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-ring pressable flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-[calc(var(--radius-field)-0.25rem)] px-1.5 text-center leading-tight no-underline transition-colors max-[360px]:[&>svg]:hidden sm:px-3",
              active
                ? "bg-[var(--foreground)] text-[var(--surface)] shadow-md"
                : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            )}
            href={item.href}
            key={item.key}
          >
            <Icon className="h-4 w-4 shrink-0" name={item.icon} />
            <span className="mobile-button-label whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
