import s from "./skeleton.module.css";

// What is loading shows the shape of what comes, standing still (docs/admin/estilo): no "Carregando…",
// no shimmer. Hidden from screen readers, which get the label instead.

const WIDTHS = { text: ["92%", "100%", "78%", "96%", "64%"], rows: ["70%", "45%"], chat: ["62%", "38%", "54%"] } as const;

export default function Skeleton({ kind, label, count = 3 }: { kind: "text" | "rows" | "chat"; label: string; count?: number }) {
  return (
    <div className={s.skeleton} data-kind={kind} role="status" aria-label={label}>
      {kind === "text" ? WIDTHS.text.map((w, i) => <i key={i} style={{ width: w }} />) : null}
      {kind === "rows" ? Array.from({ length: count }, (_, i) => (
        <div key={i} className={s.row}><i style={{ width: WIDTHS.rows[0] }} /><i style={{ width: WIDTHS.rows[1] }} /></div>
      )) : null}
      {kind === "chat" ? WIDTHS.chat.map((w, i) => <i key={i} className={s.bubble} data-side={i % 2 ? "end" : undefined} style={{ width: w }} />) : null}
    </div>
  );
}
