import Link from "next/link";
import type { PropertySummary } from "@/lib/domain/types";
import { formatConfigurations, formatListingPrice, splitPricePerMonth } from "@/lib/format";
import { Chip } from "@/components/ui/chip";
import { PropertyImage } from "./property-image";
import { ArrowIcon, CalendarIcon, HeartIcon, PinIcon } from "./icons";

/**
 * A project as a compact list row — "Featured projects" on P-01.
 *
 * One slim row per development, so a long list is scanned down a column rather
 * than read card by card. The columns are fixed or fractional, never
 * content-sized, so the name, the specs and the price line up from row to row;
 * that alignment is the whole point of the shape and the browser check asserts
 * it.
 *
 * WHAT IS THE SAME AS THE CARD IT REPLACES
 *
 * The photograph, through `PropertyImage` — same component, same source, same
 * lazy loading, same broken-image fallback to the illustration, same required
 * credit in the same corner. The fields and their formatting, through
 * `formatListingPrice` and `formatConfigurations`, so a letting still says
 * "/month" and a locality still reads most-specific-last. The three status
 * tones, through the shared `Chip`, so these pills are the same pills as every
 * other status pill on the site. The shortlist control's behaviour — see
 * `ShortlistHeart`.
 *
 * THE SPECS APPEAR TWICE IN THE MARKUP, NEVER TWICE ON SCREEN
 *
 * Above 1000px they are their own column; at or below, that column is
 * `display: none` and a copy inside the name block takes over. `display: none`
 * rather than a visual hide, so a screen reader at either width reads the
 * specs exactly once.
 */
