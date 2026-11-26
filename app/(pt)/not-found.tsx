"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import { useSiteContent } from "@/components/i18n/SiteContentProvider";
import { localizedHref } from "@/lib/navLocalePaths";
import HomeFigmaArt from "@/components/HomeFigmaArt";
import SiteNav from "@/components/SiteNav";
import { Button } from "@/components/ui/Button";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { Eyebrow } from "@/components/ui/Eyebrow";

/**
 * Ilustração: coloque `stay-puft.png` em `public/404/` (Stay Puft / tema Ghostbusters).
 * Se o ficheiro não existir, `HomeFigmaArt` omite a imagem e o texto continua a fazer sentido.
 */
export default function NotFound() {
  const { locale } = useLocale();
  const copy = useSiteContent();
  return (
    <>
      <SiteNav />

      <main className="relative w-full overflow-hidden bg-black">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,77,77,0.35) 0%, transparent 45%), radial-gradient(circle at 80% 70%, rgba(120,180,255,0.2) 0%, transparent 40%)",
          }}
        />

        <div className="content-wrap relative z-10 flex min-h-[min(72vh,720px)] flex-col items-center justify-center py-16 text-center md:flex-row md:gap-14 md:text-left lg:gap-20 lg:py-24">
          <div className="w-full max-w-[min(100%,380px)] shrink-0">
            <HomeFigmaArt
              src="/404/staypuft.webp"
              alt={copy.notFoundAlt}
              className="mx-auto w-full max-h-[min(52vh,420px)] object-contain drop-shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            />
          </div>

          <div className="flex max-w-xl flex-col gap-5">
            <Eyebrow variant="errorAccent">
              {copy.notFoundKicker}
            </Eyebrow>
            <DisplayHeading preset="notFoundTitle">
              {copy.notFoundTitle}
            </DisplayHeading>
            <p className="text-[clamp(1rem,2vw,1.125rem)] font-medium leading-relaxed tracking-[-0.02em] text-[#c8c6c0]">
              {copy.notFoundBody}
            </p>
            <div className="pt-2">
              <Button
                href={localizedHref("/", locale)}
                data-cursor="link"
                variant="solidAccentSans"
              >
                {copy.notFoundButton}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
