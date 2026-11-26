import type { ReactNode } from "react";
import {
  CASE_HERO_DARK_EYEBROW,
  CASE_HERO_DARK_LEAD,
  CASE_HERO_DARK_MEGA,
  CASE_HERO_DARK_TITLE,
  CASE_STYLE_FONT_SIZE_HERO_DARK_MEGA,
  CASE_STYLE_FONT_SIZE_HERO_DARK_TITLE,
} from "@/lib/caseTypography";
import CaseHeroEditorialDock from "./CaseHeroMetaStrip";

/** Variante explícita: fundo escuro. Preferir `CaseHeroEditorial` com `tone="ink"`. Mesma faixa de meta (sem dock fixo). */
export default function CaseHeroDark({
  megaWord,
  megaAlign = "right",
  company,
  year,
  productTag,
  role,
  scopeLine,
  tags,
  accentTags,
  eyebrow,
  title,
  lead,
  id,
  className = "",
}: {
  megaWord?: string;
  megaAlign?: "left" | "right";
  company: string;
  year: string;
  productTag?: string;
  role?: string;
  scopeLine?: string;
  tags?: string[];
  accentTags?: string[];
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  id?: string;
  className?: string;
}) {
  const megaPos =
    megaAlign === "right"
      ? "right-[-6vw] top-1/2 -translate-y-1/2"
      : "left-[-6vw] top-1/2 -translate-y-1/2";

  return (
    <section
      id={id}
      className={`relative w-full bg-panel text-on-panel pad-section-lg overflow-hidden ${className}`.trim()}
    >
      {megaWord ? (
        <div
          aria-hidden
          className={`absolute ${megaPos} ${CASE_HERO_DARK_MEGA}`}
          style={{ fontSize: CASE_STYLE_FONT_SIZE_HERO_DARK_MEGA, opacity: 0.04 }}
        >
          {megaWord}
        </div>
      ) : null}
      <div className="content-wrap relative z-10">
        <CaseHeroEditorialDock
          enableDock={false}
          strip={{
            variant: "ink",
            company,
            year,
            role,
            scopeLine,
            productTag,
            tags: tags ?? [],
            accentTags: accentTags ?? [],
          }}
        >
          <p className={CASE_HERO_DARK_EYEBROW}>
            {eyebrow}
          </p>
          <h1
            className={CASE_HERO_DARK_TITLE}
            style={{ fontSize: CASE_STYLE_FONT_SIZE_HERO_DARK_TITLE }}
          >
            {title}
          </h1>
          {lead ? (
            <div className={CASE_HERO_DARK_LEAD}>
              {lead}
            </div>
          ) : null}
        </CaseHeroEditorialDock>
      </div>
    </section>
  );
}
