"use client";

import { track } from "@vercel/analytics";
import { useEffect } from "react";

/** Every click on an element with `data-cta` becomes a `cta_click` event, tagged with the page. */
export default function CtaTracker({ page }: { page: string }) {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-cta]");
      if (el?.dataset.cta) track("cta_click", { page, cta: el.dataset.cta });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [page]);
  return null;
}
