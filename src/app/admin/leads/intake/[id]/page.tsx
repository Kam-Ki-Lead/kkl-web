import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Children } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { getServices } from "@/lib/services";
import { intakeStoreKind } from "@/lib/services/backend/config";
import { getIntakeBatch } from "@/lib/services/backend/intake";
import { INTAKE_SCREEN_OMISSIONS } from "@/lib/services/backend/staff-views";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Intake run", robots: { index: false } };

/**
 * A-11 — accepted rows, rejections and validation errors.
 *
 * Sample fixtures carry masked numbers in the data. The backend batch does
 * not include a phone number, and this page does not add one.
 */
export default async function AdminIntakeRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (intakeStoreKind() === "backend") {
    const loaded = await getIntakeBatch(id);
    if (!loaded.ok) {
      return (
        <AdminShell title={`Intake run ${id}`} subtitle="Accepted rows, rejections and validation errors">
          <IdentityBanner />
          <StateMessage tone="error" title="This intake run could not be loaded">
            {loaded.message} Sample rejections are not shown in their place.
          </StateMessage>
        </AdminShell>
      );
    }
    if (!loaded.value) notFound();
    const batch = loaded.value;
    return (
      <AdminShell title={`Intake run ${batch.batchRef}`} subtitle="Accepted rows, rejections and validation errors">
        <div className="flex max-w-[900px] flex-col gap-[16px]">
          <IdentityBanner />
          <Link href="/admin/leads/intake" className="t-caption text-brand underline underline-offset-2">
            ← Lead intake
          </Link>
          <Card className="p-[20px]">
            <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
              <div>
                <p className="t-mono text-[12px] text-muted">{batch.batchRef}</p>
                <h2 className="t-heading mt-[2px] text-ink">{batch.source ?? "Source not recorded"}</h2>
                <p className="t-caption text-muted">{batch.createdAt ?? "Time not recorded"}</p>
              </div>
              <div className="flex flex-wrap gap-[18px]">
                <Count label="submitted" value={batch.submitted} tone="text-ink" />
                <Count label="accepted" value={batch.acceptedCount} tone="text-success" />
                <Count label="rejected" value={batch.rejectedCount} tone="text-danger" />
                <Count label="duplicates" value={batch.duplicateCount} tone="text-ink" />
                <Count label="skipped" value={batch.skippedCount} tone="text-muted" />
              </div>
            </div>
            {batch.note ? <p className="t-body mt-[14px] text-body">{batch.note}</p> : null}
          </Card>
          <OutcomeCard title="Accepted" empty="No accepted rows.">
            {batch.accepted.map((item, index) => (
              <li key={`accepted-${item.index ?? index}`} className="border-b border-[#EDEFF6] px-[18px] py-[14px] last:border-b-0">
                <p className="t-mono text-[13px] text-muted">row {item.index ?? "—"}</p>
                <p className="text-[15px] font-semibold text-ink">{item.reference ?? "Reference not recorded"}</p>
                <p className="t-body-sm text-body">Consent: {item.consentStatus ?? "not recorded"}</p>
              </li>
            ))}
          </OutcomeCard>
          <OutcomeCard title="Duplicates" empty="No duplicate rows.">
            {batch.duplicates.map((item, index) => (
              <li key={`duplicate-${item.index ?? index}`} className="border-b border-[#EDEFF6] px-[18px] py-[14px] last:border-b-0">
                <p className="t-mono text-[13px] text-muted">row {item.index ?? "—"}</p>
                <p className="text-[15px] text-ink">Existing lead {item.existingReference ?? "reference not recorded"}</p>
              </li>
            ))}
          </OutcomeCard>
          <OutcomeCard title="Rejected rows" empty="No rejected rows.">
            {batch.rejected.map((item, index) => (
              <li key={`rejected-${item.index ?? index}`} className="border-b border-[#EDEFF6] px-[18px] py-[14px] last:border-b-0">
                <p className="t-mono text-[13px] text-muted">row {item.index ?? "—"}</p>
                {item.problems.length === 0 ? (
                  <p className="t-body-sm mt-[3px] text-body">No problem fields were returned for this row.</p>
                ) : item.problems.map((problem, problemIndex) => (
                  <div key={`${problem.field ?? "field"}-${problemIndex}`} className="mt-[6px]">
                    <p className="text-[15px] font-semibold text-ink">
                      {problem.field ?? "Field not recorded"}
                      {problem.code ? ` · ${problem.code}` : ""}
                    </p>
                    <p className="t-body-sm text-body">{problem.reason ?? "Reason not recorded"}</p>
                  </div>
                ))}
              </li>
            ))}
          </OutcomeCard>
          <OutcomeCard title="Skipped" empty="No skipped rows.">
            {batch.skipped.map((item, index) => (
              <li key={`skipped-${item.index ?? index}`} className="border-b border-[#EDEFF6] px-[18px] py-[14px] last:border-b-0">
                <p className="t-mono text-[13px] text-muted">row {item.index ?? "—"}</p>
                <p className="text-[15px] font-semibold text-ink">{item.reasonCode ?? "Reason code not recorded"}</p>
                <p className="t-body-sm text-body">{item.reason ?? "Reason not recorded"}</p>
              </li>
            ))}
          </OutcomeCard>
          <p className="t-caption text-muted">{INTAKE_SCREEN_OMISSIONS[0]}</p>
        </div>
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

function Count({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  return (
    <span>
      <span className={`t-figure block ${tone}`}>{value === null ? "—" : value}</span>
      <span className="t-caption text-muted">{label}</span>
    </span>
  );
}

function OutcomeCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const items = Children.toArray(children);
  return (
    <Card className="overflow-hidden p-0">
      <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="t-body px-[18px] py-[16px] text-body">{empty}</p>
      ) : (
        <ul>{children}</ul>
      )}
    </Card>
  );
}
