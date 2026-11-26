"use client";

import { useState } from "react";
import type { AiPrototypingContent } from "@/lib/services";
import styles from "@/app/(pt)/servicos/prototipagem-ia.module.css";

/**
 * The same checkout asked of an AI tool twice: with a bare prompt, then with context and
 * criteria. The toggle swaps prompt, screen and the notes on what changed.
 */
export default function AiDemo({ copy }: { copy: AiPrototypingContent["demo"] }) {
  const [guided, setGuided] = useState(false);
  const notes = guided ? copy.guidedNotes : copy.rawNotes;

  return (
    <div className={styles.demo} data-guided={guided || undefined}>
      <div className={styles.demoSide}>
        <div className={styles.toggle} role="group" aria-label="Versão do prompt">
          {copy.toggle.map((label, i) => (
            <button key={label} type="button" aria-pressed={guided === (i === 1)} onClick={() => setGuided(i === 1)}>{label}</button>
          ))}
        </div>
        <div className={styles.promptCard}>
          <span className={styles.promptTag}>prompt</span>
          <p aria-live="polite">{guided ? copy.guidedPrompt : copy.rawPrompt}</p>
        </div>
        <ul className={styles.notes} aria-live="polite">
          {notes.map(n => <li key={n}>{n}</li>)}
        </ul>
      </div>

      {/* Both screens stay mounted so the swap can crossfade; only the shown one is exposed. */}
      <div className={styles.phone}>
        <div className={styles.screen} data-version="raw" aria-hidden={guided}>
          <p className={styles.rawTitle}>CHECKOUT</p>
          <p className={styles.rawLorem}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
          <div className={styles.rawCard}><span>Produto incrível</span><b>R$ 399</b></div>
          <div className={styles.rawCard}><span>Lorem ipsum</span><b>R$ 0</b></div>
          <span className={styles.rawBtn} data-c="1">COMPRAR AGORA!!</span>
          <span className={styles.rawBtn} data-c="2">Ver mais ofertas</span>
          <span className={styles.rawBtn} data-c="3">Cancelar</span>
        </div>

        <div className={styles.screen} data-version="guided" aria-hidden={!guided}>
          <p className={styles.gTitle}>Finalizar compra</p>
          <div className={styles.gSummary}>
            <div><span>Tênis Runner · 42</span><span>R$ 399,90</span></div>
            <div><span>Frete</span><span className={styles.gFree}>Grátis</span></div>
            <div className={styles.gTotal}><span>Total</span><span>R$ 399,90</span></div>
          </div>
          <p className={styles.gLabel}>Pagamento</p>
          <div className={styles.gOption} data-selected><i />Pix<small>aprovação na hora</small></div>
          <div className={styles.gOption}><i />Cartão de crédito</div>
          <span className={styles.gBtn}>Pagar R$ 399,90 com Pix</span>
        </div>
      </div>
    </div>
  );
}
