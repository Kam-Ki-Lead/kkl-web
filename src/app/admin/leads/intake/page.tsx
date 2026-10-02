import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { PageNav } from "@/components/admin/page-nav";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { getServices } from "@/lib/services";
import { intakeStoreKind } from "@/lib/services/backend/config";
import { listIntakeBatches } from "@/lib/services/backend/intake";
import {
  INTAKE_SCREEN_OMISSIONS,
  isPastEnd,
  pageOffset,
  type IntakeCounts,
} from "@/lib/services/backend/staff-views";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Lead intake", robots: { index: false } };

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function sourceTotals(batches: readonly IntakeCounts[]): ReadonlyArray<{
  label: string;
  value: string;
  note: string;
}> {
  const groups = new Map<string, { submitted: number }>();
  for (const batch of batches) {
    const label = batch.source;
    const current = groups.get(label) ?? { submitted: 0 };
    current.submitted += batch.submitted;
    groups.set(label, current);
  }
  if (groups.size === 0) {
    return [{ label: "Submitted", value: "0", note: "No batches on this page" }];
  }
  return [...groups.entries()].map(([label, group]) => ({
    label,
    value: String(group.submitted),
    note: "Submitted on this page",
  }));
}

/** A-10 — sources, volumes and duplicates. */
export default async function AdminIntakePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (intakeStoreKind() === "backend") {
    const params = await searchParams;
    const offset = pageOffset(one(params.offset));
    const loaded = await listIntakeBatches(offset);
    if (!loaded.ok) {
      return (
        <AdminShell title="Lead intake" subtitle="Sources, volumes and duplicates">
          <IdentityBanner />
          <StateMessage tone="error" title="Intake runs could not be loaded">
            {loaded.message} Sample runs are not shown in their place.
          </StateMessage>
        </AdminShell>
      );
    }
    const page = loaded.value;
    const batches = page.batches;
    const past = isPastEnd(page);
    const sources = sourceTotals(batches);
    return (
      <AdminShell title="Lead intake" subtitle="Sources, volumes and duplicates">
        <div className="flex max-w-[900px] flex-col gap-[16px]">
          <IdentityBanner />
          <PageNav pathname="/admin/leads/intake" page={page} noun="batches" />
          {past ? (
            <StateMessage title="This page is past the end">
              {page.total} batches are stored. This offset has none of them.
            </StateMessage>
          ) : page.total === 0 ? (
            <StateMessage title="No intake batches">No batches are stored.</StateMessage>
          ) : (
          <>
          <div className="grid grid-cols-4 gap-[14px] max-[1060px]:grid-cols-2">
            {sources.map((source) => (
              <Card key={source.label} className="p-[18px]">
                <p className="font-[family-name:var(--font-heading)] text-[26px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink">
                  {source.value}
                </p>
                <p className="mt-[5px] text-[14px] font-semibold text-ink">{source.label}</p>
                <p className="t-caption mt-[2px] text-muted">{source.note}</p>
              </Card>
            ))}
          </div>
          <Card className="overflow-hidden p-0">
            <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
              Recent runs
            </h2>
            {batches.map((run) => (
              <Link
                key={run.batchRef}
                href={`/admin/leads/intake/${encodeURIComponent(run.batchRef)}`}
                className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[14px] transition-[background-color] duration-150 last:border-b-0 hover:bg-chip-neutral-bg"
              >
                <span className="min-w-0">
                  <span className="t-mono block text-[13px] text-ink">{run.batchRef}</span>
                  <span className="t-caption block text-muted">
                    {run.source} · {run.createdAt}
                  </span>
                </span>
                <span className="flex flex-wrap gap-[16px] text-[15px]">
                  <span className="text-success">{run.acceptedCount} accepted</span>
                  <span className="text-warning">{run.rejectedCount} rejected</span>
                  <span className="text-muted">{run.duplicateCount} duplicates</span>
                  <span className="text-muted">{run.skippedCount} skipped</span>
                </span>
              </Link>
            ))}
          </Card>
          </>
          )}
          <p className="t-caption text-muted">{INTAKE_SCREEN_OMISSIONS.join(" ")}</p>
        </div>
      </AdminShell>
    );
  }

  const { sources, runs } = await getServices().admin.intake();

  return (
    <AdminShell title="Lead intake" subtitle="Sources, volumes and duplicates">
      <div className="flex max-w-[900px] flex-col gap-[16px]">
        <FixtureNotice>
          There is no intake pipeline in this build. These runs, counts and rejection reasons are
          fixtures, kept so the screen&rsquo;s layout and its failure states can be reviewed.
        </FixtureNotice>

        <div className="grid grid-cols-4 gap-[14px] max-[1060px]:grid-cols-2">
          {sources.map((source) => (
            <Card key={source.label} className="p-[18px]">
              {/* 26px, as the approved design declares for these stat blocks. */}
              <p className="font-[family-name:var(--font-heading)] text-[26px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink">
                {source.value}
              </p>
              <p className="mt-[5px] text-[14px] font-semibold text-ink">{source.label}</p>
              <p className="t-caption mt-[2px] text-muted">{source.note}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden p-0">
          <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
            Recent runs
          </h2>
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/admin/leads/intake/${run.id}`}
              className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[14px] transition-[background-color] duration-150 last:border-b-0 hover:bg-chip-neutral-bg"
            >
              <span className="min-w-0">
                <span className="t-mono block text-[13px] text-ink">{run.id}</span>
                <span className="t-caption block text-muted">
                  {run.source} · {run.when}
                </span>
              </span>
              <span className="flex flex-wrap gap-[16px] text-[15px]">
                <span className="text-success">{run.accepted} accepted</span>
                <span className={run.rejected > 8 ? "text-danger" : "text-warning"}>
                  {run.rejected} rejected
                </span>
                <span className="text-muted">{run.duplicates} merged</span>
              </span>
            </Link>
          ))}
        </Card>
      </div>
    </AdminShell>
  );
}
