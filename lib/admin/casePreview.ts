import type { Case } from "@/lib/cases";
import type { NotionBlockNode } from "@/lib/notionBlockTree";

// The case editor's live preview: the editor sends what is on screen (saved or not) and the preview
// page renders the real case page with it. Only under `next dev`, in this process's memory, never on
// disk: closing the dev server forgets it, and the site never reads it.

export type CasePreview = { case: Case; body: NotionBlockNode[]; at: number };

const store = ((globalThis as { __casePreview?: Map<string, CasePreview> }).__casePreview ??= new Map());

export const setCasePreview = (slug: string, preview: Omit<CasePreview, "at">) => { store.set(slug, { ...preview, at: Date.now() }); };
export const getCasePreview = (slug: string) => store.get(slug);
