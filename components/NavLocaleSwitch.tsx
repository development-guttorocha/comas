"use client";
import { useRouter } from "next/navigation";
import { useId, useRef, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { localePathEnFrom, localePathPtFrom } from "@/lib/navLocalePaths";
import styles from "./NavLocaleSwitch.module.css";
import { saveLocalePreference } from "@/app/actions/locale";

const languages = [
  { value: "pt", name: "Português", lang: "pt-BR" },
  { value: "en", name: "English", lang: "en" },
] as const;

/** The menu's language pill opens a centred dialog listing the languages in large type. */
export default function NavLocaleSwitch({ pathname }: { pathname: string; surface?: "default" | "onDark" }) {
  const router = useRouter();
  const { t } = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const pt = localePathPtFrom(pathname), en = localePathEnFrom(pathname);
  const current = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "pt";

  function choose(value: "pt" | "en") {
    const href = value === "en" ? en : pt;
    dialog.current?.close();
    if (!href || href === pathname) return;
    const suffix = window.location.search + window.location.hash;
    startTransition(async () => {
      // Setting this cookie on the server also invalidates prefetched locale routes.
      await saveLocalePreference(value);
      router.push(href + suffix, { scroll: false });
    });
  }

  return <>
    <button type="button" className={styles.trigger} aria-haspopup="dialog" aria-busy={pending} disabled={pending}
      onClick={() => dialog.current?.showModal()}>
      <span className="sr-only">{t("Idioma")}: </span>{languages.find(l => l.value === current)!.name}
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className={styles.head}>
        <p id={titleId} className={styles.title}>{t("Selecione seu idioma")}</p>
        <button type="button" className={styles.close} onClick={() => dialog.current?.close()}>
          <span className="sr-only">{t("Fechar")}</span><span aria-hidden>×</span>
        </button>
      </div>
      <ul className={styles.list}>
        {languages.map(language => {
          const unavailable = language.value === "en" && !en;
          return <li key={language.value}>
            <button type="button" lang={language.lang} className={styles.option} aria-current={language.value === current ? "true" : undefined}
              disabled={unavailable} onClick={() => choose(language.value)}>
              {language.name}
            </button>
          </li>;
        })}
      </ul>
    </dialog>
  </>;
}
