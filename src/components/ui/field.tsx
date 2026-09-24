import type { ComponentProps, ReactNode } from "react";

/**
 * C-04: "Labels sit above fields and stay there — nothing disappears when you type.
 * Every control is at least 44px tall, 48px where a thumb is likely."
 * A disabled field always says why it is disabled.
 */

const controlBase =
  "w-full min-h-[44px] rounded-[8px] border-[1.5px] bg-white px-[13px] py-[10px] text-[15px] " +
  "text-ink placeholder:text-[#9AA2B8] disabled:bg-tint disabled:text-muted";

export function Field({
  label,
  id,
  helper,
  error,
  children,
  className = "",
  labelSize = "md",
}: {
  label: string;
  /** Must match the control's id — it wires the label and the error message. */
  id: string;
  /** Helper sits below, in the same column as the field. */
  helper?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  /**
   * The public forms label controls at 14px; the consoles' filter rows draw
   * the same label at 13px (S-07, B-20). Both are 600 in body #2A3250.
   */
  labelSize?: "md" | "sm";
}) {
  return (
    <div className={`flex flex-col gap-[6px] ${className}`}>
      {/* The approved forms label their controls in body #2A3250, not ink —
          14px/600 appears 14 times at that colour across the Buyer journey and
          once at brand blue, never at ink. */}
      <label
        htmlFor={id}
        className={`t-label text-body ${labelSize === "sm" ? "text-[13px]" : ""}`}
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="t-caption text-danger">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="t-caption text-muted">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid = false,
  className = "",
  ...props
}: { invalid?: boolean } & ComponentProps<"input">) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`${controlBase} ${invalid ? "border-danger" : "border-control-border"} ${className}`}
    />
  );
}

export function TextArea({
  invalid = false,
  className = "",
  ...props
}: { invalid?: boolean } & ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={`${controlBase} ${invalid ? "border-danger" : "border-control-border"} ${className}`}
    />
  );
}

export function Select({
  invalid = false,
  className = "",
  children,
  ...props
}: { invalid?: boolean } & ComponentProps<"select">) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={`${controlBase} ${invalid ? "border-danger" : "border-control-border"} cursor-pointer ${className}`}
    >
      {children}
    </select>
  );
}

/** C-04 multi-select chips (S-02, B-10, B-11). */
export function ChoiceChip({
  selected,
  children,
  ...props
}: { selected: boolean; children: ReactNode } & Omit<
  ComponentProps<"button">,
  "className" | "children"
>) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={
        "min-h-[44px] rounded-full border-[1.5px] px-[18px] text-[15px] font-semibold " +
        "transition-[background-color,border-color,color] " +
        (selected
          ? "border-brand bg-brand text-white"
          : "border-line bg-white text-ink hover:border-[#C6CCE0]")
      }
    >
      {children}
    </button>
  );
}
