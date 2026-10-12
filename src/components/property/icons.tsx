/**
 * The line icons the property cards draw.
 *
 * One definition each, because two cards drawing "the same" pin from two files
 * is how they stop being the same pin. All 16px, 2px stroke, `currentColor`,
 * and `aria-hidden` — every one of them sits beside a word that carries the
 * meaning.
 */

const BOX = "h-[16px] w-[16px] flex-none";

function Icon({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`${BOX} ${className}`}
    >
      {children}
    </svg>
  );
}

export const HeartIcon = () => (
  <Icon>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </Icon>
);

export const PinIcon = () => (
  <Icon>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const BedIcon = () => <Icon><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /></Icon>;

export const AreaIcon = () => <Icon><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Icon>;

export const CalendarIcon = () => (
  <Icon>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Icon>
);

/** The only one that moves: it nudges right when its card is hovered. */
export const ArrowIcon = () => (
  <Icon className="transition-transform duration-200 group-hover:translate-x-[3px] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);
