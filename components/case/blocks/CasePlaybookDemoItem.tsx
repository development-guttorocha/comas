import type { ReactNode } from "react";
import CasePlaybookGuide from "./CasePlaybookGuide";

export interface CasePlaybookDemoItemProps {
  /** Nome do componente (mesmo export). */
  name: string;
  description: ReactNode;
  usage: string;
  children: ReactNode;
}

/**
 * Exemplo de mídia no playbook: guia (nome + uso + texto) + renderização.
 */
export default function CasePlaybookDemoItem({
  name,
  description,
  usage,
  children,
}: CasePlaybookDemoItemProps) {
  return (
    <div className="space-y-4">
      <CasePlaybookGuide name={name} description={description} usage={usage} />
      {children}
    </div>
  );
}
