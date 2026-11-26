import Link from "next/link";
import { LogoMark } from "@/components/LogoMark";
import { IconCompass, IconFileText, IconLayers, IconSliders } from "@/components/recursos/CareerIcons";
import MaterialGate from "@/components/recursos/MaterialGate";
import type { CareerConsultingContent, CareerTrackContent } from "@/lib/resources";
import styles from "@/app/(pt)/recursos/material.module.css";

/**
 * Unauthenticated entry for `/recursos/trilha-de-carreira/completa`.
 * Matches the portfolio's dark dotted studio grammar with a compact e-mail OTP card.
 */
export default function CareerKitAuthScreen({
  page,
  consulting,
}: {
  page: CareerTrackContent;
  consulting: CareerConsultingContent;
}) {
  return (
    <div className={styles.studioShell}>
      <header className={styles.studioNavWrap}>
        <nav className={styles.studioNav} aria-label="Navegação da trilha">
          <div className={styles.navLeft}>
            <Link href="/recursos" className={styles.navBrand}>
              <span className={styles.navLogoWrap}>
                <LogoMark variant="onDark" className={styles.navLogo} />
              </span>
              <span>Design Resources</span>
            </Link>
            <span className={styles.navDivider} aria-hidden="true">/</span>
            <span className={styles.navCurrent}>Trilha de carreira</span>
          </div>
          <Link href="/recursos/trilha-de-carreira" className={styles.navBackBtn}>
            ← Voltar para a trilha
          </Link>
        </nav>
      </header>

      <main className={styles.studioMain}>
        <section className={styles.authBoard} aria-labelledby="trilha-auth-title">
          <span className={styles.boardTab} aria-hidden="true">◇ Trilha / Acesso com código</span>

          <div className={styles.authGrid}>
            <div className={styles.authIntro}>
              <p className={styles.heroBadge}>Acesso gratuito · salvo na sua conta</p>
              <h1 id="trilha-auth-title">
                Sua trilha de carreira
                <span> salva para cada 1:1.</span>
              </h1>
              <p className={styles.authLead}>
                Entre com seu e-mail. Você recebe um código de 6 dígitos na hora, sem senha para decorar, e tudo o que preencher fica guardado para voltar sempre que precisar.
              </p>

              <ol className={styles.authModules}>
                <li>
                  <span className={styles.moduleIcon}><IconCompass /></span>
                  <div>
                    <strong>01 · Momento na cadeira</strong>
                    <span>Chegada, Consistência, Domínio ou Transição: como agir em cada fase.</span>
                  </div>
                </li>
                <li>
                  <span className={styles.moduleIcon}><IconLayers /></span>
                  <div>
                    <strong>02 · Mapa de competências em 3 eixos</strong>
                    <span>Execução, comportamento e negócio nos 7 papéis em rede, sem trilha em Y.</span>
                  </div>
                </li>
                <li>
                  <span className={styles.moduleIcon}><IconSliders /></span>
                  <div>
                    <strong>03 · Autoavaliação × Liderança</strong>
                    <span>Notas de 1 a 5 em 10 habilidades com gráfico comparativo de alinhamento.</span>
                  </div>
                </li>
                <li>
                  <span className={styles.moduleIcon}><IconFileText /></span>
                  <div>
                    <strong>04 · Plano, entregas e resumo</strong>
                    <span>Plano do trimestre, diário de entregas e pedido de reconhecimento em PDF.</span>
                  </div>
                </li>
              </ol>
            </div>

            <div className={styles.authCard}>
              <h2>Entrar com código no e-mail</h2>
              <p className={styles.authCardLead}>
                Se já acessou antes, use o mesmo e-mail para recuperar suas respostas salvas.
              </p>
              <MaterialGate
                id="auth-completa"
                copy={page.gate}
                material={page.serviceName}
                page="/recursos/trilha-de-carreira"
                href="/recursos/trilha-de-carreira/completa"
                consultingHref={`/recursos/${consulting.slug}`}
                defaultMode="login"
                variant="dark"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.studioFoot}>
        <p>{page.material.footer}</p>
        <div className={styles.footLinks}>
          <Link href={`/recursos/${consulting.slug}`}>
            Quer destravar uma promoção ou decisão? Conheça a Consultoria de Carreira →
          </Link>
          <Link href="/termos-de-uso">Termos de uso</Link>
        </div>
      </footer>
    </div>
  );
}
