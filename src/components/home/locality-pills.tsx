import Link from "next/link";
import type { LocalitySummary } from "@/lib/services/contracts";
import {
  ALL_LOCALITIES_HREF,
  POPULAR_LOCALITIES_HEADING,
  isHighlighted,
  listingCountLabel,
  localityHref,
  localityLinkLabel,
  localityPills,
  moreLocalitiesLabel,
  moreLocalityCount,
} from "@/lib/domain/locality-pills";

/**
 * P-01's locality section, as a pill cloud.
 *
 * It replaces a three-column grid of white cards. The cards carried a name and
 * a count in a box the size of a card; the pill carries the same two things in
 * the space the name needs, so the whole set is one glance rather than two
 * rows of scanning.
 *
 * SAME DESTINATIONS, SAME NUMBERS
 *
 * Every pill links where its card linked — the search, filtered to that
 * location record. The subtitle quotes the same two totals the section already
 * quoted, through the same helper, so the copy is unchanged apart from the
 * heading.
 *
 * NO IMAGES
 *
 * There were none here and there are none now. The count badge is text in a
 * circle, not an icon file.
 */
export function LocalityPills({
  localities,
  totalListings,
  totalLocalities,
  subtitle,
}: {
  localities: readonly LocalitySummary[];
  totalListings: number;
  /** The figure the subtitle quotes, and the figure "+N more" counts against. */
  totalLocalities: number;
  /** The section's existing subtitle copy, passed in so it stays the page's. */
  subtitle: string;
}) {
  const pills = localityPills(localities);
  const more = moreLocalityCount(totalLocalities, pills.length);

  if (pills.length === 0) return null;

  return (
    <section aria-labelledby="popular-localities" className="mb-[32px]">
      <h2
        id="popular-localities"
        className="font-[family-name:var(--font-heading)] text-[36px] font-bold leading-[1.1] tracking-[-0.02em] text-ink max-[900px]:text-[30px] max-[640px]:text-[26px]"
      >
        {POPULAR_LOCALITIES_HEADING}
      </h2>
      <p className="mb-[22px] mt-[6px] text-[18px] text-muted max-[640px]:text-[15px]">{subtitle}</p>

      <ul className="flex list-none flex-wrap gap-[12px] p-0 max-[640px]:gap-[10px]">
        {pills.map((locality) => (
          <li key={locality.id}>
            <LocalityPill locality={locality} />
          </li>
        ))}

        {more > 0 ? (
          <li>
            <Link
              href={ALL_LOCALITIES_HREF}
              className={`${PILL} min-h-[48px] border-dashed border-line bg-white px-[20px] text-brand`}
            >
              {moreLocalitiesLabel(more)}
            </Link>
          </li>
        ) : null}
      </ul>

      {/* The totals the subtitle quotes, kept in the markup for the page's own
          checks to read without parsing prose. */}
      <span className="sr-only" data-locality-totals={`${totalListings}/${totalLocalities}`} />
    </section>
  );
}

/*
 * Shape and behaviour only — no background, border colour or text colour.
 *
 * Those belong to the variant. Carrying `bg-white` here and `bg-brand` on the
 * highlighted pill put two background utilities of equal specificity on one
 * element, and the cascade, not the class list, picked the winner: every pill
 * came out white, white-on-white, at 1:1.
 */
const PILL = [
  "inline-flex max-w-full items-center rounded-full border",
  "text-[17px] font-semibold leading-[1.2]",
  "transition-[border-color,transform] duration-200 hover:border-brand hover:-translate-y-[1px]",
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saffron",
].join(" ");

function LocalityPill({ locality }: { locality: LocalitySummary }) {
  const hot = isHighlighted(locality.listingCount);

  return (
    <Link
      href={localityHref(locality.id)}
      aria-label={localityLinkLabel(locality.name, locality.listingCount)}
      className={[
        PILL,
        "min-h-[48px] gap-[12px] py-[9px] pl-[20px] pr-[10px]",
        "max-[640px]:gap-[10px] max-[640px]:py-[8px] max-[640px]:pl-[16px] max-[640px]:pr-[8px] max-[640px]:text-[16px]",
        hot ? "border-brand bg-brand text-white" : "border-line bg-white text-ink",
      ].join(" ")}
    >
      <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{locality.name}</span>

      {/*
        Hidden from the accessibility tree: the link's own name already says
        "New Town, 7 listings", and without this the count is announced twice —
        once as a sentence and once as a bare number.

        The light-purple badge is --color-chip-neutral-bg (#f6f1fb), the closest
        token the site already has to the reference's #f1e9f8, at 6.3:1 for the
        brand number on it.

        `white/15` on the brand pill, not the reference's `white/.2`: at 20% the
        composite is rgb(147, 103, 175) and white on it is 4.36:1, under the
        4.5 this is held to. At 15% it is 4.9:1. The browser check measures the
        composite rather than trusting this note.
      */}
      <span
        aria-hidden="true"
        title={listingCountLabel(locality.listingCount)}
        className={[
          "grid h-[30px] min-w-[30px] flex-none place-items-center rounded-full px-[8px]",
          "text-[14px] font-bold",
          hot ? "bg-white/15 text-white" : "bg-chip-neutral-bg text-brand",
        ].join(" ")}
      >
        {locality.listingCount}
      </span>
    </Link>
  );
}
