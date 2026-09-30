import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { getServices } from "@/lib/services";
import { intakeStoreKind } from "@/lib/services/backend/config";
import { listIntakeBatches } from "@/lib/services/backend/intake";
import {
  INTAKE_BATCH_LIMIT,
  INTAKE_SCREEN_OMISSIONS,
  pageCapNote,
  type IntakeCounts,
} from "@/lib/services/backend/staff-views";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Lead intake", robots: { index: false } };

function count(value: number | null): string {
  return value === null ? "—" : String(value);
}

function sourceTotals(batches: readonly IntakeCounts[]): ReadonlyArray<{
  label: string;
  value: string;
  note: string;
}> {
  const groups = new Map<string, { submitted: number; missing: boolean }>();
  for (const batch of batches) {
    const label = batch.source ?? "Unknown source";
    const current = groups.get(label) ?? { submitted: 0, missing: false };
    if (batch.submitted === null) current.missing = true;
    else current.submitted += batch.submitted;
    groups.set(label, current);
  }
  if (groups.size === 0) {
    return [{ label: "Submitted", value: "0", note: "No batches on this page" }];
  }
  return [...groups.entries()].map(([label, group]) => ({
    label,
    value: String(group.submitted),
    note: group.missing ? "A submitted count was absent" : "Submitted on this page",
  }));
}

/** A-10 — sources, volumes and duplicates. */
export default async function AdminIntakePage() {
  if (intakeStoreKind() === "backend") {
    const loaded = await listIntakeBatches();
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
    const batches = loaded.value;
    const cap = pageCapNote(batches.length, INTAKE_BATCH_LIMIT);
    const sources = sourceTotals(batches);
    return (
      <AdminShell title="Lead intake" subtitle="Sources, volumes and duplicates">
        <div className="flex max-w-[900px] flex-col gap-[16px]">
          <IdentityBanner />
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
            {batches.length === 0 ? (
              <p className="t-body px-[18px] py-[16px] text-body">No intake batches are stored.</p>
            ) : batches.map((run) => (
              <Link
                key={run.batchRef}
                href={`/admin/leads/intake/${encodeURIComponent(run.batchRef)}`}
                className="flex flex-wrap items-center justify-between gap-[12px] border-b border-[#EDEFF6] px-[18px] py-[14px] transition-[background-color] duration-150 last:border-b-0 hover:bg-[#F6F8FD]"
              >
                <span className="min-w-0">
                  <span className="t-mono block text-[13px] text-ink">{run.batchRef}</span>
                  <span className="t-caption block text-muted">
                    {run.source ?? "Source not recorded"} · {run.createdAt ?? "Time not recorded"}
                  </span>
                </span>
                <span className="flex flex-wrap gap-[16px] text-[15px]">
                  <span className="text-success">{count(run.acceptedCount)} accepted</span>
                  <span className="text-warning">{count(run.rejectedCount)} rejected</span>
                  <span className="text-muted">{count(run.duplicateCount)} duplicates</span>
                  <span className="text-muted">{count(run.skippedCount)} skipped</span>
                </span>
              </Link>
            ))}
          </Card>
          <p className="t-caption text-muted">
            {[cap, ...INTAKE_SCREEN_OMISSIONS].filter(Boolean).join(" ")}
          </p>
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
              className="flex flex-wrap items-center justify-between gap-[12px] border-b border-[#EDEFF6] px-[18px] py-[14px] transition-[background-color] duration-150 last:border-b-0 hover:bg-[#F6F8FD]"
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
