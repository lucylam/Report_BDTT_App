import { cn } from "@/lib/ui";

export type IconName =
  | "dashboard"
  | "people"
  | "workorder"
  | "data"
  | "help"
  | "settings"
  | "search";

interface IconProps {
  readonly name: IconName;
  readonly className?: string;
}

export const Icon = ({ name, className }: IconProps): React.ReactElement => {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      {name === "dashboard" ? (
        <>
          <rect height="7" rx="1.5" width="7" x="3" y="3" />
          <rect height="7" rx="1.5" width="7" x="14" y="3" />
          <rect height="7" rx="1.5" width="7" x="3" y="14" />
          <rect height="7" rx="1.5" width="7" x="14" y="14" />
        </>
      ) : null}
      {name === "people" ? (
        <>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 6a3 3 0 0 1 0 5.5" />
          <path d="M16.5 20a5.5 5.5 0 0 0-2-4" />
        </>
      ) : null}
      {name === "workorder" ? (
        <>
          <path d="M4 5h16" />
          <path d="M4 12h16" />
          <path d="M4 19h10" />
        </>
      ) : null}
      {name === "data" ? (
        <>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </>
      ) : null}
      {name === "help" ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.7" />
          <path d="M12 17h.01" />
        </>
      ) : null}
      {name === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
          <path d="m5 5 2 2" />
          <path d="m17 17 2 2" />
          <path d="m19 5-2 2" />
          <path d="m7 17-2 2" />
        </>
      ) : null}
      {name === "search" ? (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" />
        </>
      ) : null}
    </svg>
  );
};
