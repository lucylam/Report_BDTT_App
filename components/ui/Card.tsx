import type { ElementType, HTMLAttributes } from "react";
import { cn } from "@/lib/ui";

export type CardVariant = "glass" | "solid" | "metric";
export type CardPadding = "none" | "sm" | "md" | "lg";

const variantClass: Record<CardVariant, string> = {
  glass: "glass-card",
  solid: "border border-[var(--border)] bg-white shadow-[var(--shadow-soft-sm)]",
  metric: "metric-card"
};

const paddingClass: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6"
};

interface CardProps extends HTMLAttributes<HTMLElement> {
  readonly variant?: CardVariant;
  readonly padding?: CardPadding;
  readonly as?: ElementType;
}

export const Card = ({
  variant = "glass",
  padding = "md",
  as: Tag = "div",
  className,
  ...props
}: CardProps): React.ReactElement => {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-card)]",
        variantClass[variant],
        paddingClass[padding],
        className
      )}
      {...props}
    />
  );
};
