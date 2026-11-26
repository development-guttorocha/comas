import type { ReactNode } from "react";
import styles from "./guide.module.css";

const sizes = { display: styles.display, section: styles.sectionTitle, subheading: styles.subheading };

/** The Sobre signature: a statement in ink, continued on the next line in muted grey. */
export function SplitHeading({ as: Tag = "h2", size = "section", title, continuation, id, className }: {
  as?: "h1" | "h2" | "h3" | "p";
  size?: keyof typeof sizes;
  title: ReactNode;
  continuation?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <Tag id={id} className={[styles.heading, sizes[size], className].filter(Boolean).join(" ")}>
      {title}
      {continuation ? <><br /><span>{continuation}</span></> : null}
    </Tag>
  );
}

export function Kicker({ as: Tag = "p", children, className }: { as?: "p" | "h2" | "h3"; children: ReactNode; className?: string }) {
  return <Tag className={[styles.kicker, className].filter(Boolean).join(" ")}>{children}</Tag>;
}
