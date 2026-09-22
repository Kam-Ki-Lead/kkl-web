import type { Metadata } from "next";
import Link from "next/link";
import { BuilderShell } from "@/components/builder/builder-shell";
import { ListingActions } from "@/components/builder/listing-actions";
import { NewListingButton } from "@/components/builder/new-listing-button";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import type { ListingStatus } from "@/lib/domain/types";

export const metadata: Metadata = { title: "My properties" };

const STATUS: Record<ListingStatus, { label: string; tone: ChipTone }> = {
  published: { label: "Published", tone: "success" },
  unpublished: { label: "Unpublished", tone: "muted" },
  draft: { label: "Draft", tone: "warning" },
};

const TABS: ReadonlyArray<{ key: string; label: string; status?: ListingStatus }> = [
  { key: "all", label: "All" },
  { key: "published", label: "Published", status: "published" },
  { key: "unpublished", label: "Unpublished", status: "unpublished" },
  { key: "draft", label: "Draft", status: "draft" },
];

/**
 * B-07 — my properties, with the listing actions of B-14.
 *
 * The tabs live in the URL so Back works and a filtered view can be shared,
 * which is the same rule the Buyer's search and the Seller's marketplace follow.
 */
export default async function BuilderPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const tabKey = one(params.tab) ?? "all";
  const tab = TABS.find((t) => t.key === tabKey) ?? TABS[0];
  const justPublished = one(params.published);

  const services = getServices().builder;
  const [listings, account] = await Promise.all([
    services.listings.list(tab?.status ? { status: tab.status } : undefined),
    services.account.get(),
  ]);

  const canPublish =
    account.accountStatus === "active" &&
    account.kycStatus === "approved" &&
    account.subscription.state !== "none" &&
    account.subscription.state !== "expired";

  return (
    <BuilderShell title="My properties" subtitle="Everything you have listed">
      <div className="flex flex-col gap-[16px]">
        {justPublished ? (
          <p
            role="status"
            className="rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
          >
            Published. The listing is live on the public portal and appears in search.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <div role="tablist" aria-label="Listing status" className="flex gap-[20px] border-b border-line">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/builder/properties" : `/builder/properties?tab=${t.key}`}
                aria-current={t.key === tabKey ? "page" : undefined}
                className={`-mb-px border-b-[3px] pb-[10px] text-[16px] transition-[color,border-color] duration-150 ${
                  t.key === tabKey
                    ? "border-brand font-bold text-brand"
                    : "border-transparent font-medium text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <NewListingButton />
        </div>

        {listings.length === 0 ? (
          <StateMessage
            title={tabKey === "all" ? "You have not listed anything yet" : "Nothing in this state"}
            action={<NewListingButton />}
          >
            {tabKey === "all"
              ? "A listing takes six short sections and can be saved as a draft at any point."
              : "Switch tabs to see your other listings."}
          </StateMessage>
        ) : (
          <ul className="flex flex-col gap-[12px]">
            {listings.map((listing) => {
              const status = STATUS[listing.status];
              return (
                <li key={listing.id}>
                  <Card className="p-[18px]">
                    <div className="flex flex-wrap items-start justify-between gap-[14px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-[10px]">
                          <h2 className="t-card-title text-ink">
                            <Link
                              href={`/builder/properties/${listing.id}/basics`}
                              className="underline-offset-2 hover:underline"
                            >
                              {listing.title}
                            </Link>
                          </h2>
                          <Chip tone={status.tone}>{status.label}</Chip>
                          {listing.hasMedia ? null : <Chip tone="muted">▣ No photos yet</Chip>}
                        </div>
                        <p className="t-caption mt-[2px] text-muted">{listing.locationLabel}</p>
                        <p className="mt-[4px] text-[15px] text-body">
                          {listing.configurationLabel} · {listing.priceLabel}
                        </p>
                        <p className="t-caption mt-[2px] text-muted">{listing.detailLine}</p>
                      </div>
                      <div className="flex-none text-right">
                        <p className="t-card-title text-ink">{listing.enquiryCount}</p>
                        <p className="t-caption text-muted">
                          {listing.enquiryCount === 1 ? "enquiry" : "enquiries"}
                        </p>
                      </div>
                    </div>

                    <ListingActions
                      listingId={listing.id}
                      status={listing.status}
                      canPublish={canPublish}
                    />
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BuilderShell>
  );
}
