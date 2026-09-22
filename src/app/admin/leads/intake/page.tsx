import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Lead intake", robots: { index: false } };

/** A-10 — sources, volumes and duplicates. */
export default async function AdminIntakePage() {
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
