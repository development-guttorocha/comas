import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<LinkProps, "className"> & {
  className?: string;
  children: ReactNode;
};

/** Link de texto com o estilo compartilhado de navegação. */
export function PunkLink({ className, children, ...props }: Props) {
  return (
    <Link className={cn("punk-link", className)} {...props}>
      {children}
    </Link>
  );
}
