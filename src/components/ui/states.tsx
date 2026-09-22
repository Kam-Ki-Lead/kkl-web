import type { ReactNode } from "react";
import { Card } from "./card";
import { Chip, type ChipTone } from "./chip";

/**
 * C-08 content states and C-09 access/session states.
 *
 * "Six states every list and every action can be in. Each one names the situation
 * and offers the next move — an empty screen that only says 'nothing here' is a
 * dead end." Being blocked is not an error: C-09 panels say what is blocked, what
 * still works, and what the person can do about it, and never lose entered data.
 */

// ------------------------------------------------------------ C-08 content --

export function LoadingSpinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-[10px] py-[28px] text-center">
      <span
        aria-hidden="true"
        className="h-[44px] w-[44px] animate-spin rounded-full border-[5px] border-[#E1E4EE] border-t-brand"
      />
      <span className="t-card-title text-ink">{label}</span>
    </div>
  );
}

/** Skeleton rows keep the layout steady so nothing jumps when data arrives. */
export function SkeletonRows({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex flex-col gap-[9px] ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          className="block h-[13px] animate-pulse rounded-[4px] bg-[#EFF1F7]"
          style={{ width: `${100 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`block animate-pulse rounded-[8px] bg-[#EFF1F7] ${className}`} />;
}

type MessageTone = "plain" | "error" | "success";

const messageSurface: Record<MessageTone, string> = {
  plain: "bg-white",
  error: "bg-chip-danger-bg border-[#F3C4BF]",
  success: "bg-chip-success-bg border-[#BFE0CE]",
};

const messageHeading: Record<MessageTone, string> = {
  plain: "text-ink",
  error: "text-danger",
  success: "text-success",
};

/**
 * Empty, no-results, error and success all share one shape: a heading that names
 * the situation, a line that explains it, and the action that moves on from it.
 */
export function StateMessage({
  tone = "plain",
  title,
  children,
  action,
  className = "",
}: {
  tone?: MessageTone;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`${messageSurface[tone]} px-[22px] py-[30px] text-center ${className}`}>
      <h3 className={`t-card-title ${messageHeading[tone]}`}>{title}</h3>
      <p className="t-body mx-auto mt-[6px] max-w-[46ch] text-body">{children}</p>
      {action ? <div className="mt-[16px] flex justify-center gap-[10px]">{action}</div> : null}
    </Card>
  );
}

// -------------------------------------------------- C-09 access / session --

export type AccessTone = "neutral" | "denied" | "restricted" | "suspended";

const accessSurface: Record<AccessTone, string> = {
  neutral: "bg-white border-line",
  denied: "bg-chip-danger-bg border-[#F3C4BF]",
  restricted: "bg-[#FFF7E8] border-[#F3DFB4]",
  suspended: "bg-chip-danger-bg border-[#F3C4BF]",
};

const accessHeading: Record<AccessTone, string> = {
  neutral: "text-ink",
  denied: "text-danger",
  restricted: "text-warning",
  suspended: "text-danger",
};

const accessChip: Record<AccessTone, ChipTone> = {
  neutral: "muted",
  denied: "danger",
  restricted: "warning",
  suspended: "danger",
};

/**
 * A blocked-access panel. Renders what is blocked, what still works, and the
 * recovery — it never implies the person did something wrong, and it never
 * discards what they had entered.
 */
export function AccessPanel({
  tone = "neutral",
  chipLabel,
  title,
  children,
  actions,
  footnote,
}: {
  tone?: AccessTone;
  chipLabel: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  footnote?: string;
}) {
  return (
    <Card className={`${accessSurface[tone]} overflow-hidden`}>
      <div className="p-[22px]">
        <div className="flex flex-wrap items-center gap-[12px]">
          <Chip tone={accessChip[tone]}>{chipLabel}</Chip>
          <h2 className={`t-card-title ${accessHeading[tone]}`}>{title}</h2>
        </div>
        <div className="t-body mt-[10px] max-w-[70ch] text-body">{children}</div>
        {actions ? <div className="mt-[16px] flex flex-wrap gap-[10px]">{actions}</div> : null}
      </div>
      {footnote ? (
        <p className="t-caption border-t border-line bg-white/60 px-[22px] py-[11px] text-muted">
          {footnote}
        </p>
      ) : null}
    </Card>
  );
}

/**
 * An unresolved commercial rule, rendered in place of a value the client has not
 * set. See src/lib/config/business-rules.ts — this is deliberately not a number.
 */
export function PendingRule({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[6px] rounded-[6px] bg-chip-warning-bg px-[9px] py-[3px] text-[13px] font-semibold text-warning">
      {children}
    </span>
  );
}
