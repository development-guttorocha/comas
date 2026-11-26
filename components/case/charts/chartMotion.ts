"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { useContext, useEffect, useRef, useState } from "react";
import { StaticReveal } from "@/components/ScrollReveal";
import { useCaseImageTheme } from "@/components/ImageVeil";

/** Charts animate once, when most of the card is on screen; reduced motion shows the end state. */
export function useChartReveal<T extends Element>() {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const isStatic = useContext(StaticReveal);
  const reduce = (useReducedMotion() ?? false) || isStatic;
  return { ref, shown: inView || reduce, reduce };
}

/** Counts from `from` to `to` once `active`; returns the current value. */
export function useCountUp(to: number, active: boolean, { from = 0, duration = 1.2, delay = 0, instant = false } = {}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (!active || instant) return;
    const controls = animate(from, to, { duration, delay, ease: CHART_EASE, onUpdate: setValue });
    return () => controls.stop();
  }, [active, delay, duration, from, instant, to]);
  return instant ? to : value;
}

/** Highlight colour: the case brand colour inside a case, ink elsewhere. */
export function useChartAccent() {
  return useCaseImageTheme()?.color ?? "var(--color-ink)";
}

export const CHART_EASE = [0.16, 1, 0.3, 1] as const;
