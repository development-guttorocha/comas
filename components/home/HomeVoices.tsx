"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { SiteLocale } from "@/lib/siteLocale";
import { homeText } from "./homeCopy";
import styles from "./HomeChapters.module.css";

type Voice = { quote: string; company: string; preposition: string; portrait: string };

export default function HomeVoices({ title, voices, locale }: { title: string; voices: Voice[]; locale: SiteLocale }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (paused || voices.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % voices.length), 7000);
    return () => window.clearInterval(timer);
  }, [paused, voices.length]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % voices.length
      : event.key === "ArrowLeft" ? (index + voices.length - 1) % voices.length
      : event.key === "Home" ? 0 : event.key === "End" ? voices.length - 1 : null;
    if (next === null) return;
    event.preventDefault(); setActive(next);
    root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return <div ref={root} className={styles.voices}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={event => { if (!root.current?.contains(event.relatedTarget as Node)) setPaused(false); }}>
    {/* Each testimonial brings its designer's illustration; all share the same crop and fade. */}
    <div className={styles.portrait} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- illustrations keep their authored crop via CSS */}
      {voices.map((voice, index) => <img key={voice.company} src={voice.portrait} width={1024} height={1536} alt=""
        data-active={index === active ? "" : undefined} loading={index ? "lazy" : undefined} />)}
    </div>
    <div className={styles.voiceStage} aria-live={paused ? "polite" : "off"}>
      {voices.map((voice, index) => <figure key={voice.company} id={id + "-panel-" + index} role="tabpanel" aria-labelledby={id + "-tab-" + index}
        className={styles.voice} data-active={index === active ? "" : undefined} aria-hidden={index !== active}>
        <h2 id={index === active ? "voices-title" : undefined} className={styles.kicker}>{title}</h2>
        <blockquote>“{voice.quote}”</blockquote>
      </figure>)}
    </div>
    <div className={styles.voicePicker} role="tablist" aria-label={homeText(locale, "Escolher depoimento")}>
      {voices.map((voice, index) => <button key={voice.company} type="button" role="tab" id={id + "-tab-" + index}
        aria-controls={id + "-panel-" + index} aria-selected={index === active} tabIndex={index === active ? 0 : -1}
        onKeyDown={event => onKeyDown(event, index)} onClick={() => setActive(index)}>
        {voice.preposition} <b>{voice.company}</b>
      </button>)}
    </div>
  </div>;
}
