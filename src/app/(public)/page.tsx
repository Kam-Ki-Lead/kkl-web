import Link from "next/link";
import { getServices } from "@/lib/services";
import { formatPriceRange } from "@/lib/format";
import { PropertyCard, ProjectCard } from "@/components/property/property-card";
import { PropertyImage } from "@/components/property/property-image";
import { HomeSearchCard } from "@/components/home/home-search-card";
import { Card, SectionHeader } from "@/components/ui/card";
import { ButtonLink, AccentButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";

/**
 * P-01 — the approved public homepage ("KKL Homepage - Portal Layout", baseline
 * 5bc3512). Featured hero, the search card as the page's primary action, featured
 * properties and projects, locality browsing, the match prompt, and the
 * role-entry sidebar.
 */
export default async function HomePage() {
  const services = getServices();
  const home = await services.properties.getHomepage();

  return (
    <div className="mx-auto box-content max-w-[1280px] px-[32px] pb-[40px] pt-[20px] max-[1060px]:px-[18px]">
      {home.featuredHero ? <FeaturedHero property={home.featuredHero} /> : null}

      <HomeSearchCard
        localities={home.localities}
        initialCount={home.totalPublishedListings}
      />

      <div className="mt-[28px] grid grid-cols-[1fr_320px] items-start gap-[24px] max-[1060px]:grid-cols-1">
        <div>
          <section className="mb-[32px]">
            <SectionHeader
              title="Featured properties"
              level="page"
              subtitle="Curated selection in Kolkata"
              action={
                <Link
                  href="/search"
                  className="text-[15px] font-semibold text-brand hover:text-brand-deep"
                >
                  View all <span aria-hidden="true">→</span>
                </Link>
              }
            />
            {home.featuredProperties.length > 0 ? (
              <div className="grid grid-cols-3 gap-[18px] max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
                {home.featuredProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <StateMessage
                title="No featured properties right now"
                action={
                  <ButtonLink href="/search" size="sm">
                    Browse all listings
                  </ButtonLink>
                }
              >
                Featured projects appear here once builders publish them. Every published
                listing is still searchable.
              </StateMessage>
            )}
          </section>

          <section className="mb-[32px]">
            <SectionHeader
              title="Featured projects"
              level="page"
              subtitle="Builder-published developments"
              action={
                <Link
                  href="/search?type=project"
                  className="text-[15px] font-semibold text-brand hover:text-brand-deep"
                >
                  View all <span aria-hidden="true">→</span>
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-[18px] max-[900px]:grid-cols-1">
              {home.featuredProjects.map((property) => (
                <ProjectCard key={property.id} property={property} />
              ))}
            </div>
          </section>

          <section className="mb-[32px]">
            <SectionHeader
              title="Browse by locality"
              level="page"
              subtitle={`${home.totalPublishedListings} listings across ${spellSmallNumber(home.localities.length)} localities`}
            />
            <div className="grid grid-cols-3 gap-[12px] max-[900px]:grid-cols-2">
              {home.localities.map((locality) => (
                <Link
                  key={locality.id}
                  href={`/search?locality=${locality.id}`}
                  className="rounded-[10px] border border-line bg-tint px-[16px] py-[14px] hover:border-brand"
                >
                  <span className="block font-[family-name:var(--font-heading)] text-[16px] font-bold tracking-[-0.01em] text-ink">
                    {locality.name}
                  </span>
                  <span className="t-caption text-muted">
                    {locality.listingCount} {locality.listingCount === 1 ? "listing" : "listings"}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <FindMyMatchPanel />
        </div>

        <aside className="flex flex-col gap-[16px]">
          <GuestCard />
          <RoleCard
            heading="Builders & developers"
            body="Publish your projects and receive buyer enquiries directly."
            note="Requires verification, admin approval and an active monthly subscription."
            cta="Start builder registration"
            href="/builders"
          />
          <RoleCard
            heading="Brokers & agencies"
            body="Buy qualified buyer leads with credits; contact details are released after purchase."
            note="Requires PAN and Aadhaar verification and admin approval."
            cta="Start broker registration"
            href="/brokers"
          />
        </aside>
      </div>
    </div>
  );
}

function FeaturedHero({ property }: { property: NonNullable<Awaited<ReturnType<ReturnType<typeof getServices>["properties"]["getHomepage"]>>["featuredHero"]> }) {
  const price = formatPriceRange(property.price);

  const summaryLine = [
    `${property.configurations.join(", ")} BHK`,
    property.newLaunch ? "new launch" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="relative h-[380px] overflow-hidden rounded-[10px] border border-line max-[900px]:h-auto max-[900px]:border-0 max-[900px]:bg-[#0A1230]">
      {/* The photograph and its gradient are a desktop treatment. On mobile the
          approved design drops to a compact dark panel — the image would push the
          search card, which is the page's primary action, below the fold. */}
      <div className="absolute inset-0 max-[900px]:hidden">
        <PropertyImage
          media={property.coverImage}
          fill
          quiet
          label={`${property.title} — project photograph pending`}
        />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 max-[900px]:hidden"
        style={{
          background:
            "linear-gradient(100deg, rgba(10,18,48,0.92) 0%, rgba(10,18,48,0.78) 34%, rgba(10,18,48,0.05) 62%, rgba(10,18,48,0) 100%)",
        }}
      />

      <div className="absolute inset-y-0 left-0 flex max-w-[54%] flex-col justify-center gap-[12px] px-[40px] py-[36px] max-[900px]:static max-[900px]:max-w-none max-[900px]:gap-[8px] max-[900px]:px-[18px] max-[900px]:py-[20px]">
        <span className="t-mono text-[11px] tracking-[0.14em] text-[#FAD9A3]">
          FEATURED PROJECT
        </span>
        {/* The approved banner title steps 26/32/38px and the price
            22/26/28px at the 620/1060 frame breaks — the sizes live in the
            classes because an inline fontSize would defeat them. */}
        <h1
          className="text-white text-[38px] max-[619px]:text-[26px] min-[620px]:max-[1059px]:text-[32px]"
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          {property.title}
        </h1>

        <p className="text-[17px] leading-[1.5] text-[#E6EAF9] max-[900px]:hidden">
          {property.configurations.join(", ")} BHK apartments of {property.areaSummary}
          {property.newLaunch ? ", new launch" : ""}
          {property.possession ? `, possession ${property.possession}` : ""}.
        </p>
        <p className="hidden text-[15px] text-[#E6EAF9] max-[900px]:block">{summaryLine}</p>

        <div className="flex flex-wrap items-center gap-[14px] max-[900px]:flex-col max-[900px]:items-start max-[900px]:gap-[10px]">
          {price ? (
            <span
              className="text-white text-[28px] max-[619px]:text-[22px] min-[620px]:max-[1059px]:text-[26px]"
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              {price}
            </span>
          ) : null}
          <AccentButtonLink href={`/property/${property.slug}`}>View project</AccentButtonLink>
        </div>
      </div>
    </section>
  );
}

/** The approved copy spells small counts ("across six localities"). */
function spellSmallNumber(n: number): string {
  const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return words[n] ?? String(n);
}

function FindMyMatchPanel() {
  return (
    <section className="rounded-[12px] border border-[#F3DFB4] bg-[#FFF7E8] p-[24px]">
      <span className="t-eyebrow text-warning">Find my match</span>
      <h2 className="t-section-title mt-[8px] max-w-[22ch] text-ink">
        Not sure where to start? Tell us what you need.
      </h2>
      <div className="mt-[12px] flex flex-wrap items-center justify-between gap-[18px]">
        <p className="t-body max-w-[52ch] text-body">
          Five short questions — budget, location, handover timing, configuration, and whether
          you are buying to live in or to invest. We match published projects to your
          requirement and you can shortlist from the results.
        </p>
        <div className="flex flex-col items-start gap-[8px]">
          <ButtonLink href="/find-my-match">Find matching homes</ButtonLink>
          <Link
            href="/find-my-match#how"
            className="text-[15px] font-semibold text-brand underline underline-offset-2 hover:text-brand-deep"
          >
            See how matching works
          </Link>
        </div>
      </div>
    </section>
  );
}

function GuestCard() {
  return (
    <Card as="section" className="p-[18px]">
      <div className="flex items-center gap-[10px]">
        <span
          aria-hidden="true"
          className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-tint text-brand"
        >
          ◍
        </span>
        <div>
          <p className="font-[family-name:var(--font-heading)] text-[16px] font-bold tracking-[-0.01em] text-ink">
            Guest
          </p>
          <p className="text-[14px] text-muted">Not signed in</p>
        </div>
      </div>
      <p className="mt-[12px] text-[15px] leading-[1.6] text-body">
        Sign in to keep your shortlist and track enquiries and replies in one place.
      </p>
      <ButtonLink href="/auth" className="mt-[14px] w-full">
        Sign in or register
      </ButtonLink>
    </Card>
  );
}

function RoleCard({
  heading,
  body,
  note,
  cta,
  href,
}: {
  heading: string;
  body: string;
  note: string;
  cta: string;
  href: string;
}) {
  return (
    <Card as="section" className="p-[18px]">
      <h2 className="t-card-title text-ink">{heading}</h2>
      <p className="mt-[6px] text-[15px] leading-[1.6] text-body">{body}</p>
      <p className="mt-[8px] text-[14px] text-muted">{note}</p>
      <ButtonLink href={href} variant="outline" className="mt-[14px] w-full">
        {cta}
      </ButtonLink>
    </Card>
  );
}
