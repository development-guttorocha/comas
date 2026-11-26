import type { ReactNode } from "react";
import ScrollReveal from "@/components/ScrollReveal";
import styles from "./CaseEditorialBlocks.module.css";
import { Eyebrow } from "@/components/ui/Eyebrow";

import {
  CASE_PULL_QUOTE_BLOCK,
  CASE_STYLE_FONT_SIZE_DISPLAY_QUOTE,
  CASE_TEXT_DISPLAY_QUOTE,
} from "@/lib/caseTypography";

interface CasePullQuoteProps {
  /** Ex.: // Learning — omitir ou vazio = só o bloco de citação */
  label?: string;
  children: ReactNode;
  centered?: boolean;
  bgClass?: string;
  id?: string;
  sectionClassName?: string;
  /** Borda da secção; string vazia = sem borda. */
  borderClass?: string;
}

export default function CasePullQuote({
  label,
  children,
  centered = true,
  bgClass = "bg-transparent",
  id,
  sectionClassName = "",
  borderClass = "",
}: CasePullQuoteProps) {
  const showLabel = Boolean(label?.trim());

  return (
    <section
      id={id}
      className={`${styles.sectionPad} ${borderClass} ${bgClass} ${sectionClassName}`.trim()}
    >
      <div className="content-wrap">
        <ScrollReveal tone="editorial">
          <div
            className={`${styles.quoteMeasure} ${centered ? styles.quoteCentered : ""}`}
          >
            {showLabel ? (
              <Eyebrow
                as="span"
                variant="blockQuoteLabel"
                className="mb-8 block md:mb-10"
              >
                {label}
              </Eyebrow>
            ) : null}
            <blockquote
              className={`${CASE_PULL_QUOTE_BLOCK} ${centered ? "mx-auto" : ""}`}
            >
              <div
                className={CASE_TEXT_DISPLAY_QUOTE}
                style={{ fontSize: CASE_STYLE_FONT_SIZE_DISPLAY_QUOTE }}
              >
                {children}
              </div>
            </blockquote>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
