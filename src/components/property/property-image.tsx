import type { PropertyMedia } from "@/lib/domain/types";

/**
 * The media slot for property imagery.
 *
 * Builder uploads are uncontrolled — inconsistent aspect ratios, portrait phone
 * photos, and listings with no media at all. The slot fixes the aspect ratio and
 * covers, so a bad photo cannot break a grid, and it has a real designed fallback
 * rather than a broken-image icon.
 *
 * No illustrative stock photography ships here. The baseline package used Unsplash
 * imagery for review and is explicit that "every image must be replaced with
 * licensed project photography before launch" — so until kkl-backend serves real
 * builder media, every slot renders the fallback.
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

  if (media === null) {
    return (
      <div
        role="img"
        aria-label={`No photograph available — ${label}`}
        className={`flex items-center justify-center bg-[#E8ECF6] ${className}`}
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={media.url}
      alt={media.alt}
      className={`h-full w-full object-cover ${className}`}
      style={sizing}
    />
  );
}
