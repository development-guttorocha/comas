import styles from "@/app/(pt)/servicos/servicos.module.css";

const team = ["AK", "LS", "MR", "JP", "CT"];

/**
 * The hero's stage: Gutto's card in the middle and the day-to-day of a design lead floating
 * around it (team, rituals, the 90-day plan, a real result). Decorative; the copy says it all.
 */
export default function ServiceHeroArt() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.glow} />
      <div className={styles.orbit} />

      <div className={styles.profile}>
        <img src="/curriculo/gutto.webp" alt="" width={900} height={900} />
        <div className={styles.profileMeta}>
          <p>Gutto Rocha</p>
          <span>Head de Design · as a service</span>
        </div>
      </div>

      <div className={`${styles.float} ${styles.floatTeam}`}>
        <p className={styles.floatLabel}>Time de design</p>
        <div className={styles.avatars}>{team.map(t => <span key={t}>{t}</span>)}<span>+3</span></div>
        <p className={styles.floatFoot}>2 squads · 1 trilha de carreira</p>
      </div>

      <div className={`${styles.float} ${styles.floatRitual}`}>
        <span className={styles.liveDot} />Design review · qui, 15h
      </div>

      <div className={`${styles.float} ${styles.floatPlan}`}>
        <p className={styles.floatLabel}>Plano de 90 dias</p>
        <ul>
          <li data-done>Diagnóstico</li>
          <li data-done>Rituais do time</li>
          <li>Design system</li>
        </ul>
        <div className={styles.progress}><i /></div>
      </div>

      <div className={`${styles.float} ${styles.floatMetric}`}>
        <p className={styles.metricValue}>5×</p>
        <p>mais lojistas usando o painel em um ano</p>
        <span>PicPay</span>
      </div>
    </div>
  );
}
