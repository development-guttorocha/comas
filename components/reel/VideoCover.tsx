import PlayIcon from "./PlayIcon";
import s from "./reelLauncher.module.css";

export const thumb = (cover: string, width: number) => `/_next/image?url=${encodeURIComponent(cover)}&w=${width}&q=75`;

/** The video's cover with a play button in the middle and its length in the corner. */
export default function VideoCover({ cover, coverFocus, accent, time, label, onOpen, width = 1920, className = "" }: {
  cover?: string; coverFocus?: string; accent: string; time: string; label: string; onOpen: () => void; width?: number; className?: string;
}) {
  return (
    <button type="button" className={`${s.videoCover} ${className}`} onClick={onOpen} aria-label={label}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {cover ? <img src={thumb(cover, width)} alt="" className={s.videoImg} style={{ objectPosition: coverFocus ?? "50% 50%" }} loading="lazy" /> : null}
      <span className={s.videoShade} />
      <span className={s.play} style={{ background: accent }}><PlayIcon /></span>
      <span className={s.videoTime}>{time}</span>
    </button>
  );
}
