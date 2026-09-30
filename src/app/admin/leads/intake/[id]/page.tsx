import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { getServices } from "@/lib/services";
import { intakeStoreKind } from "@/lib/services/backend/config";
import { INTAKE_GAPS } from "@/lib/services/backend/staff-contract-gaps";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Intake run", robots: { index: false } };

/**
 * A-11 — accepted rows, rejections and validation errors.
 *
 * The rejected rows carry masked numbers. They are masked in the data rather
 * than in this markup: a rejection is a row staff need to understand, not a
 * number they need to call, and a screen that rendered the full one is a
 * screenshot away from leaking it.
 */
export default async function AdminIntakeRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (intakeStoreKind() === "backend") {
    return (
      <AdminShell title={`Intake run ${id}`} subtitle="Accepted rows, rejections and validation errors">
        <StateMessage title="This intake run is not loaded from the service">
          {INTAKE_GAPS.join(" ")} Sample rejections are not shown in their place.
        </StateMessage>
      </AdminShell>
    );
  }
  const result = await getServices().admin.getIntakeRun(id);
  if (!result) notFound();
  const { run, rejections } = result;

  return (
    <AdminShell title={`Intake run ${run.id}`} subtitle="Accepted rows, rejections and validation errors">
      <div className="flex max-w-[900px] flex-col gap-[16px]">
        <Link
          href="/admin/leads/intake"
          className="t-caption text-brand underline underline-offset-2"
        >
          ← Lead intake
        </Link>

        <FixtureNotice>
          No rows were processed. This run and its rejections are fixtures.
        </FixtureNotice>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
            <div>
              <p className="t-mono text-[12px] text-muted">{run.id}</p>
              <h2 className="t-heading mt-[2px] text-ink">{run.source}</h2>
              <p className="t-caption text-muted">{run.when}</p>
            </div>
            <div className="flex flex-wrap gap-[18px]">
              <span>
                <span className="t-figure block text-success">{run.accepted}</span>
                <span className="t-caption text-muted">accepted</span>
              </span>
              <span>
                <span className="t-figure block text-danger">{run.rejected}</span>
                <span className="t-caption text-muted">rejected</span>
              </span>
              <span>
                <span className="t-figure block text-ink">{run.duplicates}</span>
                <span className="t-caption text-muted">merged</span>
              </span>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden p-0">
          <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
            Rejected rows
          </h2>
          <ul>
            {rejections.map((rejection) => (
              <li
                key={rejection.row}
                className="border-b border-[#EDEFF6] px-[18px] py-[14px] last:border-b-0"
              >
                <div className="flex flex-wrap items-baseline gap-[12px]">
                  <span className="t-mono text-[13px] text-muted">row {rejection.row}</span>
                  <span className="t-mono text-[13px] text-body">{rejection.maskedNumber}</span>
                  <span className="text-[15px] font-semibold text-ink">{rejection.field}</span>
                </div>
                <p className="t-body-sm mt-[3px] text-body">{rejection.why}</p>
              </li>
            ))}
          </ul>
        </Card>

        <p className="t-caption text-muted">
          Numbers are masked in the record, not hidden in this page. A rejected row is something to
          understand, not something to ring — and one of these rows was rejected precisely because
          the number is on the suppression list.
        </p>
      </div>
    </AdminShell>
  );
}
