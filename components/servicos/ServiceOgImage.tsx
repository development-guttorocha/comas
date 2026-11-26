import { shareCard } from "@/lib/og";

/** Share image of a service page: the site's card, signed Design Services, in the service's color. */
export default function ServiceOgImage({ title, line, accent, onAccent }: { title: string; line: string; accent: string; onAccent: string }) {
  return shareCard({ kicker: "Design Services", title, line, accent: { color: accent, on: onAccent }, footer: "guttorocha.com.br/servicos" });
}
