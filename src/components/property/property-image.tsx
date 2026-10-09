"use client";

import { useState } from "react";
import type { PropertyMedia } from "@/lib/domain/types";

/** Generated artwork is a visual fallback, never evidence of stored listing media. */
export function PropertyImage({
  media, ratio = "4 / 3", label, className = "", fill = false, quiet = false,
}: {
  media: PropertyMedia | null;
  ratio?: string;
  label: string;
  className?: string;
  fill?: boolean;
  quiet?: boolean;
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
        <span className="absolute bottom-0 left-0 bg-black/70 px-[7px] py-[3px] text-[10px] text-white">
          {illustrative ? "Illustration" : media?.attribution}
        </span>
      ) : null}
    </span>
  );
}
