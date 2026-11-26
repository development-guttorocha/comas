import { pageCopy } from "@/lib/i18n/metadata";
import { shareCard, splitTitle } from "@/lib/og";

/** The fallback share image in English: the Home's card. */
export const alt = "Gutto Rocha";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const { title, description } = await pageCopy("home", "en");
  return shareCard({ title: splitTitle(title).title, line: description });
}
