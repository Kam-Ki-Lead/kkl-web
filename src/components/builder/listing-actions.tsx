import Link from "next/link";
import {
  deleteListing,
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
 * Delete asks for no confirmation here, and that is a gap rather than a
 * decision: a confirm dialog belongs to C-07, which is not built, and a
 * `window.confirm` would be a control that disappears without JavaScript. It is
 * recorded rather than faked.
 */
export function ListingActions({
  listingId,
  status,
  canPublish,
}: {
  listingId: string;
  status: ListingStatus;
  canPublish: boolean;
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
    <div className="mt-[14px] flex flex-wrap items-center gap-[10px] border-t border-line pt-[14px]">
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

      {status === "draft" ? (
        <ButtonLink href={`/builder/properties/${listingId}/basics`} variant="quiet" size="action">
          {toggleLabel}
        </ButtonLink>
      ) : null}

      <form action={deleteListing}>
        <input type="hidden" name="listingId" value={listingId} />
        <Button type="submit" variant="quietDanger" size="action">
          Delete
        </Button>
      </form>

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
