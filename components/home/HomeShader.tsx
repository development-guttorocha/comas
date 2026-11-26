"use client";

import { useEffect, useRef } from "react";
import { mountMovingGradient } from "./shaders/mountMovingGradient";

/** Runs the authored Figma shader; the original poster stays behind it. */
export default function HomeShader({ className }: { className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvas.current) return;
    return mountMovingGradient(canvas.current);
  }, []);
  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}
