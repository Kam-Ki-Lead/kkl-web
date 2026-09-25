import type { ReactNode } from "react";
import {
  DashboardRail,
  type RailTone,
  RailDrawer,
  type RailFooter,
  type RailItem,
} from "./dashboard-rail";

/**
 * The console shell used by every railed screen: rail, header bar, content.
 *
 * The header carries the screen title and a one-line subtitle on the left, and
 * the account's own summary on the right — for a Seller, the credit balance and
 * the avatar. Below 1060px the rail becomes a drawer opened from this bar.
 */
export function ConsoleShell({
  items,
  footer,
  navLabel,
  navEyebrow,
  dense = false,
  tone = "console",
  title,
  subtitle,
  aside,
  children,
}: {
  items: readonly RailItem[];
  footer?: RailFooter | null;
  navLabel: string;
  /** A small label above the rail's items, e.g. "Builder" in B-06. */
  navEyebrow?: string;
  /** The Admin rail's tighter step; its twenty items do not fit at 16px. */
  dense?: boolean;
  /** The Admin rail is ink, not brand-deep — see DashboardRail. */
  tone?: RailTone;
  title: string;
  subtitle: string;
  /** Right-hand header content — balance chip, avatar. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      <DashboardRail items={items} footer={footer} ariaLabel={navLabel} eyebrow={navEyebrow} dense={dense} tone={tone} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* `relative` anchors the mobile drawer, which is absolutely positioned
            against this bar rather than the viewport. */}
        <header className="relative flex items-center gap-[14px] border-b border-line bg-white px-[28px] py-[16px] max-[1060px]:px-[16px]">
          <RailDrawer items={items} footer={footer} ariaLabel={navLabel} eyebrow={navEyebrow} dense={dense} tone={tone} />
          <div className="min-w-0 flex-1">
            <h1 className="t-console-title truncate text-ink max-[1060px]:whitespace-normal max-[619px]:text-[19px] min-[620px]:max-[1059px]:text-[21px]">
              {title}
            </h1>
            <p className="truncate text-[14px] leading-[1.5] text-muted max-[1060px]:whitespace-normal">
              {subtitle}
            </p>
          </div>
          {aside ? <div className="flex flex-none items-center gap-[12px]">{aside}</div> : null}
        </header>

        <main className="flex-1 px-[28px] py-[22px] max-[1060px]:px-[16px]">{children}</main>
      </div>
    </div>
  );
}

/** The circular initials badge in the console header. */
export function AvatarBadge({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      // The name is on the profile screen; repeating it here would add a second
      // announcement of the same thing to every screen in the console.
      aria-hidden="true"
      className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-brand text-[14px] font-bold text-white"
    >
      {initials}
    </span>
  );
}
