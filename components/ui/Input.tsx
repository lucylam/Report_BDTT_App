import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly trailing?: ReactNode;
}

export const Input = ({
  trailing,
  className,
  ...props
}: InputProps): React.ReactElement => {
  if (trailing) {
    return (
      <div className={cn("control-pill flex rounded-full", className)}>
        <input
          className="focus-ring min-h-12 min-w-0 flex-1 rounded-l-full border-0 bg-transparent px-4 text-base font-semibold"
          {...props}
        />
        {trailing}
      </div>
    );
  }
  return (
    <input
      className={cn(
        "focus-ring control-pill min-h-12 w-full rounded-full px-4 text-base font-semibold",
        className
      )}
      {...props}
    />
  );
};
