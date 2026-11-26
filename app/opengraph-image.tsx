import { pageCopy } from "@/lib/i18n/metadata";
import { shareCard, splitTitle } from "@/lib/og";

/** The fallback share image, for any page that does not name its own: the Home's card. */
export const alt = "Gutto Rocha";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const { title, description } = await pageCopy("home", "pt");
  return shareCard({ title: splitTitle(title).title, line: description });
}
