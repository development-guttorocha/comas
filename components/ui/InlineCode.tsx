import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

/** Código inline em documentação / texto editorial. */
export function InlineCode({ className, children, ...rest }: Props) {
  return (
    <code
      className={cn("font-mono text-[14px] text-subtle", className)}
      {...rest}
    >
      {children}
    </code>
  );
}
