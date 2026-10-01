import type { Metadata } from "next";
import Link from "next/link";
import { BuilderShell } from "@/components/builder/builder-shell";
import { BuilderSampleNotice } from "@/components/builder/sample-notice";
import { StatTiles } from "@/components/console/stat-tiles";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";
import { listingStoreKind } from "@/lib/services/backend/config";
import { bearerMode } from "@/lib/services/backend/session";
import { ServiceError } from "@/lib/services/contracts";

export const metadata: Metadata = { title: "Builder dashboard" };

/** B-06 — Builder dashboard. */
export default async function BuilderDashboardPage() {
  const services = getServices().builder;
  const signedIn = bearerMode() === "browser-session";
  const listingsFromBackend = listingStoreKind() === "backend";
  const readListings = !signedIn || listingsFromBackend;
  let published: Awaited<ReturnType<typeof services.listings.list>> = [];
  let drafts: Awaited<ReturnType<typeof services.listings.list>> = [];
  let listingsUnreadable = false;
  const enquiries = await services.enquiries.list();
  if (readListings) {
    try {
      [published, drafts] = await Promise.all([
        services.listings.list({ status: "published" }),
        services.listings.list({ status: "draft" }),
      ]);
    } catch (error) {
      if (!(error instanceof ServiceError)) throw error;
      listingsUnreadable = true;
    }
  }

  const unread = enquiries.filter((e) => !e.read).length;
  const siteVisits = enquiries.filter((e) => e.kind === "site_visit").length;

  return (
    <BuilderShell title="Dashboard" subtitle="Listings, enquiries and publishing">
      <div className="flex flex-col gap-[18px]">
        <StatTiles
          tiles={[
            {
              value: listingsUnreadable || (signedIn && !listingsFromBackend) ? "—" : String(published.length),
              label: "Published",
              note: listingsUnreadable
                ? "The listing list could not be read"
                : listingsFromBackend
                  ? "Nothing on this screen publishes a listing"
                  : signedIn
                    ? "Not this account's property list"
                    : "Live on the portal",
            },
            {
              value: listingsUnreadable || (signedIn && !listingsFromBackend) ? "—" : String(drafts.length),
              label: drafts.length === 1 ? "Draft" : "Drafts",
              note: listingsUnreadable
                ? "The listing list could not be read"
                : listingsFromBackend
                  ? "Saved on this account"
                  : signedIn
                    ? "Not this account's property list"
                    : "Not yet submitted",
            },
            {
              value: String(enquiries.length),
              label: enquiries.length === 1 ? "Enquiry" : "Enquiries",
              note: `${unread} unread`,
            },
            {
              value: String(siteVisits),
              label: siteVisits === 1 ? "Site-visit request" : "Site-visit requests",
              note: "Awaiting your response",
            },
          ]}
        />

        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-[18px] max-[1200px]:grid-cols-1">
          <Card className="p-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-[10px]">
              <h2 className="t-panel-title text-ink">Recent enquiries on your listings</h2>
              <Link
                href="/builder/enquiries"
                className="text-[14px] font-bold text-brand underline underline-offset-2"
              >
                View all →
              </Link>
            </div>

            {enquiries.length === 0 ? (
              <p className="t-body mt-[12px] text-body">
                No enquiries yet. They arrive here when a buyer contacts you through one of your
                published listings.
              </p>
            ) : (
              <ul className="mt-[14px] flex flex-col gap-[10px]">
                {enquiries.slice(0, 3).map((enquiry) => (
                  <li key={enquiry.id}>
                    <Link
                      href={`/builder/enquiries/${enquiry.id}`}
                      className="flex items-center justify-between gap-[12px] rounded-[8px] bg-tint px-[14px] py-[12px] transition-[background-color] duration-150 hover:bg-[#EEF2FD]"
                    >
                      <span className="min-w-0">
                        <span className="block text-[15px] font-bold text-ink">
                          {enquiry.buyerName ?? enquiry.listingTitle}
                        </span>
                        <span className="t-caption block text-muted">
                          {enquiry.kind === "site_visit" ? "Site-visit request" : "Enquiry"} ·{" "}
                          {formatDateTime(enquiry.receivedAt)}
                        </span>
                      </span>
                      {enquiry.read ? null : <Chip tone="warning">New</Chip>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="flex flex-col gap-[18px]">
            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Publish a project</h2>
              <p className="t-body mt-[6px] text-body">
                Six short sections: basics, location, pricing, specifications, media and preview.
                Save a draft at any point.
              </p>
              <ButtonLink href="/builder/properties/new" size="action" className="mt-[14px] w-full">
                New listing
              </ButtonLink>
            </Card>

            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Also available to you</h2>
              <ul className="mt-[10px] flex flex-col">
                {[
                  ["/builder/marketplace", "Buy Leads"],
                  ["/builder/leads", "My purchased leads"],
                  ["/builder/billing", "Billing & credits"],
                  ["/builder/support", "Support"],
                ].map(([href, label]) => (
                  <li key={href} className="border-b border-line last:border-b-0">
                    <Link
                      href={href as string}
                      className="block py-[11px] text-[15px] font-bold text-brand underline-offset-2 hover:underline"
                    >
                      {label} →
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="t-caption mt-[10px] text-muted">
                Builders get the same marketplace, credits, billing and support modules as
                brokers, under Builder access — over this account&rsquo;s own records.
              </p>
            </Card>
          </div>
        </div>

        <BuilderSampleNotice />
      </div>
    </BuilderShell>
  );
}
