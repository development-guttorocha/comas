import type { Metadata, Viewport } from "next";
import { Archivo_Black, Caveat, DM_Sans, Fraunces } from "next/font/google";
import "@/app/globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const studioSerif = Fraunces({
  variable: "--font-studio-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const studioDisplay = Archivo_Black({
  variable: "--font-studio-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const studioHand = Caveat({
  variable: "--font-studio-hand",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Comas · Admin",
  description: "Estúdio de automação editorial e redes sociais Comas.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f3ef",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${dmSans.variable} ${studioSerif.variable} ${studioDisplay.variable} ${studioHand.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
