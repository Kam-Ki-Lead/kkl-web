import type { PropertyMedia } from "@/lib/domain/types";

/**
 * The media slot for property imagery.
 *
 * Builder uploads are uncontrolled — inconsistent aspect ratios, portrait phone
 * photos, and listings with no media at all. The slot fixes the aspect ratio and
 * covers, so a bad photo cannot break a grid, and it has a real designed fallback
 * rather than a broken-image icon.
 *
 * No illustrative stock photography is vendored here. The baseline package used
 * Unsplash imagery for review and is explicit that "every image must be replaced
 * with licensed project photography before launch". Until kkl-backend serves real
 * builder media, every slot renders the fallback unless a review session turns the
 * baseline's stand-in imagery on (NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on), in which case
 * each item's `attribution` is drawn over the image so credit travels with it.
 */
export function PropertyImage({
  media,
  ratio = "4 / 3",
  label,
  className = "",
  fill = false,
  quiet = false,
}: {
  media: PropertyMedia | null;
  /** CSS aspect-ratio. 16/6 for the hero banner, 4/3 for cards. Ignored when `fill`. */
  ratio?: string;
  /** Describes what would be here, for the fallback. */
  label: string;
  className?: string;
  /** Fill the parent instead of holding an aspect ratio — for fixed-height slots. */
  fill?: boolean;
  /** Suppress the visible fallback caption where copy sits over the image. */
  quiet?: boolean;
}) {
  const sizing = fill ? { height: "100%", width: "100%" } : { aspectRatio: ratio };

  // A media record with no URL means a file was chosen but no bytes were kept
  // (sample mode) — render the designed fallback, not a broken <img src="">.
  if (media === null || media.url === "") {
    return (
      <div
        role="img"
        aria-label={`No photograph available — ${label}`}
        className={`flex items-center justify-center bg-[#EFF1F7] ${className}`}
        style={sizing}
      >
        {quiet ? null : (
          <span className="t-caption px-3 text-center text-muted">{label}</span>
        )}
      </div>
    );
  }

  // Builder media is served by kkl-backend, whose host is not fixed yet, so
  // next/image's remotePatterns allowlist stays empty and a plain <img> is used.
  // Revisit once the media origin is published.
  return (
    <span className="relative block h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={media.url}
        alt={media.alt}
        className={`h-full w-full object-cover ${className}`}
        style={sizing}
      />
      {media.attribution ? (
        <span className="absolute bottom-0 left-0 bg-black/55 px-[7px] py-[3px] text-[10px] text-white">
          {media.attribution}
        </span>
      ) : null}
    </span>
  );
}
