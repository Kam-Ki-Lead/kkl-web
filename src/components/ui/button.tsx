import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * C-04, five levels: primary, secondary, quiet, destructive, disabled.
 * "One filled primary per view." Minimum target 44px.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "quiet"
  | "quietDanger"
  | "secondaryBrand"
  | "destructive";
export type ButtonSize = "lg" | "md" | "action" | "sm";

/*
 * Measured against the approved consoles rather than chosen: every button in
 * the baseline is `border-radius:6px` (64 occurrences across the four console
 * documents, against 4 at 8px) and `font-weight:700`. The medium size is
 * `font-size:16px; padding:14px 22px`. This component had 8px, 600 and 15px,
 * which is a small difference on one button and a visible one across a screen
 * that has six.
 *
 * min-h stays at 44px as a floor for target size; the baseline's own padding
 * already exceeds it, so the floor never binds on md.
 */
/*
 * Weight lives in the variants, not here: the baseline's buttons are 700 but
 * its quiet (underlined) actions are 600, and two font-weight utilities in one
 * class list would be decided by stylesheet order, not by intent.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-[6px] " +
  "transition-[background-color,border-color,color] disabled:cursor-not-allowed " +
  "select-none text-center";

/*
 * The baseline draws four button steps, not two:
 *
 *   lg     17px/700  form submissions — "Send OTP", "Send enquiry",
 *                    "Confirm and buy", "Continue to payment" (52px tall)
 *   md     16px/700  the default primary, and the portal's card actions
 *   action 15px/700  console header actions — "New listing", "Recharge
 *                    credits", "New ticket" — and 15px secondary actions
 *   sm     14px      compact actions
 *
 * All measured from the rendered baseline at 1440; see
 * docs/phase-2/visual-differences.md §1 (D-13).
 */
const sizes: Record<ButtonSize, string> = {
  lg: "min-h-[44px] px-[24px] py-[13px] text-[17px]",
  md: "min-h-[44px] px-[22px] py-[14px] text-[16px]",
  action: "min-h-[44px] px-[20px] py-[13px] text-[15px]",
  sm: "min-h-[36px] px-[13px] py-[8px] text-[14px]",
};

/*
 * Quiet actions are underlined text links, not bordered buttons (the
 * baseline's "Republish", "Delete", "Back"), so they take only the size's
 * type step — applying the button padding would pad a text link.
 */
const quietSizes: Record<ButtonSize, string> = {
  lg: "px-1 text-[17px]",
  md: "px-1 text-[16px]",
  action: "px-1 text-[15px]",
  sm: "px-1 text-[14px]",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "font-bold bg-brand text-white hover:bg-brand-deep disabled:bg-[#C5C0CC] disabled:text-white",
  secondary:
    "font-bold bg-white text-ink border-[1.5px] border-line hover:border-[#C6CCE0] disabled:text-muted",
  /* The portal's outline call to action: white surface, brand border and
     label (P-01 role cards, P-03 "Request a site visit"). Distinct from
     secondary, whose label is ink. */
  outline:
    "font-bold bg-white text-brand border-[2px] border-brand hover:bg-chip-neutral-bg disabled:border-line disabled:text-muted",
  quiet:
    "font-semibold bg-transparent text-brand underline underline-offset-2 hover:text-brand-deep",
  /* The baseline's underlined destructive link — "Delete" on B-07 (#B3261E). */
  quietDanger:
    "font-semibold bg-transparent text-danger underline underline-offset-2 hover:text-[#7A2119]",
  /* Secondary's white surface and border, but a brand label — the baseline's
     "View status" on the profile screens (S-25/B-25). A text-brand className
     on secondary would fight the variant's text-ink in stylesheet order, so
     this is a variant, not an override. */
  secondaryBrand:
    "font-bold bg-white text-brand border-[1.5px] border-line hover:border-[#C6CCE0] disabled:text-muted",
  destructive:
    "font-bold bg-white text-danger border-[1.5px] border-danger hover:bg-chip-danger-bg disabled:border-line disabled:text-muted",
};

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Common & Omit<ComponentProps<"button">, "children">) {
  const sizing = (variant === "quiet" || variant === "quietDanger") ? quietSizes[size] : sizes[size];
  return (
    <button {...props} className={`${base} ${sizing} ${variants[variant]} ${className}`} />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Common & Omit<ComponentProps<typeof Link>, "children">) {
  const sizing = (variant === "quiet" || variant === "quietDanger") ? quietSizes[size] : sizes[size];
  return (
    <Link {...props} className={`${base} ${sizing} ${variants[variant]} ${className}`} />
  );
}

/** The filled-saffron call to action used once, on the homepage hero (P-01). */
export function AccentButtonLink({
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`${base} ${sizes.md} font-bold bg-saffron text-ink hover:bg-[#EF6729] ${className}`}
    />
  );
}
