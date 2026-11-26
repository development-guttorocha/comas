"use client";

import type { ReactNode } from "react";
import { pillClassName } from "@/components/guide";
import { cn } from "@/lib/cn";

/** Opens the print dialog: the page prints its own A4 document (CurriculumPrint), ready to save as PDF. */
export function CurriculumPrintButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={cn(pillClassName, "curriculum-print-button", className)} onClick={() => window.print()}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
      </svg>
      {children}
    </button>
  );
}
