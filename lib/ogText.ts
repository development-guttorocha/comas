/**
 * A page title as the share card shows it: "Sobre — O mundo muda." becomes the label "Sobre"
 * over "O mundo muda."; the trailing "· Gutto Rocha" is dropped, since the card already signs it.
 * Shared by the card (lib/og.tsx) and the admin's live preview.
 */
export function splitTitle(title: string): { kicker: string; title: string } {
  const clean = title.replace(/\s*[·|]\s*Gutto Rocha\s*$/i, "").trim();
  const [left, ...rest] = clean.split(/\s+[—–-]\s+/);
  if (!rest.length) return { kicker: "", title: clean };
  const right = rest.join(" — ");
  // The card is already signed "Gutto Rocha"; a label saying it again adds nothing.
  return { kicker: left === "Gutto Rocha" ? "" : left, title: right.charAt(0).toUpperCase() + right.slice(1) };
}
