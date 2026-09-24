import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReasonForm } from "@/components/admin/reason-form";
import { moderateListing } from "@/app/actions/admin";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Property", robots: { index: false } };

const STATE: Record<string, { label: string; tone: ChipTone }> = {
  reported: { label: "Reported", tone: "danger" },
  published: { label: "Published", tone: "success" },
  unpublished: { label: "Unpublished", tone: "muted" },
};

/**
 * A-09 — listing detail and moderation.
 *
 * Two actions, both reason-gated, neither of them an approval. Unpublishing
 * hides a listing from buyers; dismissing a report closes the report and
 * changes nothing about the listing. The audit entry for a dismissal records
 * `listing_status` as unchanged on purpose, so the log can prove that later.
 */
export default async function AdminPropertyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const action = (await searchParams).action;

  const listing = await getServices().admin.getListing(id);
  if (!listing) notFound();

  const chip = STATE[listing.state] ?? STATE.published!;
  const asking = action === "unpublish" || action === "dismiss";

  return (
    <AdminShell title={listing.name} subtitle="Listing detail and moderation">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Link
          href="/admin/properties"
          className="t-caption text-brand underline underline-offset-2"
        >
          ← Property review
        </Link>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <p className="t-mono text-[12px] text-muted">{listing.id}</p>
              <h2 className="t-heading mt-[2px] text-ink">{listing.name}</h2>
              <p className="t-body text-body">
                {listing.builder} · {listing.locality}
              </p>
            </div>
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </div>
          <p className="t-body mt-[14px] border-t border-line pt-[14px] text-body">
            {listing.note}
          </p>
          {/* Said here because it is the screen where somebody would most
              expect to see the photographs they are being asked to judge. */}
          <p className="t-caption mt-[10px] text-warning">
            <strong>No media is shown.</strong> Nothing was uploaded anywhere in this build, so
            there is nothing to render. A real review screen needs the photographs beside the
            report, and that depends on media storage that does not exist yet.
          </p>
        </Card>

        {listing.outcome ? (
          <Card className="border-[#BFE0CE] bg-chip-success-bg p-[18px]">
            <h2 className="t-card-title text-success">Decision recorded</h2>
            <p className="t-body mt-[6px] text-body">
              {listing.outcome === "unpublished"
                ? "This listing was unpublished. It is hidden from buyers, the builder was told why, and the reason is in the audit log."
                : "The report was dismissed. The listing stayed exactly as published as it already was — this was not an approval — and the reason is in the audit log."}
            </p>
            <ButtonLink href="/admin/audit" variant="secondary" size="sm" className="mt-[12px]">
              See the audit entry
            </ButtonLink>
          </Card>
        ) : asking ? (
          <ReasonForm
            action={moderateListing}
            title={action === "unpublish" ? "Unpublish this listing" : "Dismiss this report"}
            body={
              action === "unpublish"
                ? "The listing is hidden from buyers immediately and the builder is told why. It is not deleted, and the builder can correct and republish it."
                : "The report is closed and the listing stays published. This is not an approval: nothing about the listing changes, and the audit entry records its status as unchanged. The reporter is told the outcome but not who reviewed it."
            }
            confirmLabel={action === "unpublish" ? "Unpublish listing" : "Dismiss report"}
            destructive={action === "unpublish"}
            hidden={{
              listingId: listing.id,
              action: action === "unpublish" ? "unpublish" : "dismiss_report",
            }}
            cancel={
              <Link
                href={`/admin/properties/${listing.id}`}
                className="t-caption text-brand underline underline-offset-2"
              >
                Cancel
              </Link>
            }
          />
        ) : (
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Moderation</h2>
            <div className="mt-[12px] flex flex-wrap gap-[10px]">
              <ButtonLink
                href={`/admin/properties/${listing.id}?action=unpublish`}
                variant="destructive"
                size="action"
              >
                Unpublish this listing
              </ButtonLink>
              {listing.state === "reported" ? (
                <ButtonLink
                  href={`/admin/properties/${listing.id}?action=dismiss`}
                  variant="secondary"
                  size="action"
                >
                  Dismiss the report
                </ButtonLink>
              ) : null}
            </div>
            <p className="t-caption mt-[12px] text-muted">
              There is no approve action. Whether listings are reviewed before or after they go
              live is <strong>D-10</strong> and is undecided, so this console does not publish
              anything.
            </p>
          </Card>
        )}

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Listing history</h2>
          <ul className="mt-[10px] flex flex-col">
            {listing.history.map((entry) => (
              <li
                key={`${entry.what}-${entry.when}`}
                className="flex flex-wrap items-baseline justify-between gap-[10px] border-b border-line py-[10px] last:border-b-0"
              >
                <span className="text-[15px] text-ink">{entry.what}</span>
                <span className="t-caption text-muted">
                  {entry.who} · {entry.when}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}
