import type { Metadata } from "next";
import Link from "next/link";
import { BuilderShell } from "@/components/builder/builder-shell";
import { ListingActions } from "@/components/builder/listing-actions";
import { NewListingButton } from "@/components/builder/new-listing-button";
import { PropertyImage } from "@/components/property/property-image";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import { listingStoreKind } from "@/lib/services/backend/config";
import { bearerMode } from "@/lib/services/backend/session";
import { ServiceError } from "@/lib/services/contracts";
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
  const deleteCode = one(params.delete);

  const listingsFromBackend = listingStoreKind() === "backend";

  if (bearerMode() === "browser-session" && !listingsFromBackend) {
    return (
      <BuilderShell title="My properties" subtitle="Everything you have listed">
        <StateMessage title="This account has no property list here">
          The sample builder&rsquo;s projects are not shown, and this screen does not start a
          listing or record a photograph count. A builder listing is not held to an owner&rsquo;s
          contact, configuration, or photograph requirement. The price range on the sample editor
          is not written as the listing price.
        </StateMessage>
      </BuilderShell>
    );
  }

  const services = getServices().builder;
  let listings;
  let canPublish = false;
  try {
    const [listed, account] = await Promise.all([
      services.listings.list(tab?.status ? { status: tab.status } : undefined),
      listingsFromBackend ? Promise.resolve(null) : services.account.get(),
    ]);
    listings = listed;
    canPublish =
      !listingsFromBackend &&
      account !== null &&
      account.accountStatus === "active" &&
      account.kycStatus === "approved" &&
      account.subscription.state !== "none" &&
      account.subscription.state !== "expired";
  } catch (error) {
    if (error instanceof ServiceError) {
      return (
        <BuilderShell title="My properties" subtitle="Everything you have listed">
          <StateMessage title="This account’s listings could not be read">
            {error.message} Sample projects are not shown in their place.
          </StateMessage>
        </BuilderShell>
      );
    }
    throw error;
  }

  return (
    <BuilderShell title="My properties" subtitle="Everything you have listed">
      <div className="flex flex-col gap-[16px]">
        {deleteCode === "not_a_draft" ? (
          <StateMessage title="This listing was not deleted">
            Only a draft can be deleted. A listing with the review team is withdrawn, and a
            published listing is taken down by staff.
          </StateMessage>
        ) : null}
        {deleteCode === "listing_referenced" ? (
          <StateMessage title="This listing was not deleted">
            This draft is referenced by an enquiry, so it was not deleted.
          </StateMessage>
        ) : null}
        {deleteCode === "not_found" ? (
          <StateMessage title="This listing was not deleted">
            That listing is not on this account.
          </StateMessage>
        ) : null}
        {deleteCode === "unavailable" ? (
          <StateMessage title="This listing was not deleted">
            The draft was not deleted, and a sample project is not shown in its place.
          </StateMessage>
        ) : null}

        {justPublished && !listingsFromBackend ? (
          <p
            role="status"
            className="rounded-[8px] bg-chip-success-bg px-[14px] py-[10px] text-[14px] font-semibold text-success"
          >
            Published. The listing is live on the public portal and appears in search.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          {/* The approved filter is a row of pills: brand-filled when active,
              white with a control border when not. */}
          <div role="tablist" aria-label="Listing status" className="flex flex-wrap gap-[8px]">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/builder/properties" : `/builder/properties?tab=${t.key}`}
                aria-current={t.key === tabKey ? "page" : undefined}
                className={`inline-flex min-h-[40px] items-center rounded-full border-[1.5px] px-[14px] py-[9px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  t.key === tabKey
                    ? "border-brand bg-brand text-white"
                    : "border-control-border bg-white text-body hover:border-brand"
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
          <ul className="flex flex-col gap-[14px]">
            {listings.map((listing) => {
              const record = listing.recordStatus ?? listing.status;
              const status = STATUS[record as ListingStatus] ?? {
                label: record.replaceAll("_", " "),
                tone: "muted" as const,
              };
              return (
                <li key={listing.id}>
                  {/*
                   * The approved B-07 card (E-P6 correction): an image slot on
                   * the left (stacked on top below 620px) with the approved
                   * "No photos yet" state, then the listing facts, then the
                   * actions row. A plain <article>, not Card — the approved
                   * radius is 10px and Card's own 12px would fight it.
                   */}
                  <article className="flex overflow-hidden rounded-[10px] border border-line bg-white max-[619px]:flex-col">
                    <div className="relative flex-none bg-[#EEF0F7] max-[619px]:h-[180px] max-[619px]:w-full min-[620px]:max-[1059px]:h-[170px] min-[620px]:max-[1059px]:w-[200px] min-[1060px]:h-[186px] min-[1060px]:w-[250px]">
                      {listing.coverImage ? (
                        <PropertyImage media={listing.coverImage} fill quiet label={listing.title} />
                      ) : (
                        <div
                          role="img"
                          aria-label={
                            listingsFromBackend
                              ? `Photographs are not on this list — ${listing.title}`
                              : listing.hasMedia
                                ? `Photograph for ${listing.title} was chosen but no file is kept in sample mode`
                                : `No photographs yet — ${listing.title}`
                          }
                          className="flex h-full w-full flex-col items-center justify-center gap-[6px] text-muted"
                        >
                          <span aria-hidden="true" className="text-[22px] leading-none">
                            ▣
                          </span>
                          <span className="px-[8px] text-center text-[13px]">
                            {listingsFromBackend
                              ? "Photographs are not on this list"
                              : listing.hasMedia
                                ? "No file kept — sample mode"
                                : "No photos yet"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 px-[18px] py-[16px]">
                      <div className="flex flex-wrap justify-between gap-[14px]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-[10px]">
                            <h2 className="t-panel-title text-ink">
                              <Link
                                href={`/builder/properties/${listing.id}/basics`}
                                className="underline-offset-2 hover:underline"
                              >
                                {listing.title}
                              </Link>
                            </h2>
                            <Chip tone={status.tone} size="sm">
                              {status.label}
                            </Chip>
                          </div>
                          <p className="mt-[4px] text-[15px] text-body">{listing.locationLabel}</p>
                          <p className="mt-[8px] text-[15px] text-body">
                            {listing.configurationLabel} · {listing.priceLabel}
                          </p>
                          <p className="mt-[6px] text-[14px] text-muted">{listing.detailLine}</p>
                        </div>
                        {listing.enquiryCount == null ? (
                          <p className="t-caption text-muted">Enquiry count is not on this list.</p>
                        ) : (
                          <div className="flex-none whitespace-nowrap text-right">
                            <p className="font-[family-name:var(--font-heading)] text-[22px] font-extrabold text-ink">
                              {listing.enquiryCount}
                            </p>
                            <p className="t-caption text-muted">
                              {listing.enquiryCount === 1 ? "enquiry" : "enquiries"}
                            </p>
                          </div>
                        )}
                      </div>

                      <ListingActions
                        listingId={listing.id}
                        status={listing.status}
                        recordStatus={listing.recordStatus}
                        canPublish={canPublish}
                        allowDelete={!listingsFromBackend || listing.recordStatus === "draft"}
                      />
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BuilderShell>
  );
}
