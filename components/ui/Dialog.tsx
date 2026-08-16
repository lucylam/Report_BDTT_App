"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
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
}: DialogProps): React.ReactElement | null => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialogNode = dialogRef.current;
    const focusableSelector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");
    const initialFocus = dialogNode?.querySelector<HTMLElement>(focusableSelector);
    (initialFocus ?? dialogNode)?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogNode) return;
      const focusable = Array.from(
        dialogNode.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => !element.hidden);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogNode.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const dialog = (
    <div
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className="fixed inset-0 z-[1000] flex items-end overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center sm:justify-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "bottom-sheet w-full p-6 sm:max-w-lg sm:rounded-[var(--radius-card)]",
          className
        )}
      >
        {eyebrow ? (
          <p
            className={cn(
              "text-sm font-semibold uppercase tracking-wide",
              eyebrowTone === "danger"
                ? "text-[var(--danger)]"
                : "text-[var(--primary-strong)]"
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-2 text-2xl font-semibold leading-tight" id={titleId}>{title}</h2>
        {description ? (
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--text-muted)]" id={descriptionId}>
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(dialog, document.body);
};
