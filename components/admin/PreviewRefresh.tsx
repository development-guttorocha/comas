"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

/**
 * Inside the case preview's iframe: the editor posts "case-preview:refresh" after each change and
 * the page asks the server for the new render, keeping its scroll (router.refresh, no reload).
 * Then it tells the editor it is done, so the editor can send the next change.
 */
export default function PreviewRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "case-preview:refresh") return;
      start(() => router.refresh());
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "case-preview:ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);
  useEffect(() => {
    if (!pending) window.parent.postMessage({ type: "case-preview:idle" }, window.location.origin);
  }, [pending]);
  return null;
}
