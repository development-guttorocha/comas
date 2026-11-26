import type { ReactNode } from "react";

/** Ícones de traço dos infográficos (grade 24), desenhados com a cor do texto. */
const ICONS = {
  person: { label: "Pessoa", d: <><circle cx="12" cy="7.5" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></> },
  users: { label: "Pessoas", d: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19.5c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17.5 13.8c2 .8 3.5 2.9 3.5 5.7" /></> },
  doctor: { label: "Saúde", d: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8v8M8 12h8" /></> },
  heart: { label: "Coração", d: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z" /> },
  star: { label: "Estrela", d: <path d="m12 3.8 2.5 5.1 5.6.8-4 3.9.9 5.6L12 16.6l-5 2.6.9-5.6-4-3.9 5.6-.8Z" /> },
  check: { label: "Feito", d: <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.2 2.5 2.5 5-5.2" /></> },
  clock: { label: "Tempo", d: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></> },
  calendar: { label: "Agenda", d: <><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></> },
  chart: { label: "Gráfico", d: <><path d="M4 20h16" /><path d="M7 16v-4M12 16V8M17 16v-7" /></> },
  growth: { label: "Crescimento", d: <><path d="M4 17l5.5-5.5 4 4L20 9" /><path d="M15 9h5v5" /></> },
  money: { label: "Dinheiro", d: <><rect x="3.5" y="6.5" width="17" height="11" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M7 9.5v.01M17 14.5v.01" /></> },
  wallet: { label: "Carteira", d: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3" /><rect x="4" y="8" width="16" height="11" rx="2" /><path d="M16 13.5h.01" /></> },
  cart: { label: "Compra", d: <><path d="M4 5h2l2 10h10l2-7H7" /><circle cx="9.5" cy="19" r="1.3" /><circle cx="16.5" cy="19" r="1.3" /></> },
  phone: { label: "Celular", d: <><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></> },
  laptop: { label: "Computador", d: <><rect x="5" y="5" width="14" height="10" rx="1.5" /><path d="M3 19h18" /></> },
  chat: { label: "Conversa", d: <path d="M5 17.5V6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-4 3.5Z" /> },
  mail: { label: "E-mail", d: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></> },
  document: { label: "Documento", d: <><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5Z" /><path d="M14 3.5V8h4M9.5 12h5M9.5 15.5h5" /></> },
  shield: { label: "Segurança", d: <><path d="M12 3.5 19 6v5.5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6Z" /><path d="m9 12 2 2 4-4" /></> },
  lock: { label: "Cadeado", d: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></> },
  bolt: { label: "Rapidez", d: <path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12Z" /> },
  target: { label: "Meta", d: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".9" fill="currentColor" /></> },
  rocket: { label: "Lançamento", d: <><path d="M12 15.5 8.5 12C10 6.5 14 4 19.5 4.5 20 10 17.5 14 12 15.5Z" /><path d="M8.5 12 5 11.5l2.5-3h3.5M12 15.5l.5 3.5 3-2.5V13" /><circle cx="14.5" cy="9.5" r="1.3" /></> },
  globe: { label: "Mundo", d: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5Z" /></> },
  pin: { label: "Local", d: <><path d="M12 20.5s6-5.4 6-10.5a6 6 0 0 0-12 0c0 5.1 6 10.5 6 10.5Z" /><circle cx="12" cy="10" r="2.2" /></> },
  home: { label: "Casa", d: <><path d="M4 11 12 4.5l8 6.5" /><path d="M6 9.5V20h12V9.5" /></> },
  building: { label: "Empresa", d: <><rect x="5" y="3.5" width="14" height="17" rx="1" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10.5 20.5v-4h3v4" /></> },
  car: { label: "Carro", d: <><path d="M4.5 16.5V12l2-5h11l2 5v4.5" /><path d="M3.5 16.5h17M4.5 12h15" /><circle cx="8" cy="16.5" r="1.8" /><circle cx="16" cy="16.5" r="1.8" /></> },
  idea: { label: "Ideia", d: <><path d="M9 17.5h6M10 20.5h4" /><path d="M8.5 14.5a6 6 0 1 1 7 0c-.6.5-1 1.2-1 2v1h-5v-1c0-.8-.4-1.5-1-2Z" /></> },
  award: { label: "Prêmio", d: <><circle cx="12" cy="9" r="5" /><path d="m9 13.5-1.5 7 4.5-2.5 4.5 2.5-1.5-7" /></> },
  gear: { label: "Processo", d: <><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.5M12 18v2.5M3.5 12H6M18 12h2.5M6 6l1.8 1.8M16.2 16.2 18 18M6 18l1.8-1.8M16.2 7.8 18 6" /></> },
  search: { label: "Busca", d: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></> },
  eye: { label: "Visibilidade", d: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></> },
  like: { label: "Aprovação", d: <><path d="M8 10.5v9H5v-9Z" /><path d="M8 10.5 11.5 4c1.4 0 2.3 1 2 2.4L13 9.5h5.3a1.5 1.5 0 0 1 1.5 1.8l-1.4 6.5a2 2 0 0 1-2 1.7H8" /></> },
  gift: { label: "Benefício", d: <><rect x="4" y="9" width="16" height="11" rx="1" /><path d="M3.5 9h17v-3h-17ZM12 6v14" /><path d="M12 6C10 6 8 5.5 8 4s2-1.5 4 2c2-3.5 4-3.5 4-2s-2 2-4 2" /></> },
} satisfies Record<string, { label: string; d: ReactNode }>;

export type InfoIconName = keyof typeof ICONS;
export const INFO_ICON_NAMES = Object.keys(ICONS) as InfoIconName[];
export const INFO_ICON_LABELS: Record<string, string> = Object.fromEntries(INFO_ICON_NAMES.map(name => [name, ICONS[name].label]));

export function InfoIcon({ name, className, filled }: { name: string; className?: string; filled?: boolean }) {
  const icon = ICONS[(name in ICONS ? name : "person") as InfoIconName];
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {icon.d}
    </svg>
  );
}
