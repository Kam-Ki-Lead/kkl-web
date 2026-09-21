import type { ReactNode } from "react";

/** The surface every screen is built from — white, 1px line, 12px radius. */
export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag className={`rounded-[12px] border border-line bg-white ${className}`}>{children}</Tag>
  );
}

/** An inset panel or fact block — the Tint surface. */
export function InsetPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[10px] border border-line bg-tint p-[16px] ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-[14px] flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="t-heading text-ink">{title}</h2>
        {subtitle ? <p className="t-caption mt-[3px] text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
