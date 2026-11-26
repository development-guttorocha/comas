"use client";

import { track } from "@vercel/analytics";
import { useEffect, useRef } from "react";
import styles from "@/app/(pt)/servicos/service-shell.module.css";

type CalendlyApi = { initInlineWidget(options: { url: string; parentElement: HTMLElement; prefill?: { name?: string; email?: string; customAnswers?: { a1?: string } } }): void };
declare global { interface Window { Calendly?: CalendlyApi } }

const SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";

/**
 * Calendly's inline scheduler, loaded on demand and tinted with the page's accent (colors
 * apply on paid Calendly plans; the free plan shows its own). A booking becomes a
 * `calendly_scheduled` analytics event. `note` fills the event's first question, if it has one.
 */
export default function CalendlyInline({ url, page, prefill, note }: { url: string; page: string; prefill?: { name?: string; email?: string }; note?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const name = prefill?.name, email = prefill?.email;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const accent = getComputedStyle(el).getPropertyValue("--svc-accent").trim().replace("#", "");
    const params = new URLSearchParams({ hide_event_type_details: "1", hide_gdpr_banner: "1", background_color: "151d20", text_color: "f8f8f5", ...(accent ? { primary_color: accent } : {}) });
    const init = () => {
      el.replaceChildren();
      window.Calendly?.initInlineWidget({ url: `${url}?${params}`, parentElement: el, prefill: name || email || note ? { name, email, ...(note ? { customAnswers: { a1: note } } : {}) } : undefined });
    };
    if (window.Calendly) { init(); return; }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", init, { once: true });
    return () => script?.removeEventListener("load", init);
  }, [url, name, email, note]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === "https://calendly.com" && e.data?.event === "calendly.event_scheduled") track("calendly_scheduled", { page });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [page]);

  return <div ref={ref} className={styles.calendly} />;
}
