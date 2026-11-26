import ServiceOgImage from "@/components/servicos/ServiceOgImage";
import { headDeDesign } from "@/lib/services";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = headDeDesign.seoTitle;
export default function Image() {
  return ServiceOgImage({ title: headDeDesign.serviceName, line: headDeDesign.card.summary, accent: headDeDesign.accent.color, onAccent: headDeDesign.accent.on });
}
