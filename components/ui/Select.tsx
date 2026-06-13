import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/ui";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({
  className,
  children,
  ...props
}: SelectProps): React.ReactElement => {
  return (
    <span className="relative block">
      <select
        className={cn(
          "focus-ring control-pill min-h-12 w-full appearance-none rounded-[var(--radius-field)] px-4 pr-10 text-base font-semibold",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
};
