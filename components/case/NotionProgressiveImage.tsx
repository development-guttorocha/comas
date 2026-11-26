"use client";

import { ImageVeil, useImageReady } from "@/components/ImageVeil";
import { cropVars, type MediaCrop } from "@/lib/mediaCrop";
import cropStyles from "./MediaCrop.module.css";

type NotionProgressiveImageProps = {
  src: string;
  /** Shown on phones instead of `src`. */
  mobileSrc?: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  /** The area shown, set in the admin; `mobileCrop` for the phone version. */
  crop?: MediaCrop;
  mobileCrop?: MediaCrop;
};

export default function NotionProgressiveImage({
  src,
  mobileSrc,
  alt,
  className = "",
  wrapperClassName = "",
  loading = "lazy",
  fetchPriority = "auto",
  crop,
  mobileCrop,
}: NotionProgressiveImageProps) {
  const { ready, ref, markReady } = useImageReady();
  // A crop knows its proportion: the frame needs no placeholder height.
  const mobile = mobileSrc ? (mobileCrop ? "crop" : "whole") : undefined;

  return (
    // Notion gives no dimensions: hold a frame open until the image knows its height.
    <div className={`relative ${crop ? cropStyles.crop : ready ? "" : "aspect-[16/10]"} ${wrapperClassName}`.trim()} style={crop ? cropVars(crop, mobileCrop) : undefined} data-mobile={crop ? mobile : undefined}>
      <picture className="contents">
      {mobileSrc ? <source media="(max-width: 767px)" srcSet={mobileSrc} /> : null}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={loading}
        fetchPriority={fetchPriority}
        onLoad={markReady}
        onError={markReady}
        className={`transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          ready ? "opacity-100" : "opacity-0"
        } ${crop ? cropStyles.media : ""} ${className}`.trim()}
      />
      </picture>
      <ImageVeil ready={ready} />
    </div>
  );
}
