import CaseStatBand from "./CaseStatBand";
import type { CaseStatBandProps } from "./CaseStatBand";

export type CaseResultsSimpleProps = Omit<CaseStatBandProps, "sectionLabel"> & {
  /** Por defeito `// Resultados · simples`. */
  sectionLabel?: string;
};

/**
 * Resultados numéricos em grelha — mesmo bloco que `CaseStatBand`, com rótulo explícito para o playbook.
 */
export default function CaseResultsSimple({
  sectionLabel = "// Resultados · simples",
  ...rest
}: CaseResultsSimpleProps) {
  return <CaseStatBand sectionLabel={sectionLabel} {...rest} />;
}
