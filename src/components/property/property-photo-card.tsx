import Link from "next/link";
import type { PropertySummary } from "@/lib/domain/types";
import { formatConfigurations, formatListingPrice, splitPricePerMonth } from "@/lib/format";
import { PropertyImage } from "./property-image";
import { AreaIcon, ArrowIcon, BedIcon, HeartIcon, PinIcon } from "./icons";

/**
 * C-06, photo-overlay treatment — the "Featured properties" row on P-01.
 *
 * The white card (`PropertyCard`) is unchanged and still carries the search
 * results, where a dense list of comparable rows is the job. This variant is
 * for the one row that is meant to be looked at rather than scanned: the
 * photograph is the card, and the price, name, locality, configuration and
 * construction status sit on it under a scrim.
 *
 * WHAT IS THE SAME AS THE WHITE CARD, DELIBERATELY
 *
 * The photograph, through `PropertyImage` — same component, same source, same
 * lazy loading, same broken-image fallback to the illustration, same required
 * credit. Only the credit's position moves (see its `disclosure` prop): the
 * bottom edge of this card belongs to the price.
 *
 * The fields and their formatting, through `formatListingPrice` and
 * `formatConfigurations`, so a rent listing still says "/month" and a locality
 * still reads most-specific-last.
 *
 * The status line's three states. `newLaunch` is a separate state from the
 * construction stage on the approved screens, and dropping it to fit a
 * two-colour design would have relabelled every new launch as either finished
 * or unfinished. Status is never colour alone: each state carries its word.
 *
 * The shortlist control's behaviour — see `ShortlistHeart`.
 */
