"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/ui";

interface DialogProps {
  readonly title: string;
  readonly eyebrow?: string;
  readonly eyebrowTone?: "primary" | "danger";
  readonly description?: string;
  readonly onClose: () => void;
  readonly className?: string;
  readonly children: ReactNode;
}

export const Dialog = ({
  title,
  eyebrow,
  eyebrowTone = "primary",
  description,
  onClose,
  className,
  children
}: DialogProps): React.ReactElement => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
    >
      <div
        className={cn(
          "bottom-sheet w-full p-6 sm:max-w-lg sm:rounded-[var(--radius-card)]",
          className
        )}
      >
        {eyebrow ? (
          <p
            className={cn(
              "text-sm font-bold uppercase tracking-wide",
              eyebrowTone === "danger"
                ? "text-[var(--danger)]"
                : "text-[var(--primary-strong)]"
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-extrabold leading-tight">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--text-muted)]">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
};
