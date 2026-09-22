import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { NewListingButton } from "@/components/builder/new-listing-button";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "New listing" };

/**
 * The entry point to the editor.
 *
 * A page rather than a redirect, because creating a listing is a POST: landing
 * on a GET route that created a record would make a new empty draft every time
 * the URL was prefetched or revisited.
 */
export default function NewListingPage() {
  return (
    <BuilderShell title="New listing" subtitle="Six sections — save a draft any time">
      <div className="max-w-[620px]">
        <Card className="p-[22px]">
          <h2 className="t-heading text-ink">Start a listing</h2>
          <p className="t-body mt-[8px] text-body">
            Six short sections: basics, location, pricing, specifications, media and preview.
            Nothing is published until you reach the preview and choose to publish, and a draft
            can be saved at any point.
          </p>
          <div className="mt-[16px] flex flex-wrap gap-[10px]">
            <NewListingButton />
            <ButtonLink href="/builder/properties" variant="secondary">
              Back to properties
            </ButtonLink>
          </div>
        </Card>
      </div>
    </BuilderShell>
  );
}