export function PropertyPhotoCard({ property }: { property: PropertySummary }) {
  const price = formatListingPrice(property);
  const { main, perMonth } = splitPricePerMonth(price);
  const locality = property.locationPath.slice(-2).join(", ");
  const bhk = formatConfigurations(property.configurations);
  const area = property.areaSummary;

  return (
    <article
      className={[
        // `isolate` keeps the z-indexes below local to the card; `group` is what
        // the photograph's zoom and the arrow's nudge hang off.
        // Two rows: the corner the "Featured" pill and the credit occupy, and
        // the text block, which sits at the bottom of the second.
        "group relative isolate grid grid-rows-[78px_auto] overflow-hidden",
        "rounded-[var(--radius-photo-card)]",
        "bg-body text-white",
        "transition-[transform,box-shadow] duration-200",
        "hover:-translate-y-[3px] hover:shadow-[0_16px_36px_rgba(18,24,43,0.28)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      ].join(" ")}
      // Where the required credit sits: clear of the "Featured" pill when there
      // is one, in the corner itself when there is not.
      style={{ "--kkl-credit-top": property.featured ? "54px" : "12px" } as React.CSSProperties}
    >
      <span
        className={[
          "absolute inset-0 block",
          "[&_img]:transition-transform [&_img]:duration-500",
          "group-hover:[&_img]:scale-[1.04]",
          "motion-reduce:[&_img]:transition-none motion-reduce:group-hover:[&_img]:scale-100",
        ].join(" ")}
      >
        <PropertyImage
          media={property.coverImage}
          fill
          disclosure="overlay"
          label={`${property.title} — photograph pending`}
        />
      </span>

      {/* The scrim. Without it this card is white text on a photograph. */}
      <span aria-hidden="true" className="absolute inset-0 z-[1] bg-[image:var(--kkl-photo-scrim)]" />

      {property.featured ? (
        <span className="absolute left-[12px] top-[12px] z-[2] rounded-full bg-white px-[12px] py-[5px] text-[12px] font-bold text-brand">
          Featured
        </span>
      ) : null}

      {/* Above the full-card link, and not inside it: a control nested in a
          link is neither reachable nor announced as its own thing. */}
      <ShortlistHeart title={property.title} />

      <Link
        href={`/property/${property.slug}`}
        aria-label={`View details of ${property.title}`}
        className={[
          "absolute inset-0 z-[3] rounded-[inherit]",
          "focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-saffron",
        ].join(" ")}
      />

      {/*
        The 1 : 1.1 shape, as a floor rather than a fixed height.

        `aspect-[1/1.1]` would pin the height, and a listing whose text runs
        long then either rides up over the credit or is clipped at the bottom —
        a rent range wraps to two lines and both happened. This spacer spans
        both rows and is 110% of the card's width tall, so the card is that
        tall OR as tall as its content needs, whichever is more, and the grid
        row stretches its neighbours to match.

        Zero width, so it takes part in no other sizing.
      */}
      <span aria-hidden="true" className="col-start-1 row-span-2 row-start-1 w-0 pt-[110%]" />

      {/* The text block carries its own scrim, ramping in pixels from its own
          top edge, so the contrast does not depend on how tall the content
          happens to be. The 38px of top padding is the ramp: it is empty, and
          by the time the price starts the scrim is at 0.70. */}
      <div
        data-scrim-block
        className={[
          "relative z-[2] col-start-1 row-start-2 self-end",
          "px-[16px] pb-[16px] pt-[38px]",
          "bg-[image:var(--kkl-photo-scrim-block)]",
        ].join(" ")}
      >
        <div className="flex min-w-0 flex-col gap-[5px]">
          {price ? (
            <p className="font-[family-name:var(--font-heading)] text-[22px] font-bold leading-[1.2] tracking-[-0.01em]">
              {main}
              {perMonth ? (
                <span className="text-[13px] font-semibold text-white/75">{perMonth}</span>
              ) : null}
            </p>
          ) : null}

          {/* Two lines, then an ellipsis — a name is a label here, not the
              link text; the link's name is its aria-label. */}
          {/* `text-white` explicitly: globals.css sets `h1..h4 { color: ink }`
              as a base rule, and a base element rule beats what the card
              inherits — without this the name is navy on navy. */}
          <h3 className="line-clamp-2 text-[17px] font-bold leading-[1.25] text-white">
            {property.title}
          </h3>

          <p className="flex items-center gap-[6px] text-[14px] text-surface">
            <PinIcon />
            <span className="min-w-0 truncate">{locality}</span>
          </p>

          {bhk || area ? (
            <p className="my-[2px] flex flex-wrap gap-[8px]">
              {bhk ? (
                <span className={CHIP}>
                  <BedIcon />
                  {bhk}
                </span>
              ) : null}
              {area ? (
                <span className={CHIP}>
                  <AreaIcon />
                  {area}
                </span>
              ) : null}
            </p>
          ) : null}

          {/* Only this row sits beside the arrow, so only this row gives up
              the width for it. The chips above get the card's full width,
              which is what keeps the pair on one line at 277px. */}
          <ConstructionLine property={property} />
        </div>

        {/* Decorative: the whole card is already the link. Positioned rather
            than placed in a flex row, because a 44px column taken out of a
            277px card is 44px the chips do not get. */}
        <span
          aria-hidden="true"
          className="absolute bottom-[16px] right-[16px] grid h-[44px] w-[44px] place-items-center rounded-full bg-saffron text-ink"
        >
          <ArrowIcon />
        </span>
      </div>
    </article>
  );
}

/*
 * 12px rather than the reference's 13px, and tighter padding with it.
 *
 * This row shares its width with the 320px rail, so a card is 277px across and
 * a chip pair like "3, 4 BHK" + "1,540–2,180 sq ft" is 262px at 13px — it
 * wrapped to a second line on every card, which pushed the text block 36px
 * taller and the card well past the 1 : 1.1 it is meant to be. At 12px the
 * pair fits the line. A longer area range still wraps, and the card grows to
 * take it rather than clipping it.
 */
const CHIP =
  "inline-flex items-center gap-[6px] rounded-[8px] bg-white/16 px-[8px] py-[5px] text-[12px] font-semibold backdrop-blur-[8px]";

function ConstructionLine({ property }: { property: PropertySummary }) {
  const ready = property.construction === "ready_to_move";

  // The same three states as the white card. The tones are the on-photo pair,
  // which are the same two hues lifted to clear 4.5:1 against the scrim;
  // a new launch takes the light neutral, because purple on navy does not.
  const { word, tone } = property.newLaunch
    ? { word: "New launch", tone: "text-on-brand" }
    : ready
      ? { word: "Ready to move", tone: "text-success-on-photo" }
      : { word: "Under construction", tone: "text-warning-on-photo" };

  const trailer = property.possession
    ? `Possession ${property.possession}`
    : ready
      ? "Handover complete"
      : null;

  return (
    <p className={`flex items-start gap-[7px] pr-[52px] text-[13px] font-semibold ${tone}`}>
      <span aria-hidden="true" className="mt-[5px] h-[8px] w-[8px] flex-none rounded-full bg-current" />
      <span className="min-w-0">
        {word}
        {trailer ? ` · ${trailer}` : ""}
      </span>
    </p>
  );
}

/**
 * Shortlisting belongs to an account, and a sample catalogue entry is not a
 * published listing, so there is nothing here to toggle: the control routes to
 * sign-in rather than drawing a filled heart over a save that never happened.
 * That is the behaviour the white card already has, and it is why this heart
 * carries no `aria-pressed` — a pressed state would be a claim.
 */
function ShortlistHeart({ title }: { title: string }) {
  return (
    <Link
      href="/auth?intent=shortlist"
      aria-label={`Save ${title} to shortlist`}
      className={[
        "absolute right-[12px] top-[12px] z-[4] grid h-[36px] w-[36px] place-items-center rounded-full",
        "bg-white/95 text-ink shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:text-brand",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saffron",
      ].join(" ")}
    >
      <HeartIcon />
    </Link>
  );
}
