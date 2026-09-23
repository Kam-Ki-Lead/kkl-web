import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/**
 * C-04, five levels: primary, secondary, quiet, destructive, disabled.
 * "One filled primary per view." Minimum target 44px.
 */
export type ButtonVariant = "primary" | "secondary" | "quiet" | "destructive";
export type ButtonSize = "md" | "sm";

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
const base =
  "inline-flex items-center justify-center gap-2 rounded-[6px] font-bold " +
  "transition-[background-color,border-color,color] disabled:cursor-not-allowed " +
  "select-none text-center";

const sizes: Record<ButtonSize, string> = {
  md: "min-h-[44px] px-[22px] py-[14px] text-[16px]",
  sm: "min-h-[36px] px-[13px] py-[8px] text-[14px]",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-deep disabled:bg-[#AEB6CE] disabled:text-white",
  secondary:
    "bg-white text-ink border-[1.5px] border-line hover:border-[#C6CCE0] disabled:text-muted",
  quiet: "bg-transparent text-brand underline underline-offset-2 hover:text-brand-deep px-1",
  destructive:
    "bg-white text-danger border-[1.5px] border-danger hover:bg-chip-danger-bg disabled:border-line disabled:text-muted",
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
  return (
    <button
      {...props}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: Common & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link {...props} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} />
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
      className={`${base} ${sizes.md} bg-saffron text-ink hover:bg-[#DE9309] ${className}`}
    />
  );
}
