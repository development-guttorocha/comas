import type { SVGProps } from "react";

/** Line icons for the admin, 24px grid, drawn with the current colour. */
function Icon({ children, style, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0, ...style }}
      {...props}
    >
      {children}
    </svg>
  );
}

export const GridIcon = () => <Icon><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></Icon>;
export const GlobeIcon = () => <Icon><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5Z" /></Icon>;
export const ExternalIcon = () => <Icon><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4" /></Icon>;
export const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14" /></Icon>;
export const UpIcon = () => <Icon><path d="m6 15 6-6 6 6" /></Icon>;
export const DownIcon = () => <Icon><path d="m6 9 6 6 6-6" /></Icon>;
export const TrashIcon = () => <Icon><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></Icon>;
export const CopyIcon = () => <Icon><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h2" /></Icon>;
export const ArrowIcon = () => <Icon><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const SearchIcon = () => <Icon><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></Icon>;
export const CloseIcon = () => <Icon><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const UploadIcon = () => <Icon><path d="M12 16V4M7 9l5-5 5 5M5 20h14" /></Icon>;
export const AlertIcon = () => <Icon><path d="M12 9v4M12 17h.01" /><path d="M10.3 4.5 3 18a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z" /></Icon>;
export const SparkIcon = () => <Icon><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5" /></Icon>;
export const SectionIcon = () => <Icon><path d="M5 6h14M5 12h9M5 18h11" /></Icon>;
export const BlockIcon = () => <Icon><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M9 5v14" /></Icon>;
export const TextIcon = () => <Icon><path d="M5 6h14M12 6v13" /></Icon>;
export const ImageIcon = () => <Icon><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m20 16-4.5-4.5L7 19" /></Icon>;
export const ImagesIcon = () => <Icon><rect x="3" y="6" width="8" height="12" rx="1.5" /><rect x="13" y="6" width="8" height="12" rx="1.5" /></Icon>;
export const EmbedIcon = () => <Icon><path d="m9 8-4 4 4 4M15 8l4 4-4 4" /></Icon>;
export const DividerIcon = () => <Icon><path d="M4 12h16" /></Icon>;
export const SpaceIcon = () => <Icon><path d="M6 9v6h12V9" /></Icon>;
export const CodeIcon = () => <Icon><path d="M8 4H6a1 1 0 0 0-1 1v5l-2 2 2 2v5a1 1 0 0 0 1 1h2M16 4h2a1 1 0 0 1 1 1v5l2 2-2 2v5a1 1 0 0 1-1 1h-2" /></Icon>;
export const PagesIcon = () => <Icon><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z" /><path d="M14 3.5V8h4M10 12h5M10 15.5h5" /></Icon>;
export const HomeIcon = () => <Icon><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10v9h11v-9" /></Icon>;
export const ServicesIcon = () => <Icon><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" /></Icon>;
export const PlayIcon = () => <Icon><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m10.5 9.5 4 2.5-4 2.5z" /></Icon>;
export const ClockIcon = () => <Icon><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>;
export const GearIcon = () => <Icon><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6" /></Icon>;
export const InboxIcon = () => <Icon><path d="M4 13.5 6.2 6a1.5 1.5 0 0 1 1.4-1h8.8a1.5 1.5 0 0 1 1.4 1L20 13.5V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" /><path d="M4 13.5h4.5l1.2 2h4.6l1.2-2H20" /></Icon>;
export const KeyIcon = () => <Icon><circle cx="8" cy="15" r="3.5" /><path d="m10.5 12.5 8-8M15.5 7.5l2.5 2.5M17.5 5.5l2 2" /></Icon>;
export const CheckIcon =() => <Icon><path d="m5 12 5 5 9-10" /></Icon>;

export function LogoMark() {
  return (
    <svg viewBox="0 0 3199 3199" fill="none" aria-hidden>
      <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M0 1599.5C0 716.121 716.121 0 1599.5 0C2482.88 0 3199 716.121 3199 1599.5C3199 2482.88 2482.88 3199 1599.5 3199C716.121 3199 0 2482.88 0 1599.5ZM1728 1584.36H2430V1301.36H1733V1016.36H2713V1300.36V1301.36V1584.36V1867.36H2430H2429V2151.36H2145V1867.36H1728V1584.36ZM1432 1017.36H729.996V1016.36H446.996V2150.36H447.996V2151.36H1432V2150.36H1434V1584.36H1150V1868.36H729.996V1302.36H1432V1017.36Z" />
    </svg>
  );
}
export const StarIcon = ({ filled }: { filled?: boolean }) => <Icon fill={filled ? "currentColor" : "none"}><path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3l-4.8 2.6.9-5.4-3.9-3.8 5.4-.8Z" /></Icon>;
export const MoreIcon = () => <Icon><path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth={2.6} /></Icon>;
export const ArchiveIcon = () => <Icon><rect x="4" y="5" width="16" height="4" rx="1" /><path d="M5.5 9v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9M10 13h4" /></Icon>;
export const BarChartIcon = () => <Icon><path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" /></Icon>;
export const MailIcon = () => <Icon><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 5.5L19.5 7" /></Icon>;
