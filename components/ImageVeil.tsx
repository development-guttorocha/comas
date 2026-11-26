"use client";

import Image, { getImageProps, type ImageProps } from "next/image";
import { createContext, useCallback, useContext, useState, type ReactNode, type Ref } from "react";

/** Brand colour and case name shown over case images while they load. */
type CaseImageTheme = { color?: string; label: string };

const CaseImageThemeContext = createContext<CaseImageTheme | null>(null);

export function CaseImageThemeProvider({ color, label, children }: CaseImageTheme & { children: ReactNode }) {
  return <CaseImageThemeContext.Provider value={{ color, label }}>{children}</CaseImageThemeContext.Provider>;
}

export function useCaseImageTheme() {
  return useContext(CaseImageThemeContext);
}

/** Fades an image in once it arrives (see `globals.css`). */
export const IMAGE_FADE_IN_CLASS = "image-fade-in";

/**
 * Load state for an image. One that finished before hydration is ready at once and skips
 * the fade, so cached images never blink.
 */
export function useImageReady() {
  const [state, setState] = useState<"loading" | "cached" | "loaded">("loading");
  const markReady = useCallback(() => setState((current) => (current === "loading" ? "loaded" : current)), []);
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete) setState((current) => (current === "loading" ? "cached" : current));
  }, []);
  return {
    ready: state !== "loading",
    fadeClass: state === "loaded" ? IMAGE_FADE_IN_CLASS : "",
    ref,
    markReady,
  };
}

/** Background shown under an image that is not part of a case. */
export const IMAGE_LOADING_BACKGROUND = "var(--color-card)";

/**
 * Covers its positioned parent until the image is ready: the case brand colour with the
 * case name pulsing, or the neutral grey outside a case.
 */
export function ImageVeil({ ready, color, label, className = "" }: { ready: boolean; color?: string; label?: string; className?: string }) {
  const theme = useCaseImageTheme();
  const background = color ?? theme?.color ?? IMAGE_LOADING_BACKGROUND;
  const text = label ?? theme?.label;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-[1] grid place-items-center overflow-hidden p-6 transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        ready ? "opacity-0" : "opacity-100"
      } ${className}`.trim()}
      style={{ backgroundColor: background }}
    >
      {text ? (
        <span
          className={`select-none text-center text-[clamp(22px,3.2vw,56px)] font-bold leading-none tracking-[-0.04em] text-white/90 motion-reduce:animate-none ${
            ready ? "" : "animate-pulse"
          }`}
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}

/** Optional art direction: another file on phones, and the point a cropped image keeps in view. */
export type ArtDirection = { mobileSrc?: string; focus?: string };

/** Phones get `mobileSrc` from a <picture> source, so they download only their own file. */
export function ArtImage({ mobileSrc, focus, className, style, ref, alt, ...props }: ImageProps & ArtDirection & { ref?: Ref<HTMLImageElement> }) {
  // A component just added in the admin has no file yet: draw nothing rather than an empty src.
  if (!props.src) return null;
  // The focus belongs to the main image; a phone version is composed for its own frame.
  const position = focus ? `[object-position:var(--focus)]${mobileSrc ? " max-md:[object-position:50%_50%]" : ""}` : "";
  const image = <Image {...props} alt={alt} ref={ref} className={[className, position].filter(Boolean).join(" ") || undefined} style={focus ? { ...style, ["--focus" as string]: focus } : style} />;
  if (!mobileSrc) return image;
  const { props: { srcSet } } = getImageProps({ ...props, alt, src: mobileSrc });
  return <picture className="contents"><source media="(max-width: 767px)" srcSet={srcSet} sizes={props.sizes} />{image}</picture>;
}

/**
 * `next/image` with a loading state. Inside a case it draws an `ImageVeil` (its parent must
 * be positioned); elsewhere it only paints the grey on the image itself, so layout is untouched.
 */
export function VeiledImage({ alt, className, onLoad, onError, style, veilClassName, ...props }: ImageProps & ArtDirection & { veilClassName?: string }) {
  const theme = useCaseImageTheme();
  const { ready, fadeClass, ref, markReady } = useImageReady();
  const image = (
    <ArtImage
      {...props}
      alt={alt}
      className={[className, fadeClass].filter(Boolean).join(" ") || undefined}
      ref={ref}
      onLoad={(e) => { markReady(); onLoad?.(e); }}
      onError={(e) => { markReady(); onError?.(e); }}
      style={theme || ready ? style : { ...style, backgroundColor: IMAGE_LOADING_BACKGROUND }}
    />
  );
  if (!theme) return image;
  return <>{image}<ImageVeil ready={ready} className={veilClassName} /></>;
}
