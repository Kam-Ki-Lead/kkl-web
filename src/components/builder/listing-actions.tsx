import Link from "next/link";
import {
  republishListing,
  unpublishListing,
} from "@/app/actions/builder-listings";
import { Button, ButtonLink } from "@/components/ui/button";
import type { ListingStatus } from "@/lib/domain/types";

/**
 * B-14 listing actions, which differ by state.
 *
 * Each destructive or state-changing action is its own form posting to its own
 * server action, so none of them depends on JavaScript and none can be
 * triggered by pressing Enter in a neighbouring one.
 *
 * Delete opens a confirmation page. The draft is removed only when that
 * page is submitted, so a list view cannot delete it by itself.
 */
export function ListingActions({
  listingId,
  status,
  canPublish,
  allowDelete = true,
  recordStatus,
}: {
  listingId: string;
  status: ListingStatus;
  canPublish: boolean;
  allowDelete?: boolean;
  /** The stored status, when it is not one of the three tabs. */
  recordStatus?: string;
}) {
  /*
   * The approved row draws one filled action (Edit listing), one bordered
   * action (Preview) and the state-changing actions as underlined links —
   * brand for the toggle, danger for Delete.
   */
  const toggleLabel =
    status === "published"
      ? "Unpublish"
      : status === "unpublished"
        ? "Republish"
        : "Continue editing";

  return (
    <div className="mt-[14px] flex flex-wrap items-center gap-[10px]">
      <ButtonLink href={`/builder/properties/${listingId}/basics`} size="action">
        Edit listing
      </ButtonLink>

      <ButtonLink href={`/builder/properties/${listingId}/preview`} variant="secondary" size="action">
        Preview
      </ButtonLink>

      {status === "published" ? (
        <form action={unpublishListing}>
          <input type="hidden" name="listingId" value={listingId} />
          <Button type="submit" variant="quiet" size="action">
            {toggleLabel}
          </Button>
        </form>
      ) : null}

      {status === "unpublished" ? (
        <form action={republishListing}>
          <input type="hidden" name="listingId" value={listingId} />
          <Button type="submit" variant="quiet" size="action" disabled={!canPublish}>
            {toggleLabel}
          </Button>
        </form>
      ) : null}

      {status === "draft" && (recordStatus === undefined || recordStatus === "draft") ? (
        <ButtonLink href={`/builder/properties/${listingId}/basics`} variant="quiet" size="action">
          {toggleLabel}
        </ButtonLink>
      ) : null}

      {allowDelete ? (
        <ButtonLink
          href={`/builder/properties/${listingId}/delete`}
          variant="quietDanger"
          size="action"
        >
          Delete
        </ButtonLink>
      ) : (
        <p className="t-caption text-muted">Only a draft can be deleted from this list.</p>
      )}

      {status === "published" ? (
        <Link
          href="/search"
          className="t-caption text-brand underline underline-offset-2"
          prefetch={false}
        >
          See it on the portal →
        </Link>
      ) : null}
    </div>
  );
}
