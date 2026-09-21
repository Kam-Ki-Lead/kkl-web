import type { ReactNode } from "react";

/**
 * Status chips. C-01: "Status is never colour alone: every chip carries a word."
 * Every caller passes a word; the tone only reinforces it.
 *
 * Outstanding from C-11: per-chip foreground contrast has not been measured.
 * Carried into docs/phase-2/verification.md — not claimed as a pass here.
 */
export type ChipTone = "neutral" | "success" | "warning" | "danger" | "muted";

const tones: Record<ChipTone, string> = {
  neutral: "bg-chip-neutral-bg text-chip-neutral-fg",
  success: "bg-chip-success-bg text-chip-success-fg",
  warning: "bg-chip-warning-bg text-chip-warning-fg",
  danger: "bg-chip-danger-bg text-chip-danger-fg",
  muted: "bg-chip-muted-bg text-chip-muted-fg",
};

export function Chip({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full px-[10px] py-[3px] text-[13px] font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** C-05: an applied filter, removable. Applied filters are always visible. */
export function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full border-[1.5px] border-[#D4DBF3] bg-[#F6F8FD] py-[5px] pl-[13px] pr-[5px] text-[14px] font-semibold text-brand">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-brand text-[13px] leading-none text-white hover:bg-brand-deep"
      >
        <span aria-hidden="true">×</span>
      </button>
    </span>
  );
}

/**
 * A value the server has withheld — C-06's masked lead treatment.
 *
 * The real value is never sent to the browser before purchase, so there is nothing
 * here to blur or reveal client-side. This renders the placeholder the server sends.
 */
export function MaskedValue({ children }: { children: ReactNode }) {
  return <span className="t-mono text-muted">{children}</span>;
}
