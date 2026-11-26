import ServiceOgImage from "@/components/servicos/ServiceOgImage";
import { servicesHub } from "@/lib/services";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = servicesHub.seoTitle;
export default function Image() {
  return ServiceOgImage({ title: servicesHub.hero.title, line: "Prototipagem com IA, design system no Figma e Head de Design as a service.", accent: "#f8f8f5", onAccent: "#0b0b0b" });
}
