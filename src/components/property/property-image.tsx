"use client";

import { useState } from "react";
import type { PropertyMedia } from "@/lib/domain/types";

/** Generated artwork is a visual fallback, never evidence of stored listing media. */
export function PropertyImage({
  media, ratio = "4 / 3", label, className = "", fill = false, quiet = false,
  disclosure = "bottom-left",
}: {
  media: PropertyMedia | null;
  ratio?: string;
  label: string;
  className?: string;
  fill?: boolean;
  quiet?: boolean;
  /**
   * Where the required credit sits.
   *
   * "bottom-left" is the card and gallery treatment: a black strip on the
   * image's own bottom edge.
   *
   * "overlay" is for a card whose content sits ON the photograph. There the
   * bottom edge belongs to the price and the status line, and a strip there
   * would be lost under them, so the credit moves to the top left and is
   * lifted above the card's gradient. The card positions it by setting
   * `--kkl-credit-top` — 12px on its own, 54px when a "Featured" pill is
   * already using that corner. The label is the same either way: this is a
   * required disclosure, not decoration, and it is never dropped.
   */
  disclosure?: "bottom-left" | "overlay";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const illustrative = !media?.url || failedUrl === media.url;
  const artwork = /villa|house|locality|neighbourhood|land/i.test(label)
    ? "/illustrations/neighbourhood.png"
    : "/illustrations/apartment-courtyard.png";
  const sizing = fill ? { height: "100%", width: "100%" } : { aspectRatio: ratio };
  return (
    <span className={`relative block overflow-hidden bg-[#EFF1F7] ${className}`} style={sizing}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={illustrative ? artwork : media!.url}
        alt={illustrative ? `Architectural illustration — not a photograph of ${label}` : media!.alt}
        className="h-full w-full object-cover"
        loading={quiet ? "eager" : "lazy"}
        onError={illustrative ? undefined : () => setFailedUrl(media!.url)}
      />
      {illustrative || media?.attribution ? (
        <span
          className={
            disclosure === "overlay"
              ? "absolute left-[12px] top-[var(--kkl-credit-top,12px)] z-[2] rounded-[6px] bg-ink/75 px-[8px] py-[3px] text-[10px] font-semibold text-white"
              : "absolute bottom-0 left-0 bg-black/70 px-[7px] py-[3px] text-[10px] text-white"
          }
        >
          {illustrative ? "Illustration" : media?.attribution}
        </span>
      ) : null}
    </span>
  );
}
