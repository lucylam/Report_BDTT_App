import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "md" | "sm";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--primary-strong)] text-[var(--primary-contrast)] shadow-[var(--shadow-soft-sm)] hover:bg-[var(--success-strong)]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
  danger:
    "bg-[var(--danger)] text-white shadow-[var(--shadow-soft-sm)] hover:bg-[var(--danger-strong)]",
  ghost:
    "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
};

const sizeClass: Record<ButtonSize, string> = {
  md: "min-h-12 px-5 text-sm",
  sm: "min-h-9 px-4 text-xs"
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly full?: boolean;
}

export const Button = ({
  variant = "primary",
  size = "md",
  full = false,
  className,
  type = "button",
  ...props
}: ButtonProps): React.ReactElement => {
  return (
    <button
      className={cn(
        "focus-ring pressable inline-flex items-center justify-center gap-2 rounded-[var(--radius-field)] font-semibold disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)] disabled:text-[var(--text-soft)] disabled:shadow-none",
        variantClass[variant],
        sizeClass[size],
        full && "w-full",
        className
      )}
      type={type}
      {...props}
    />
  );
};
