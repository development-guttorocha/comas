"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type PageTransitionShellProps = {
  children: ReactNode;
};

type CurtainPhase = "idle" | "covering" | "revealing";
type BarPhase = "idle" | "loading" | "done";

/** Below this, a navigation feels instant and the curtain never shows. */
const SHOW_AFTER_MS = 400;
/** Once shown, the curtain stays at least this long so it never flashes. */
const MIN_VISIBLE_MS = 500;
/** Safety net: a navigation that never lands releases the curtain. */
const GIVE_UP_MS = 10000;

const curtainVariants: Variants = {
  idle: { opacity: 0 },
  covering: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
  revealing: { opacity: 0, transition: { duration: 0.35, ease: "easeIn" } },
};

// The bar races ahead, then slows down and never reaches the end on its own.
const barVariants: Variants = {
  idle: { scaleX: 0, opacity: 1 },
  loading: {
    scaleX: [0, 0.35, 0.6, 0.8, 0.9],
    opacity: 1,
    transition: { duration: GIVE_UP_MS / 1000, times: [0, 0.04, 0.15, 0.45, 1], ease: "easeOut" },
  },
  done: {
    scaleX: 1,
    opacity: 0,
    transition: {
      scaleX: { duration: 0.2, ease: "easeOut" },
      opacity: { duration: 0.3, delay: 0.2 },
    },
  },
};

export default function PageTransitionShell({
  children,
}: PageTransitionShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [curtain, setCurtain] = useState<CurtainPhase>("idle");
  const [bar, setBar] = useState<BarPhase>("idle");
  const originPathRef = useRef<string>(pathname);
  const shownAtRef = useRef(0);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  // Navigation starts on click: the bar shows at once, the curtain only covers slow arrivals.
  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!anchor) return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("#")) return;
      if (hrefAttr.startsWith("mailto:") || hrefAttr.startsWith("tel:")) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const nextHref = url.pathname + url.search + url.hash;
      if (nextHref === window.location.pathname + window.location.search + window.location.hash) return;

      e.preventDefault();
      router.push(nextHref);

      // Same page with another query or hash: nothing to show.
      if (reduceMotion || url.pathname === window.location.pathname) return;

      clearTimers();
      originPathRef.current = window.location.pathname;
      setBar("loading");
      // A seamless link lands on the same picture it leaves (a case's hero): no curtain.
      if (!anchor.hasAttribute("data-seamless")) {
        timersRef.current.push(window.setTimeout(() => {
          shownAtRef.current = performance.now();
          setCurtain("covering");
        }, SHOW_AFTER_MS));
      }
      timersRef.current.push(
        window.setTimeout(() => {
          setCurtain((current) => (current === "idle" ? current : "revealing"));
          setBar("done");
        }, GIVE_UP_MS),
      );
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [clearTimers, reduceMotion, router]);

  // The new page arrived: finish the bar, and lift the curtain after its minimum time.
  useEffect(() => {
    if (pathname === originPathRef.current) return;
    originPathRef.current = pathname;
    clearTimers();
    if (curtain !== "covering") {
      setBar((current) => (current === "idle" ? current : "done"));
      return;
    }
    const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAtRef.current));
    timersRef.current.push(
      window.setTimeout(() => {
        setCurtain("revealing");
        setBar("done");
      }, wait),
      // If animation frames stall (a background tab), still release the page.
      window.setTimeout(() => {
        setCurtain("idle");
        setBar("idle");
      }, wait + 600),
    );
  }, [clearTimers, pathname, curtain]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <>
      <div className="min-h-screen">{children}</div>

      {curtain !== "idle" ? (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[200] bg-card"
          initial="idle"
          animate={curtain}
          variants={curtainVariants}
          onAnimationComplete={(def) => {
            if (def === "revealing") setCurtain("idle");
          }}
        />
      ) : null}

      {bar !== "idle" ? (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 z-[201] h-[3px] origin-left bg-contact shadow-[0_0_12px_var(--color-contact)]"
          initial="idle"
          animate={bar}
          variants={barVariants}
          onAnimationComplete={(def) => {
            if (def === "done") setBar("idle");
          }}
        />
      ) : null}
    </>
  );
}
