"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { createContext, useContext, useRef, type ReactNode } from "react";
import {
  motionEaseOut,
  scrollRevealTone,
  type ScrollRevealTone,
} from "@/lib/motion";

export { motionEaseOut } from "@/lib/motion";

/** Inside it, content shows at once with no entrance (the admin's previews). */
export const StaticReveal = createContext(false);

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  /** Sobrepõe distância do preset */
  distance?: number;
  /** Sobrepõe duração do preset */
  duration?: number;
  /** Ritmo: standard (padrão), editorial (manifesto), snap (CTA) */
  tone?: ScrollRevealTone;
  as?: "div" | "section" | "span" | "p" | "h2" | "h3";
}

export default function ScrollReveal({
  children,
  className = "",
  delay = 0,
  direction = "up",
  distance: distanceProp,
  duration: durationProp,
  tone = "standard",
  as = "div",
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-12% 0px -8% 0px" });
  const isStatic = useContext(StaticReveal);
  const reduceMotion = useReducedMotion() || isStatic;

  const preset = scrollRevealTone[tone];
  const duration = durationProp ?? preset.duration;
  const distance = distanceProp ?? preset.distance;

  const from = {
    opacity: 0,
    y: direction === "up" ? distance : 0,
    x: direction === "left" ? -distance : direction === "right" ? distance : 0,
  };

  const initial = reduceMotion ? { opacity: 1, y: 0, x: 0 } : from;
  const animate =
    reduceMotion || isInView ? { opacity: 1, y: 0, x: 0 } : from;

  const Component = motion[as] as typeof motion.div;

  return (
    <Component
      ref={ref}
      className={className}
      initial={initial}
      animate={animate}
      transition={{
        duration: reduceMotion ? 0 : duration,
        delay: reduceMotion ? 0 : delay,
        ease: motionEaseOut,
      }}
    >
      {children}
    </Component>
  );
}
