/**
 * Crisp 1.75px stroke vector icons for the Career Track studio workspace (zero emojis).
 */

type IconProps = { className?: string };

const svgProps = (className?: string) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
  className,
});

export function IconCompass({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5" />
    </svg>
  );
}

export function IconLayers({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <polygon points="12 3 3 8 12 13 21 8 12 3" />
      <polyline points="3 13 12 18 21 13" />
      <polyline points="3 17.5 12 22 21 17.5" />
    </svg>
  );
}

export function IconSliders({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="9" cy="7" r="2.5" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="16" cy="12" r="2.5" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="11" cy="17" r="2.5" />
    </svg>
  );
}

export function IconTarget({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

export function IconFileText({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <polyline points="14 3 14 8 19 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

export function IconCopy({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function IconPrinter({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <polyline points="6 9 6 3 18 3 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" rx="1" />
    </svg>
  );
}

export function IconLogOut({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
