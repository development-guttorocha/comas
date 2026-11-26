import type { ReactNode } from "react";
import {
  CASE_TEXT_CODE_INLINE,
  CASE_TEXT_LINK_ACCENT,
} from "@/lib/caseTypography";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function RichTextSpan({ part }: { part: unknown }): ReactNode {
  if (!isObject(part)) return null;
  const plain = typeof part.plain_text === "string" ? part.plain_text : "";
  const ann = isObject(part.annotations) ? part.annotations : {};
  const bold = Boolean(ann.bold);
  const italic = Boolean(ann.italic);
  const code = Boolean(ann.code);
  const strikethrough = Boolean(ann.strikethrough);

  let href: string | undefined;
  const textObj = isObject(part.text) ? part.text : null;
  if (textObj && isObject(textObj.link) && typeof textObj.link.url === "string") {
    href = textObj.link.url;
  }
  if (typeof part.href === "string") href = part.href;

  let node: ReactNode = plain;
  if (code) {
    node = (
      <code className={CASE_TEXT_CODE_INLINE}>{plain}</code>
    );
  }
  if (bold && !code) node = <strong>{node}</strong>;
  if (italic) node = <em>{node}</em>;
  if (strikethrough) node = <s>{node}</s>;

  if (href) {
    node = (
      <a
        href={href}
        className={CASE_TEXT_LINK_ACCENT}
        target="_blank"
        rel="noopener noreferrer"
      >
        {node}
      </a>
    );
  }

  return <>{node}</>;
}

/** Rich text do Notion API → fragmentos React. */
export default function NotionRichText({ parts }: { parts: unknown[] }) {
  if (parts.length === 0) return null;
  return (
    <>
      {parts.map((part, i) => (
        <RichTextSpan key={i} part={part} />
      ))}
    </>
  );
}
