/** "Design Manager @ Loft" → role and company; titles without "@" are all role. */
export function splitJob(title: string) {
  const at = title.lastIndexOf("@");
  return at < 0 ? { role: title.trim(), company: "" } : { role: title.slice(0, at).trim(), company: title.slice(at + 1).trim() };
}

const ICONS: Array<[RegExp, React.ReactNode]> = [
  [/linkedin/i, <path key="li" d="M6.5 9.5v8M6.5 6.5v.01M10.5 17.5v-4.75c0-1.8 1.2-3.25 3-3.25s3 1.45 3 3.25v4.75M10.5 9.5v8" />],
  [/instagram/i, <g key="ig"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><path d="M16.8 7.2v.01" /></g>],
  [/dribbble/i, <g key="dr"><circle cx="12" cy="12" r="8.5" /><path d="M8.6 4.3c3.3 4 5.5 9.3 6.4 15.4M3.6 10.6c4.9.2 9.8-.9 13.6-4M6.2 18.4c2.6-4 6.8-5.6 13.9-4.2" /></g>],
];

/** A line icon for a social network, picked from its address; its first letter otherwise. */
export function SocialIcon({ href, label }: { href: string; label: string }) {
  const icon = ICONS.find(([test]) => test.test(href) || test.test(label))?.[1];
  if (!icon) return <span aria-hidden>{label.slice(0, 1)}</span>;
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {icon}
    </svg>
  );
}
