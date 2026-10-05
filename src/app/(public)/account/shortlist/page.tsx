import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { AccessPanel, StateMessage } from "@/components/ui/states";
import { ShortlistRemoveButton } from "@/components/account/shortlist-controls";
import { profileStoreKind } from "@/lib/services/backend/config";
import { readShortlist } from "@/lib/services/backend/buyer-records";
import { ServiceError } from "@/lib/services/contracts";

export const metadata: Metadata = { title: "My shortlist" };

/**
 * P-11 — shortlist.
 *
 * With the profile service connected, the list is the account's shortlist.
 * Only a published listing can be added, and publication is not available,
 * so a review account's list stays empty. Sample properties are not added
 * in order to fill it.
 */
export default async function ShortlistPage() {
  const connected = profileStoreKind() === "backend";
  if (!connected) {
    return (
      <div className="mx-auto max-w-[760px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
        <h1 className="t-title text-ink">My shortlist</h1>
        <p className="t-body mt-[6px] text-body">
          Projects you save while browsing, kept against your account.
        </p>
        <div className="mt-[18px]">
          <AccessPanel
            chipLabel="Not signed in"
            title="Sign in to see your shortlist"
            footnote="P-11 shortlist · saving is not connected until kkl-backend provides accounts"
            actions={
              <>
                <ButtonLink href="/auth?next=/account/shortlist" variant="secondary">
                  Sign in or register
                </ButtonLink>
                <ButtonLink href="/search">Browse properties</ButtonLink>
              </>
            }
          >
            A shortlist is stored against your account so it follows you between devices. Saving is
            not connected yet, so nothing you save now would be kept — we would rather say so than
            show you a list that disappears.
          </AccessPanel>
        </div>
      </div>
    );
  }

  // The read is what can fail, so the read is what is wrapped. Building the
  // JSX inside the try would put every child's render inside this catch,
  // which is not what the catch is for and is what React's
  // error-boundaries rule objects to: a component's render errors reach an
  // error boundary, never a try around the JSX expression.
  let list;
  try {
    list = await readShortlist();
  } catch (error) {
    if (error instanceof ServiceError && error.kind === "unauthenticated") {
      return (
        <div className="mx-auto max-w-[760px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
          <h1 className="t-title text-ink">My shortlist</h1>
          <div className="mt-[18px]">
            <AccessPanel
              chipLabel="Not signed in"
              title="Sign in to see your shortlist"
              actions={<ButtonLink href="/auth?next=/account/shortlist">Sign in or register</ButtonLink>}
            >
              The shortlist is stored on the account. This screen does not show a sample list.
            </AccessPanel>
          </div>
        </div>
      );
    }
    if (error instanceof ServiceError) {
      return (
        <div className="mx-auto max-w-[760px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
          <StateMessage title="This shortlist could not be read">{error.message}</StateMessage>
        </div>
      );
    }
    throw error;
  }

  return (
    <div className="mx-auto max-w-[760px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">My shortlist</h1>
      <p className="t-body mt-[6px] text-body">
        Published properties saved on this account. {list.total} saved.
      </p>
      {list.items.length === 0 ? (
        <div className="mt-[18px]">
          <StateMessage title="Nothing is shortlisted">
            Only a published property can be saved here. Publication is not available, so this
            list stays empty. A draft is not added in its place.
          </StateMessage>
        </div>
      ) : (
        <ul className="mt-[18px] flex flex-col gap-[12px]">
          {list.items.map((item) => (
            <li key={item.listingId} className="flex items-start justify-between gap-[14px] rounded-[10px] border border-line px-[16px] py-[14px]">
              <div>
                <p className="text-[16px] font-semibold text-ink">{item.title ?? item.reference ?? item.listingId}</p>
                <p className="t-caption mt-[4px] text-muted">
                  {item.status ?? "Status not reported"}
                  {item.priceInr != null ? ` · ₹${item.priceInr.toLocaleString("en-IN")}` : ""}
                  {item.priceMinInr != null || item.priceMaxInr != null
                    ? ` · range ₹${item.priceMinInr?.toLocaleString("en-IN") ?? "—"}–₹${item.priceMaxInr?.toLocaleString("en-IN") ?? "—"}`
                    : ""}
                </p>
              </div>
              <ShortlistRemoveButton listingId={item.listingId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
