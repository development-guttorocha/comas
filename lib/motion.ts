/**
 * Sistema de motion do portfólio — uma curva, poucos ritmos nomeados.
 * standard: blocos de conteúdo
 * editorial: leitura lenta (manifesto)
 * snap: fechamento / CTAs (curto, pouco deslocamento)
 */
export const motionEaseOut = [0.16, 1, 0.3, 1] as const;

export type ScrollRevealTone = "standard" | "editorial" | "snap";

export const scrollRevealTone = {
  standard: { duration: 0.52, distance: 20 },
  editorial: { duration: 0.82, distance: 11 },
  snap: { duration: 0.36, distance: 8 },
} as const satisfies Record<
  ScrollRevealTone,
  { duration: number; distance: number }
>;

/** Stagger dentro de um case — hierarquia: meta → título → corpo */
export const caseStagger = {
  staggerChildren: 0.085,
  delayChildren: 0.05,
} as const;

export const caseItemMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: motionEaseOut },
  },
} as const;

/** Hero home — hierarquia wordmark → copy → barra */
export const heroEnter = {
  container: {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.11,
        delayChildren: 0.06,
      },
    },
  },
  block: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.62, ease: motionEaseOut },
    },
  },
  bar: {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.48, ease: motionEaseOut, delay: 0.08 },
    },
  },
} as const;

/** Menu mobile — overlay + lista */
export const mobileMenuEnter = {
  overlay: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.22, ease: motionEaseOut } },
    /** nome do variant para AnimatePresence */
    exit: { opacity: 0, transition: { duration: 0.18, ease: motionEaseOut } },
  },
  list: {
    hidden: {},
    show: {
      transition: { staggerChildren: 0.055, delayChildren: 0.07 },
    },
  },
  link: {
    hidden: { opacity: 0, y: 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: motionEaseOut },
    },
  },
  header: {
    hidden: { opacity: 0, y: -8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.32, ease: motionEaseOut },
    },
  },
} as const;
