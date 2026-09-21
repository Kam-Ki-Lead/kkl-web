import Link from "next/link";
import type { PropertySummary } from "@/lib/domain/types";
import { formatConfigurations, formatPriceRange } from "@/lib/format";
import { Chip } from "@/components/ui/chip";
import { PropertyImage } from "./property-image";

/**
 * C-06 property card. Distinct from the lead card: this one sells a home to a
 * buyer, so the price leads and the photograph carries it.
 *
 * Construction status is never colour alone — it always carries its word.
 */
export function PropertyCard({ property }: { property: PropertySummary }) {
  const price = formatPriceRange(property.price);
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
        {price ? <p className="t-figure text-ink">{price}</p> : null}
        <h3 className="t-card-title mt-[2px] text-ink">
          <Link href={`/property/${property.slug}`} className="hover:text-brand">
            {property.title}
          </Link>
        </h3>
        <p className="t-caption mt-[2px] text-muted">{locality}</p>

        <p className="t-caption mt-[8px] text-body">
          {formatConfigurations(property.configurations)}
          {area ? ` · ${area}` : ""}
        </p>

        <ConstructionLine
          construction={property.construction}
          possession={property.possession}
        />

        <Link
          href={`/property/${property.slug}`}
          className="mt-[10px] text-[15px] font-semibold text-brand hover:text-brand-deep"
        >
          View details <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

function ConstructionLine({
  construction,
  possession,
}: {
  construction: PropertySummary["construction"];
  possession: string | null;
}) {
  const ready = construction === "ready_to_move";
  return (
    <p
      className={`t-caption mt-[6px] font-semibold ${ready ? "text-success" : "text-warning"}`}
    >
      <span aria-hidden="true">{ready ? "✓ " : "◐ "}</span>
      {ready ? "Ready to move" : "Under construction"}
      {possession ? ` · ${ready ? "Handover complete" : `Possession ${possession}`}` : ""}
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

/** The wide, horizontal variant used by "Featured projects" on the homepage. */
export function ProjectCard({ property }: { property: PropertySummary }) {
  const price = formatPriceRange(property.price);
  const locality = property.locationPath.slice(-2).join(", ");
  const ready = property.construction === "ready_to_move";

  return (
    <article className="flex overflow-hidden rounded-[12px] border border-line bg-white max-[560px]:flex-col">
      <div className="relative w-[172px] flex-none self-stretch max-[560px]:w-full">
        <PropertyImage
          media={property.coverImage}
          fill
          label={`${property.title} — photograph pending`}
          className="max-[560px]:aspect-[4/3]"
        />
        <ShortlistButton propertyTitle={property.title} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-[14px]">
        <span className="self-start">
          {property.newLaunch ? (
            <Chip tone="neutral">New launch</Chip>
          ) : (
            <Chip tone={ready ? "success" : "warning"}>
              {ready ? "Ready to move" : "Under construction"}
            </Chip>
          )}
        </span>
        <h3 className="t-card-title mt-[8px] text-ink">
          <Link href={`/property/${property.slug}`} className="hover:text-brand">
            {property.title}
          </Link>
        </h3>
        <p className="t-caption mt-[2px] text-muted">{locality}</p>
        <p className="t-caption mt-[8px] text-body">
          {formatConfigurations(property.configurations)} apartments
          {property.areaSummary ? ` · ${property.areaSummary}` : ""}
        </p>
        {price ? <p className="t-figure mt-[8px] text-ink">{price}</p> : null}
        {property.possession ? (
          <p className="t-caption text-muted">Possession {property.possession}</p>
        ) : null}
      </div>
    </article>
  );
}