export function ProjectRow({ property }: { property: PropertySummary }) {
  const price = formatListingPrice(property);
  const { main, perMonth } = splitPricePerMonth(price);
  const locality = property.locationPath.slice(-2).join(", ");
  const config = formatConfigurations(property.configurations);
  const configLine = config ? `${config} apartments` : "";
  const area = property.areaSummary;

  return (
    <article
      className={[
        // `isolation` keeps the z-indexes below local to the row; `group` is
        // what the arrow's nudge hangs off.
        "group relative isolate grid items-center overflow-hidden rounded-[18px] border border-line bg-white",
        "grid-cols-[150px_1.3fr_1fr_230px_44px] gap-[20px] pr-[20px]",
        // 200px rather than the reference's `auto`: each row is its own grid, so
        // an auto column is as wide as that row's own price and the prices go
        // ragged down the list — which is the one thing this shape exists to
        // avoid. The browser check fails if they stop lining up.
        "max-[1000px]:grid-cols-[130px_1fr_200px_44px] max-[1000px]:gap-[16px]",
        "max-[700px]:grid-cols-[110px_1fr_40px] max-[700px]:gap-x-[12px] max-[700px]:gap-y-0 max-[700px]:pr-[12px]",
        "transition-[transform,box-shadow] duration-200",
        "hover:-translate-y-[2px] hover:shadow-[0_12px_30px_rgba(18,24,43,0.14)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      ].join(" ")}
    >
      {/* The thumbnail fills the row's full height, so the row's height is set
          by its text and the photograph follows it. */}
      <div className="relative min-h-[132px] self-stretch max-[700px]:row-span-2">
        <PropertyImage
          media={property.coverImage}
          fill
          label={`${property.title} — photograph pending`}
        />
        <ShortlistHeart title={property.title} />
      </div>

      <div className="flex min-w-0 flex-col items-start gap-[6px] py-[12px] max-[700px]:pb-[4px]">
        <StatusPill property={property} />
        <h3 className="line-clamp-2 text-[18px] font-bold leading-[1.25] tracking-[-0.01em] text-ink">
          {property.title}
        </h3>
        <p className="flex items-center gap-[6px] text-[14px] text-muted">
          <PinIcon />
          <span className="min-w-0">{locality}</span>
        </p>

        {/* The narrow-width copy of the specs. Hidden outright above 1000px. */}
        {configLine || area ? (
          <p className="hidden text-[14px] font-semibold text-ink max-[1000px]:block">
            {configLine}
            {area ? <span className="block font-medium text-muted">{area}</span> : null}
          </p>
        ) : null}
      </div>

      {/* The wide-width specs column. Hidden outright at 1000px and below. */}
      <div className="flex flex-col gap-[3px] text-[14px] max-[1000px]:hidden">
        {configLine ? <span className="font-semibold text-ink">{configLine}</span> : null}
        {area ? <span className="font-medium text-muted">{area}</span> : null}
      </div>

      <div className="flex flex-col gap-[2px] whitespace-nowrap max-[700px]:col-start-2 max-[700px]:row-start-2 max-[700px]:whitespace-normal max-[700px]:pb-[12px]">
        {price ? (
          <p className="font-[family-name:var(--font-heading)] text-[21px] font-bold leading-[1.15] tracking-[-0.01em] text-ink max-[700px]:text-[19px]">
            {main}
            {perMonth ? (
              <span className="text-[13px] font-semibold text-muted">{perMonth}</span>
            ) : null}
          </p>
        ) : null}
        {property.possession ? (
          <p className="flex items-center gap-[6px] text-[14px] text-muted">
            <CalendarIcon />
            <span className="min-w-0">Possession {property.possession}</span>
          </p>
        ) : null}
      </div>

      {/* Decorative: the whole row is already the link. */}
      <span
        aria-hidden="true"
        className="grid h-[44px] w-[44px] place-items-center rounded-full bg-saffron text-ink max-[700px]:col-start-3 max-[700px]:row-span-2 max-[700px]:row-start-1 max-[700px]:h-[40px] max-[700px]:w-[40px]"
      >
        <ArrowIcon />
      </span>

      {/* Last in the markup and above everything but the heart: the row is one
          link, and the heart is a control beside it rather than inside it. */}
      <Link
        href={`/property/${property.slug}`}
        aria-label={`View details of ${property.title}`}
        className={[
          "absolute inset-0 z-[3] rounded-[inherit]",
          "focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-saffron",
        ].join(" ")}
      />
    </article>
  );
}

/**
 * The three states the approved screens distinguish, in the site's own chips.
 *
 * A new launch is a separate state from the construction stage, so it is not
 * folded into either: "New launch" would otherwise read as finished or
 * unfinished, and it is neither.
 */
function StatusPill({ property }: { property: PropertySummary }) {
  const ready = property.construction === "ready_to_move";
  const { tone, word } = property.newLaunch
    ? ({ tone: "neutral", word: "New launch" } as const)
    : ready
      ? ({ tone: "success", word: "Ready to move" } as const)
      : ({ tone: "warning", word: "Under construction" } as const);

  return (
    // `size="lg"` is the site's 14px/700 chip; below 700px it tightens so
    // "Under construction" stays on one line next to a 110px thumbnail.
    <Chip tone={tone} size="lg" className="max-[700px]:px-[10px] max-[700px]:py-[5px] max-[700px]:text-[12px]">
      {word}
    </Chip>
  );
}

/**
 * Shortlisting belongs to an account, and a sample catalogue entry is not a
 * published listing, so there is nothing here to toggle: the control routes to
 * sign-in rather than drawing a filled heart over a save that never happened.
 * That is the behaviour the cards it replaces already had, and it is why this
 * heart carries no `aria-pressed` — a pressed state would be a claim.
 */
function ShortlistHeart({ title }: { title: string }) {
  return (
    <Link
      href="/auth?intent=shortlist"
      aria-label={`Save ${title} to shortlist`}
      className={[
        "absolute right-[8px] top-[8px] z-[4] grid h-[34px] w-[34px] place-items-center rounded-full",
        "bg-white/95 text-ink shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:text-brand",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saffron",
      ].join(" ")}
    >
      <HeartIcon />
    </Link>
  );
}
