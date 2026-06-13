import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/ui";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = ({
  className,
  ...props
}: TextareaProps): React.ReactElement => {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-28 w-full resize-y rounded-[var(--radius-field)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-base leading-6",
        className
      )}
      {...props}
    />
  );
};
