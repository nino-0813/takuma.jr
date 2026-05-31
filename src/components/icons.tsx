import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const CalendarIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="16" rx="3" />
    <path d="M3 9h18M8 2.5v4M16 2.5v4" />
  </svg>
);

export const CheckCircleIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </svg>
);

export const KeyIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="15" r="4.5" />
    <path d="M11.2 11.8 19 4m-3 0 3 0 0 3m-6 1 2.5 2.5" />
  </svg>
);

export const MegaphoneIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 11v2a1 1 0 0 0 1 1h2l4 3.5V6.5L6 10H4a1 1 0 0 0-1 1Z" />
    <path d="M14 8a5 5 0 0 1 0 8M17 5.5a9 9 0 0 1 0 13" />
  </svg>
);

export const CarIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 16v2.5M20 16v2.5M3 16h18l-1.4-5.2A2 2 0 0 0 17.7 9.3H6.3a2 2 0 0 0-1.9 1.5L3 16Z" />
    <circle cx="7" cy="16" r="1.4" />
    <circle cx="17" cy="16" r="1.4" />
  </svg>
);

export const UsersIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-2.2-4.4" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ChevronRightIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const ChevronLeftIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const PinIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 3h6l-1 6 3 3v2h-5v5l-1 2-1-2v-5H4v-2l3-3-1-6Z" />
  </svg>
);

export const MapPinIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

export const ShareIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 15V4m0 0L8.5 7.5M12 4l3.5 3.5" />
    <path d="M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

export const ChatIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5Z" />
    <path d="M8.5 9.5h7M8.5 12.5h4" />
  </svg>
);

export const SendIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12 19 5l-4 14-3.5-5.5L5 12Z" />
  </svg>
);

export const LogoutIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
    <path d="M10 12h10m0 0-3-3m3 3-3 3" />
  </svg>
);
