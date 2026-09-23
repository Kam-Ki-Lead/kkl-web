import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServices, ServiceError } from "@/lib/services";
import type { PropertyDetail } from "@/lib/domain/types";
import { formatInr, formatPriceRange } from "@/lib/format";
import { PropertyImage } from "@/components/property/property-image";
import { Card, InsetPanel } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

async function load(slug: string): Promise<PropertyDetail> {
  try {
    return await getServices().properties.getBySlug(slug);
  } catch (error) {
    if (error instanceof ServiceError && error.kind === "not_found") notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const property = await load(slug);
    return { title: property.title };
  } catch {
    return { title: "Property" };
  }
}

/** P-03 — property / project detail. */
export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await load(slug);
  const price = formatPriceRange(property.price);
  const ready = property.construction === "ready_to_move";

  return (
    <div className="mx-auto box-content max-w-[1280px] px-[32px] pb-[40px] pt-[18px] max-[1060px]:px-[18px]">
      <p className="t-caption mb-[14px] text-muted">
        <Link href="/search" className="font-semibold text-brand hover:text-brand-deep">
          <span aria-hidden="true">← </span>Back
        </Link>{" "}
        · Property detail
      </p>

      <Gallery property={property} />

      <div className="mt-[22px] grid grid-cols-[1fr_360px] items-start gap-[26px] max-[1060px]:grid-cols-1">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div>
              <h1 className="t-title text-ink">{property.title}</h1>
              <p className="mt-[4px] text-[16px] text-body">
                {property.locationPath.slice(-2).join(", ")}
              </p>
            </div>
            <Link
              href="/auth?intent=shortlist"
              className="rounded-[6px] border-[1.5px] border-line bg-white px-[16px] py-[10px] text-[15px] font-semibold text-brand hover:border-brand"
            >
              <span aria-hidden="true">♡ </span>Save
            </Link>
          </div>

          <div className="mt-[12px] flex flex-wrap items-baseline gap-[14px]">
            {price ? <p className="t-title text-ink">{price}</p> : null}
            <p
              className={`text-[15px] font-semibold ${ready ? "text-success" : "text-warning"}`}
            >
              <span aria-hidden="true">{ready ? "✓ " : "◐ "}</span>
              {ready ? "Ready to move" : "Under construction"}
              {property.possession ? ` · Possession ${property.possession}` : ""}
            </p>
          </div>

          <Section title="Specifications">
            <div className="grid grid-cols-3 overflow-hidden rounded-[10px] border border-line max-[560px]:grid-cols-1">
              {property.specifications.map((spec, i) => (
                <div
                  key={spec.label}
                  className={`border-line p-[14px] ${i % 3 !== 2 ? "border-r" : ""} ${i < 3 ? "border-b" : ""} max-[560px]:border-r-0 max-[560px]:border-b`}
                >
                  <p className="t-caption text-muted">{spec.label}</p>
                  <p className="t-card-title mt-[2px] text-ink">{spec.value}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Pricing by configuration">
            <div className="overflow-hidden rounded-[10px] border border-line">
              <table className="w-full">
                <thead>
                  <tr className="bg-tint">
                    <th className="t-eyebrow px-[14px] py-[10px] text-muted">Configuration</th>
                    <th className="t-eyebrow px-[14px] py-[10px] text-muted">Carpet area</th>
                    <th className="t-eyebrow px-[14px] py-[10px] text-muted">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {property.pricingByConfiguration.map((row) => (
                    <tr key={row.configuration} className="border-t border-line">
                      <td className="px-[14px] py-[12px] text-[15px] font-bold text-ink">
                        {row.configuration}
                      </td>
                      <td className="px-[14px] py-[12px] text-[15px] text-body">
                        {row.carpetArea}
                      </td>
                      <td className="px-[14px] py-[12px] text-[15px] font-bold text-ink">
                        {row.priceInr === null ? (
                          <span className="font-normal text-muted">Not published</span>
                        ) : (
                          formatInr(row.priceInr)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Amenities">
            <ul className="flex flex-wrap gap-[10px]">
              {property.amenities.map((amenity) => (
                <li
                  key={amenity}
                  className="rounded-[8px] border border-line bg-tint px-[13px] py-[9px] text-[15px] text-body"
                >
                  {amenity}
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Location">
            <Card className="overflow-hidden">
              <div className="flex h-[180px] items-center justify-center bg-[#EFF1F7]">
                <p className="t-caption text-muted">Map — tile provider not yet chosen</p>
              </div>
              <div className="border-t border-line p-[14px]">
                <p className="text-[15px] text-ink">{property.address}</p>
                <p className="t-caption mt-[4px] text-muted">
                  India <span aria-hidden="true">→</span> West Bengal{" "}
                  <span aria-hidden="true">→</span> {property.locationPath.join(" → ")}
                </p>
              </div>
            </Card>
          </Section>

          <Section title="Possession">
            <InsetPanel>
              <p
                className={`text-[15px] font-semibold ${ready ? "text-success" : "text-warning"}`}
              >
                <span aria-hidden="true">{ready ? "✓ " : "◐ "}</span>
                {ready ? "Ready to move" : "Under construction"}
                {property.possession ? ` · Possession ${property.possession}` : ""}
              </p>
              <p className="t-caption mt-[6px] text-body">
                {property.possession
                  ? `The builder has published a target handover of ${property.possession}. Kam Ki Lead does not verify construction progress.`
                  : "The builder has not published a handover date. Kam Ki Lead does not verify construction progress."}
              </p>
            </InsetPanel>
          </Section>
        </div>

        <aside className="flex flex-col gap-[16px]">
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Interested in this project?</h2>
            <p className="t-caption mt-[6px] text-body">
              Send an enquiry to the builder, or ask for a site visit. You can do both without an
              account — we ask for a mobile number to send the confirmation.
            </p>
            <ButtonLink href={`/property/${property.slug}/enquiry`} className="mt-[14px] w-full">
              Send enquiry
            </ButtonLink>
            <ButtonLink
              href={`/property/${property.slug}/site-visit`}
              variant="secondary"
              className="mt-[10px] w-full"
            >
              Request a site visit
            </ButtonLink>
          </Card>

          <Card className="p-[18px]">
            <h2 className="t-label text-ink">Listed by</h2>
            <p className="mt-[4px] text-[16px] font-bold text-ink">{property.builderName}</p>
            <p className="t-caption mt-[4px] text-muted">
              Builder account, verified by Kam Ki Lead before publishing.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Gallery({ property }: { property: PropertyDetail }) {
  const [main, second] = property.media;

  // The approved P-03 gallery sizes these slots by FIXED HEIGHT, not by aspect
  // ratio: galleryMainH 400/320/220 and thumbH 194/150/120 across its three
  // widths, which break at 1060 and 620. Ratios were used here instead, and at
  // 1440 that rendered the main slot at 802x551 against the design's 843x400.
  // Nothing caught it until photography was wired into the comparison — with an
  // empty slot the two collapse to similar boxes and look alike.
  //
  // box-content is not decoration: the baseline's wrappers are content-box, so
  // its declared 400px is the height of the IMAGE and the box outside it is
  // 402px. Tailwind's border-box default makes the same number mean 398px of
  // image, which is how the first attempt at this fix landed 2px short on
  // every slot at every width.
  return (
    <div className="grid grid-cols-[2fr_1fr] gap-[12px] max-[1059px]:grid-cols-1">
      <div className="box-content h-[400px] overflow-hidden rounded-[10px] border border-line max-[1059px]:h-[320px] max-[619px]:h-[220px]">
        <PropertyImage
          media={main ?? null}
          fill
          label={`${property.title} — photograph pending from builder`}
        />
      </div>
      <div className="grid grid-rows-2 gap-[12px] max-[1059px]:grid-cols-2 max-[1059px]:grid-rows-none">
        <div className="box-content h-[194px] overflow-hidden rounded-[8px] border border-line max-[1059px]:h-[150px] max-[619px]:h-[120px]">
          <PropertyImage
            media={second ?? null}
            fill
            label="Further photographs pending"
          />
        </div>
        <div className="box-content flex h-[194px] flex-col items-center justify-center rounded-[8px] border border-line bg-[#EFF1F7] p-[14px] text-center max-[1059px]:h-[150px] max-[619px]:h-[120px]">
          <p className="t-card-title text-ink">Floor plans</p>
          <p className="t-caption mt-[2px] text-muted">
            {property.floorPlans.length === 0
              ? "Pending from builder"
              : `${property.floorPlans.length} available`}
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[24px]">
      <h2 className="t-card-title mb-[10px] text-ink">{title}</h2>
      {children}
    </section>
  );
}
