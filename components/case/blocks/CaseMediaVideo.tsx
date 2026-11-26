import type { ReactNode } from "react";
import { CASE_MEDIA_BLOCK } from "@/lib/caseLayout";
import { CASE_MEDIA_VIDEO_ERROR } from "@/lib/caseTypography";
import styles from "./CaseMedia.module.css";

function toEmbedSrc(url: string): string | null {
  const trimmed = url.trim();
  const yt =
    trimmed.match(
      /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([\w-]{11})/i,
    )?.[1];
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vimeo = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i)?.[1];
  if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;
  return null;
}

type Base = {
  id?: string;
  className?: string;
  caption?: ReactNode;
};

export type CaseMediaVideoProps =
  | (Base & {
      kind: "embed";
      /** URL de partilha ou embed (YouTube / Vimeo). */
      url: string;
      title?: string;
    })
  | (Base & {
      kind: "file";
      src: string;
      poster?: string;
      /** Rótulo acessível (ex. descrição curta do vídeo). */
      label: string;
    });

/**
 * Vídeo em bloco editorial: embed (YouTube/Vimeo) ou ficheiro com poster.
 */
export default function CaseMediaVideo(props: CaseMediaVideoProps) {
  const { id, className = "", caption } = props;
  const wrap = `${styles.figure} ${className}`.trim();

  if (props.kind === "embed") {
    const embedSrc = toEmbedSrc(props.url);
    if (!embedSrc) {
      return (
        <div
          id={id}
          className={`${CASE_MEDIA_BLOCK} w-full max-w-full ${wrap}`.trim()}
        >
          <p className={CASE_MEDIA_VIDEO_ERROR}>
            URL de vídeo não suportada. Use um link YouTube ou Vimeo.
          </p>
        </div>
      );
    }
    const title = props.title?.trim() || "Vídeo incorporado";
    return (
      <figure
        id={id}
        className={`${CASE_MEDIA_BLOCK} w-full max-w-full ${wrap}`.trim()}
      >
        <div className={`${styles.frame} aspect-video`}>
          <iframe
            title={title}
            src={embedSrc}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        {caption ? (
          <figcaption className={styles.caption}>
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  return (
    <figure
      id={id}
      className={`${CASE_MEDIA_BLOCK} w-full max-w-full ${wrap}`.trim()}
    >
      <video
        className={`${styles.frame} ${styles.video}`}
        controls
        playsInline
        preload="metadata"
        poster={props.poster}
        aria-label={props.label}
      >
        <source src={props.src} type="video/mp4" />
      </video>
      {caption ? (
        <figcaption className={styles.caption}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
