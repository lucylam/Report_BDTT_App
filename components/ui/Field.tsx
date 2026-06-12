import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

interface FieldProps {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

export const Field = ({
  label,
  hint,
  error,
  className,
  children
}: FieldProps): React.ReactElement => {
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-extrabold">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? (
        <p className="mt-1.5 text-xs font-semibold text-[var(--text-muted)]">{hint}</p>
      ) : null}
      {error ? (
        <p aria-live="polite" className="mt-1.5 text-xs font-bold text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </label>
  );
};
