import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Property review", robots: { index: false } };

const FILTERS = [
  { label: "Reported", value: "reported" },
  { label: "Recently published", value: "published" },
  { label: "Unpublished by staff", value: "unpublished" },
  { label: "All", value: "all" },
];

const STATE: Record<string, { label: string; tone: ChipTone }> = {
  reported: { label: "Reported", tone: "danger" },
  published: { label: "Published", tone: "success" },
  unpublished: { label: "Unpublished", tone: "muted" },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-08 — listings awaiting review or reported.
 *
 * **There is no approval queue here, and that is deliberate.** D-10 — whether a
 * listing is reviewed before or after it goes live — is open. Building an
 * approve step would settle it by implication and would contradict the Builder
 * console, where publishing reaches the portal immediately. What this screen
 * offers instead is what is defined: a listing can be taken down, and a report
 * against one can be dismissed.
 */
export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = one((await searchParams).filter) || "reported";
  const filter =
    raw === "reported" || raw === "published" || raw === "unpublished" ? raw : undefined;

  const listings = await getServices().admin.listListings(filter);

  return (
    <AdminShell title="Property review" subtitle="Listings awaiting review or reported">
      <div className="flex max-w-[900px] flex-col gap-[12px]">
        <FixtureNotice>
          These rows are sample portal listings. They are not owner submissions, and the
          owner-submission queue does not stand in for them. No contract moderates a live or
          reported listing.
        </FixtureNotice>
        <div className="flex flex-wrap gap-[8px]">
          {FILTERS.map((option) => {
            const active = option.value === raw;
            return (
              <Link
                key={option.value}
                href={`/admin/properties?filter=${option.value}`}
                aria-current={active ? "true" : undefined}
                className={`min-h-[40px] rounded-full border-[1.5px] px-[14px] py-[9px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-body hover:border-[#C6CCE0]"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        {listings.length === 0 ? (
          <StateMessage title="Nothing in this view">
            No listings match this filter right now.
          </StateMessage>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {listings.map((listing) => {
              const chip = STATE[listing.state] ?? STATE.published!;
              return (
                <Link key={listing.id} href={`/admin/properties/${listing.id}`}>
                  <Card
                    className={`p-[18px] transition-[border-color] duration-150 hover:border-brand ${
                      listing.state === "reported" ? "border-[#F3C4BF]" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[12px]">
                      <div className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-[9px]">
                          <span className="t-mono text-[13px] text-muted">{listing.id}</span>
                          {/* The approved queue sets listing names in Archivo. */}
                          <span className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-ink">
                            {listing.name}
                          </span>
                        </span>
                        <span className="t-body mt-[2px] block text-body">
                          {listing.builder} · {listing.locality}
                        </span>
                        <span className="mt-[2px] block text-[14px] text-muted">{listing.note}</span>
                      </div>
                      <div className="flex flex-none flex-col items-end gap-[6px]">
                        <Chip tone={chip.tone}>{chip.label}</Chip>
                        {listing.outcome ? (
                          <span className="t-caption text-muted">
                            {listing.outcome === "unpublished"
                              ? "taken down by staff"
                              : "report dismissed"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[16px]">
          <h2 className="t-card-title text-warning">There is no approve action here</h2>
          <p className="t-body mt-[6px] text-body">
            {DECISIONS["D-10"].question} — <strong>D-10</strong>, and it is not decided. A listing
            published in the Builder console reaches the public portal immediately in this build.
            Adding an approval step here would settle that question by implication, so this screen
            offers only what is defined: taking a listing down, and deciding a report.
          </p>
          <p className="t-caption mt-[8px] text-muted">
            Dismissing a report leaves a listing exactly as published as it already was. It is not
            an approval and the audit entry records it as unchanged.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
