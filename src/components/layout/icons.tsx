import type { ReactNode, SVGProps } from 'react';

/**
 * Small stroke icon set for the app shell (sidebar, topbar). Inline SVG on purpose: the project
 * ships no icon library and the CSP only allows same-origin assets. Icons are decorative — every
 * control that uses one carries its own text label — so they are `aria-hidden`.
 */
function Icon({ children, ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = () => (
  <Icon>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5.5 10v9.5h13V10" />
    <path d="M10 19.5v-5h4v5" />
  </Icon>
);
export const MapIcon = () => (
  <Icon>
    <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
    <path d="M9 4v13.5M15 6.5V20" />
  </Icon>
);
export const CubeIcon = () => (
  <Icon>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </Icon>
);
export const DocumentIcon = () => (
  <Icon>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4M9 12h6M9 16h6" />
  </Icon>
);
export const UsersIcon = () => (
  <Icon>
    <circle cx="9" cy="8.5" r="3" />
    <path d="M3.5 19c.5-3 2.6-4.8 5.5-4.8s5 1.8 5.5 4.8" />
    <path d="M16 6a3 3 0 0 1 0 5.6M17.5 14.5c1.8.6 3 2.2 3.3 4.5" />
  </Icon>
);
export const LayersIcon = () => (
  <Icon>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5M3 17.5l9 5 9-5" transform="translate(0 -1.5)" />
  </Icon>
);
export const DatabaseIcon = () => (
  <Icon>
    <ellipse cx="12" cy="6" rx="7" ry="3" />
    <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
  </Icon>
);
export const ChartIcon = () => (
  <Icon>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </Icon>
);
export const SettingsIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
  </Icon>
);
export const SearchIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Icon>
);
export const HelpIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.8.4-1.2 1-1.2 1.8M12 16.8v.1" />
  </Icon>
);
export const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
  </Icon>
);
export const MoonIcon = () => (
  <Icon>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Icon>
);
export const MenuIcon = () => (
  <Icon>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </Icon>
);
export const CloseIcon = () => (
  <Icon>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
export const ChevronRightIcon = () => (
  <Icon>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);
export const PinIcon = () => (
  <Icon>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </Icon>
);
export const FolderIcon = () => (
  <Icon>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H10l2 2.5h7.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />
  </Icon>
);
export const CheckCircleIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.3 2.8 2.8L16.2 9.5" />
  </Icon>
);
export const ClockIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 1.8" />
  </Icon>
);
export const AlertIcon = () => (
  <Icon>
    <path d="M12 3.5 2.8 19.5h18.4z" />
    <path d="M12 10v4.5M12 17.2v.1" />
  </Icon>
);
export const CoinsIcon = () => (
  <Icon>
    <ellipse cx="12" cy="6.5" rx="6.5" ry="2.7" />
    <path d="M5.5 6.5v5c0 1.5 2.9 2.7 6.5 2.7s6.5-1.2 6.5-2.7v-5M5.5 11.5v5c0 1.5 2.9 2.7 6.5 2.7s6.5-1.2 6.5-2.7v-5" />
  </Icon>
);
export const TrendIcon = () => (
  <Icon>
    <path d="m3.5 17 6-6 3.5 3.5 7.5-8" />
    <path d="M15 6.5h5.5V12" />
  </Icon>
);
export const TargetIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" />
  </Icon>
);
export const LayerStackIcon = () => (
  <Icon>
    <path d="m12 4 8.5 4.7L12 13.4 3.5 8.7z" />
    <path d="m3.5 12.8 8.5 4.7 8.5-4.7" />
  </Icon>
);
export const PlusIcon = () => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const MinusIcon = () => (
  <Icon>
    <path d="M5 12h14" />
  </Icon>
);
export const ShareIcon = () => (
  <Icon>
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="17.5" cy="6" r="2.4" />
    <circle cx="17.5" cy="18" r="2.4" />
    <path d="m8.1 10.9 7.3-3.8M8.1 13.1l7.3 3.8" />
  </Icon>
);
export const RotateIcon = () => (
  <Icon>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
  </Icon>
);
export const TextIcon = () => (
  <Icon>
    <path d="M4 19 10 5l6 14M6.2 14h7.6M18 10h3m-1.5 0V19" />
  </Icon>
);
