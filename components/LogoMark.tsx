import { BRAND } from "@/lib/brand";

type LogoMarkProps = {
  className?: string;
  /**
   * `onLight`: símbolo escuro sobre fundo claro (círculo creme, header claro, menu).
   * `onDark`: símbolo claro sobre fundo escuro.
   */
  variant?: "onLight" | "onDark";
};

export function LogoMark({ className, variant = "onLight" }: LogoMarkProps) {
  const src =
    variant === "onDark" ? BRAND.symbolOnDarkBg : BRAND.symbolOnLightBg;
  return (
    <img
      src={src}
      alt=""
      width={64}
      height={64}
      className={["block object-contain", className].filter(Boolean).join(" ")}
      decoding="async"
    />
  );
}
