import type { ReactNode } from "react";
import { CASE_MEASURE_PROSE } from "@/lib/caseLayout";
import {
  CASE_PLAYBOOK_NAME,
  CASE_PLAYBOOK_USAGE_PRE,
  CASE_TEXT_BODY,
} from "@/lib/caseTypography";

export interface CasePlaybookGuideProps {
  /** Nome do export em `components/case/blocks`. */
  name: string;
  /** Para que serve o bloco — texto neutro de documentação. */
  description: ReactNode;
  /** Referência mínima: import e/ou JSX típico. */
  usage: string;
  className?: string;
  /** Âncora opcional (menu local do case). */
  id?: string;
}

/**
 * Documentação inline do playbook: nome, snippet de uso e descrição antes de cada exemplo.
 */
export default function CasePlaybookGuide({
  name,
  description,
  usage,
  className = "",
  id,
}: CasePlaybookGuideProps) {
  return (
    <div id={id} className={`space-y-3 ${className}`.trim()}>
      <span className={CASE_PLAYBOOK_NAME}>
        {name}
      </span>
      <pre className={CASE_PLAYBOOK_USAGE_PRE}>
        <code>{usage}</code>
      </pre>
      <div className={`${CASE_TEXT_BODY} ${CASE_MEASURE_PROSE}`}>
        {description}
      </div>
    </div>
  );
}
