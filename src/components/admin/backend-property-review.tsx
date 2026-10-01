import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReasonForm } from "@/components/admin/reason-form";
import { moderateListing } from "@/app/actions/admin";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { NOTIFICATION_RECORDED } from "@/lib/services/backend/admin-queue-reading";
import { loadModeratedProperty } from "@/lib/services/backend/admin-queues";

const STATE: Record<string, { label: string; tone: ChipTone }> = {
  published: { label: "Published", tone: "success" },
  unpublished: { label: "Unpublished", tone: "muted" },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function stamp(iso: string): string {
  return iso.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC");
}

/** One published or unpublished listing. A draft is not found here. */
export async function BackendPropertyReview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const action = one((await searchParams).action);
  const loaded = await loadModeratedProperty(id);
  if (!loaded.ok) {
    return (
      <AdminShell title="Property" subtitle="Live property moderation">
        <StateMessage tone="error" title="That listing could not be loaded">
          {loaded.message}
        </StateMessage>
      </AdminShell>
    );
  }
  if (!loaded.value) notFound();
  const listing = loaded.value;
  const chip = STATE[listing.state] ?? STATE.published!;

  return (
    <AdminShell title={listing.name ?? "Untitled listing"} subtitle="Live property moderation">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Link href="/admin/properties" className="t-caption text-brand underline underline-offset-2">
          ← Property review
        </Link>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <p className="t-mono text-[12px] text-muted">{listing.reference}</p>
              <h2 className="t-heading mt-[2px] text-ink">{listing.name ?? "Untitled listing"}</h2>
              <p className="t-body text-body">
                {listing.accountName ?? "Account name not recorded"} · {listing.postedAs}
                {listing.locality ? ` · ${listing.locality}` : ""}
              </p>
            </div>
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </div>
          <p className="t-body mt-[14px] border-t border-line pt-[14px] text-body">{listing.note}</p>
          <p className="t-caption mt-[10px] text-muted">
            Photographs are not part of this moderation record. Drafts and owner submissions
            are not opened here.
          </p>
        </Card>

        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[16px]">
          <h2 className="t-card-title text-warning">Dismiss report is unavailable</h2>
          <p className="t-body mt-[6px] text-body">
            No approved rule records a report against a live listing, so a report cannot be
            dismissed. This screen does not publish or republish a listing.
          </p>
        </Card>

        {listing.state === "unpublished" ? (
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Taken off the public path</h2>
            <p className="t-body mt-[6px] text-body">
              This listing is already unpublished. There is no republish action.
            </p>
            <p className="t-caption mt-[8px] text-muted">{NOTIFICATION_RECORDED}</p>
          </Card>
        ) : null}

        {listing.state === "published" && action === "unpublish" ? (
          <ReasonForm
            action={moderateListing}
            title="Take this listing off the public path"
            body="A reason is required. The listing moves from published to unpublished. This does not approve it, and it does not publish anything else. A notification is recorded for the account. This screen does not say that message was delivered."
            confirmLabel="Unpublish listing"
            destructive
            hidden={{ listingId: listing.id, action: "unpublish" }}
            recordedNote={NOTIFICATION_RECORDED}
            cancel={
              <Link
                href={`/admin/properties/${listing.id}`}
                className="t-caption text-brand underline underline-offset-2"
              >
                Cancel
              </Link>
            }
          />
        ) : null}

        {listing.state === "published" && action !== "unpublish" ? (
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Moderation</h2>
            <div className="mt-[12px]">
              <ButtonLink
                href={`/admin/properties/${listing.id}?action=unpublish`}
                variant="destructive"
                size="action"
              >
                Unpublish this listing
              </ButtonLink>
            </div>
            <p className="t-caption mt-[12px] text-muted">
              There is no approve, publish, or republish action.
            </p>
          </Card>
        ) : null}

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Listing history</h2>
          {listing.history.length === 0 ? (
            <p className="t-body mt-[8px] text-body">No review entry was returned with this listing.</p>
          ) : (
            <ul className="mt-[10px] flex flex-col">
              {listing.history.map((entry) => (
                <li
                  key={`${entry.at}-${entry.to}`}
                  className="border-b border-line py-[10px] last:border-b-0"
                >
                  <span className="text-[15px] text-ink">
                    {entry.from ?? "—"} → {entry.to}. {entry.reason}
                  </span>
                  <span className="t-caption mt-[2px] block text-muted">
                    {entry.actorLabel} · {stamp(entry.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
