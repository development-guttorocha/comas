"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { motionEaseOut } from "@/lib/motion";
import styles from "./SobreStory.module.css";

type ChatMessage = { text: string; speaker?: string; mine?: boolean };

/** Messages accumulate in the existing layout; leaving the scene pauses the exchange. */
export function StoryChat({ messages, label, english = false }: {
  messages: ChatMessage[]; label: string; english?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: .45 });
  const reduce = useReducedMotion();
  const [received, setReceived] = useState(0);
  const [typing, setTyping] = useState(false);
  const shown = reduce ? messages.length : received;

  useEffect(() => {
    if (!inView || reduce || received >= messages.length) return;
    const previous = messages[received - 1];
    const next = messages[received];
    const readingTime = previous ? Math.min(2600, Math.max(900, previous.text.length * 18)) : 250;
    const typingTime = Math.min(1500, Math.max(650, next.text.length * 12));
    const typingTimer = window.setTimeout(() => setTyping(true), readingTime);
    const arrivalTimer = window.setTimeout(() => {
      setTyping(false);
      setReceived(count => count + 1);
    }, readingTime + typingTime);
    return () => {
      window.clearTimeout(typingTimer);
      window.clearTimeout(arrivalTimer);
    };
  }, [inView, reduce, received, messages]);

  return <div ref={ref} role="group" aria-label={label} className={`${styles.chatDevice}${english ? ` ${styles.chatEnglish}` : ""}`}>
    <div className={styles.chatScreen}>
      <ol className={styles.conversation} aria-label={label}>
        {messages.map((message, index) => <li key={message.text} className={message.mine ? styles.myReply : undefined}>
          {typing && inView && !reduce && index === shown ? <div className={styles.chatTyping} aria-hidden="true"><span /><span /><span /></div> : null}
          <motion.blockquote initial={false} animate={{ opacity: index < shown ? 1 : 0, y: index < shown ? 0 : 8, scale: index < shown ? 1 : .98 }} transition={{ duration: reduce ? 0 : .3, ease: motionEaseOut }} style={{ transformOrigin: message.mine ? "100% 100%" : "0% 100%" }}>
            {message.speaker ? <p className={styles.speaker}>{message.speaker}</p> : null}
            <p>{message.text}</p>
          </motion.blockquote>
        </li>)}
      </ol>
      <div className={styles.chatComposer} aria-hidden="true"><span>|</span><svg viewBox="0 0 24 24" fill="none"><path d="m3 3 19 9-19 9 4-9-4-9Zm4 9h15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></div>
    </div>
  </div>;
}
