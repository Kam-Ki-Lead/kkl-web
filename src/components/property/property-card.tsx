import Link from "next/link";
import type { PropertySummary } from "@/lib/domain/types";
import { formatConfigurations, formatListingPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { PropertyImage } from "./property-image";

/**
 * C-06 property card. Distinct from the lead card: this one sells a home to a
 * buyer, so the price leads and the photograph carries it.
 *
 * Construction status is never colour alone — it always carries its word.
 */
export function PropertyCard({
  property,
  actions = "link",
}: {
  property: PropertySummary;
  /** "link" on the homepage, "buttons" in search results — both are approved. */
  actions?: "link" | "buttons";
}) {
  const price = formatListingPrice(property);
  const locality = property.locationPath.slice(-2).join(", ");
  const area = property.areaSummary;

  return (
    <article className="flex flex-col overflow-hidden rounded-[12px] border border-line bg-white">
      <div className="relative">
        <PropertyImage
          media={property.coverImage}
          ratio="4 / 3"
          label={`${property.title} — photograph pending`}
        />
        <ShortlistButton propertyTitle={property.title} />
        {property.featured ? (
          <span className="absolute left-[10px] top-[10px] rounded-full bg-white px-[10px] py-[3px] text-[12px] font-bold text-brand shadow-sm">
            Featured
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-[14px]">
        {/* The approved portal cards lead with the price at 24px/800 (P-01);
            P-02 and P-10 render the same element at 23px — a 1px wobble inside
            the baseline itself, recorded in visual-differences.md. */}
        {price ? (
          <p className="font-[family-name:var(--font-heading)] text-[24px] font-extrabold leading-[1.2] tracking-[-0.025em] text-ink">
            {price}
          </p>
        ) : null}
        <h3 className="t-panel-title mt-[2px] text-ink">
          <Link href={`/property/${property.slug}`} className="hover:text-brand">
            {property.title}
          </Link>
        </h3>
        <p className="t-caption mt-[2px] text-muted">{locality}</p>

        <p className="mt-[8px] text-[15px] text-body">
          {formatConfigurations(property.configurations)}
          {area ? ` · ${area}` : ""}
        </p>

        <ConstructionLine property={property} />

        {actions === "buttons" ? (
          <div className="mt-[12px] grid grid-cols-2 gap-[10px]">
            <ButtonLink href={`/property/${property.slug}`} size="sm">
              View details
            </ButtonLink>
            <ButtonLink
              href={`/property/${property.slug}/enquiry`}
              size="sm"
              variant="secondary"
            >
              Enquire
            </ButtonLink>
          </div>
        ) : (
          <Link
            href={`/property/${property.slug}`}
            className="mt-[10px] text-[15px] font-semibold text-brand hover:text-brand-deep"
          >
            View details <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </article>
  );
}

function ConstructionLine({ property }: { property: PropertySummary }) {
  const ready = property.construction === "ready_to_move";

  // Three states, each with its own mark and word — status is never colour alone.
  const { mark, word, tone } = property.newLaunch
    ? { mark: "◆", word: "New launch", tone: "text-brand" }
    : ready
      ? { mark: "✓", word: "Ready to move", tone: "text-success" }
      : { mark: "◐", word: "Under construction", tone: "text-warning" };

  const trailer = property.possession
    ? `Possession ${property.possession}`
    : ready
      ? "Handover complete"
      : null;

  return (
    <p className={`t-caption mt-[6px] font-semibold ${tone}`}>
      <span aria-hidden="true">{mark} </span>
      {word}
      {trailer ? ` · ${trailer}` : ""}
    </p>
  );
}

/**
 * Shortlisting belongs to an account. Until the Buyer is signed in the control
 * routes to sign-in rather than pretending to save something.
 */
function ShortlistButton({ propertyTitle }: { propertyTitle: string }) {
  return (
    <Link
      href="/auth?intent=shortlist"
      aria-label={`Shortlist ${propertyTitle}`}
      className="absolute right-[10px] top-[10px] flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/95 text-[16px] text-body shadow-sm hover:text-brand"
    >
      <span aria-hidden="true">♡</span>
    </Link>
  );
}
