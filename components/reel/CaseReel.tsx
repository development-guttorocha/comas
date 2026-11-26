"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ReelDoc } from "@/lib/reel/types";
import { beatTime, type ReelTrack } from "@/lib/reel/tracks";
import ScrollReveal from "@/components/ScrollReveal";
import story from "@/components/case/blocks/CaseStoryBlocks.module.css";
import VideoCover from "./VideoCover";
import s from "./caseReel.module.css";

// The case's reel, as a light cover until someone presses play. Only then do the stage,
// its images and the music load.

const ReelPlayer = dynamic(() => import("./ReelPlayer"), { ssr: false });

export const LABELS = {
  pt: {
    eyebrow: "O case em vídeo",
    watch: "Assistir ao case",
    intro: "O case resumido em {t}, com música. Dá para pausar, voltar e ver em tela cheia.",
    play: "Reproduzir",
    pause: "Pausar",
    replay: "Ver de novo",
    mute: "Tirar o som",
    unmute: "Ligar o som",
    fullscreen: "Tela cheia",
    exitFullscreen: "Sair da tela cheia",
    loading: "Preparando o vídeo",
    progress: "Posição no vídeo",
    music: "Música",
    talk: "Fale comigo",
    talkHref: "/fale-comigo",
    draft: "Rascunho: só aparece neste computador",
    closeFloat: "Fechar o vídeo do case",
  },
  en: {
    eyebrow: "The case in a video",
    watch: "Watch the case study",
    intro: "The case study in {t}, with music. Pause, scrub back or watch it full screen.",
    play: "Play",
    pause: "Pause",
    replay: "Watch again",
    mute: "Mute",
    unmute: "Unmute",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    loading: "Getting the video ready",
    progress: "Position in the video",
    music: "Music",
    talk: "Let's talk",
    talkHref: "/en/contato",
    draft: "Draft: only shows on this computer",
    closeFloat: "Close the case video",
  },
};

export const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, "0")}`;

/** The music, created and started inside the click so browsers let it play once the stage is ready. */
export function useReelAudio(track: ReelTrack) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const open = () => {
    const a = new Audio(track.src);
    a.preload = "auto";
    a.muted = true;
    a.play().then(() => {
      a.pause();
      a.muted = false;
    }).catch(() => {
      a.muted = false;
    });
    setAudio(a);
  };
  const close = () => { audio?.pause(); setAudio(null); };
  return { audio, open, close };
}

export default function CaseReel({ doc, track, cover, coverFocus }: { doc: ReelDoc; track: ReelTrack; cover?: string; coverFocus?: string }) {
  const labels = LABELS[doc.lang ?? "pt"];
  const { audio, open } = useReelAudio(track);
  const duration = beatTime(track, doc.end);

  // CaseStatement, the content editor's "Frase": the sentence centered, the video under it.
  return (
    <section className={`${story.statement} ${s.section}`} aria-label={labels.eyebrow}>
      <div className="content-wrap">
        <ScrollReveal tone="editorial">
          <p className={story.label}>{labels.eyebrow}{doc.draft ? <span className={s.draft}>{labels.draft}</span> : null}</p>
          <p className={story.statementText}>{doc.title || labels.watch}</p>
          <p className={story.statementCaption}>{labels.intro.replace("{t}", fmt(duration))}</p>
        </ScrollReveal>
        <ScrollReveal tone="editorial" delay={.08} className={s.frame}>
          {audio ? <ReelPlayer doc={doc} track={track} audio={audio} labels={labels} /> : (
            <VideoCover cover={cover} coverFocus={coverFocus} accent={doc.accent} time={fmt(duration)} label={`${labels.watch} · ${fmt(duration)}`} onOpen={open} />
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
