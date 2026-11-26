import { CaseTag } from "@/components/ui/CaseTag";
import { Eyebrow } from "@/components/ui/Eyebrow";

interface CaseMetaRowProps {
  company: string;
  year: string;
  productTag?: string;
  /** Fundo escuro (hero PicPay etc.): cores claras */
  variant?: "default" | "onDark";
}

export default function CaseMetaRow({
  company,
  year,
  productTag,
  variant = "default",
}: CaseMetaRowProps) {
  const dim =
    variant === "onDark"
      ? "text-ink-muted"
      : "text-dim";
  const line = variant === "onDark" ? "bg-white/20" : "bg-line";
  const tagVariant =
    variant === "onDark" ? "metaProductOnDark" : "metaProductDefault";

  return (
    <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-10 md:mb-12">
      <Eyebrow as="span" variant="meta" className={dim}>
        {company}
      </Eyebrow>
      <span className={`w-10 h-px ${line}`} aria-hidden />
      {productTag ? <CaseTag variant={tagVariant}>{productTag}</CaseTag> : null}
      {productTag ? <span className={`w-10 h-px ${line}`} aria-hidden /> : null}
      <Eyebrow as="span" variant="metaYear" className={dim}>
        {year}
      </Eyebrow>
    </div>
  );
}
