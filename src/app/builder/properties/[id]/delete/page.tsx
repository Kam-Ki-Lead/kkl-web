import type { Metadata } from "next";
import { deleteListing } from "@/app/actions/builder-listings";
import { BuilderShell } from "@/components/builder/builder-shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import { ServiceError } from "@/lib/services/contracts";

export const metadata = { title: "Delete draft" } satisfies Metadata;

/**
 * Confirmation for DELETE /v1/listings/{id}.
 * Opening this page does not delete anything. The draft is removed only
 * when the form is submitted.
 */
export default async function DeleteDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let listing;
  try {
    listing = await getServices().builder.listings.get(id);
  } catch (error) {
    if (error instanceof ServiceError) {
      return (
        <BuilderShell title="Delete draft" subtitle="This draft was not removed">
          <StateMessage title="This listing could not be opened">
            {error.message} A sample project is not shown in its place.
          </StateMessage>
        </BuilderShell>
      );
    }
    throw error;
  }
  if (!listing) {
    return (
      <BuilderShell title="Delete draft" subtitle="This draft was not removed">
        <StateMessage title="This listing was not deleted">
          That listing is not on this account. A sample project is not shown in its place.
        </StateMessage>
      </BuilderShell>
    );
  }

  const recordStatus = listing.recordStatus ?? listing.status;
  if (recordStatus !== "draft") {
    return (
      <BuilderShell title="Delete draft" subtitle="This listing stays">
        <StateMessage title="Only a draft can be deleted">
          A listing with the review team is withdrawn, and a published listing is taken down by
          staff. This one was not deleted.
        </StateMessage>
        <div className="mt-[16px]">
          <ButtonLink href="/builder/properties" variant="secondary">
            Back to properties
          </ButtonLink>
        </div>
      </BuilderShell>
    );
  }

  const title = listing.title.trim() === "" ? "Untitled project" : listing.title;

  return (
    <BuilderShell title="Delete draft" subtitle="This removes the draft from your account">
      <Card className="max-w-[620px] p-[22px]">
        <h2 className="t-card-title text-ink">Delete {title}?</h2>
        <p className="t-body mt-[8px] text-body">
          This deletes the draft. It does not publish it, and it cannot be undone from this
          screen. Another account&apos;s draft is not deleted.
        </p>
        <div className="mt-[16px] flex flex-wrap gap-[10px]">
          <form action={deleteListing}>
            <input type="hidden" name="listingId" value={listing.id} />
            <Button type="submit" variant="destructive">
              Delete this draft
            </Button>
          </form>
          <ButtonLink href="/builder/properties" variant="secondary">
            Keep the draft
          </ButtonLink>
        </div>
      </Card>
    </BuilderShell>
  );
}
