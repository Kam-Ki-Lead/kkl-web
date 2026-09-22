import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "KYC queue", robots: { index: false } };

const FILTERS = [
  { label: "Pending", value: "pending" },
  { label: "Resubmitted", value: "resubmitted" },
  { label: "Ageing over 24h", value: "ageing" },
  { label: "All", value: "all" },
];

const STATE_CHIP: Record<string, { label: string; tone: ChipTone }> = {
  pending: { label: "Pending", tone: "muted" },
  ageing: { label: "Ageing", tone: "warning" },
  resubmitted: { label: "Resubmitted", tone: "neutral" },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-05 — the verification queue.
 *
 * Decided applications leave it. That sounds obvious and is the reason this is
 * a queue rather than a list: approving the top row and finding it still there
 * is how a reviewer ends up approving it twice.
 */
export default async function AdminKycQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = one((await searchParams).filter) || "pending";
  const filter =
    raw === "resubmitted" || raw === "ageing" || raw === "pending" ? raw : undefined;

  const applications = await getServices().admin.listApplications(filter);

  return (
    <AdminShell title="KYC queue" subtitle="Verification applications awaiting review">
      <div className="flex max-w-[900px] flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[8px]">
          {FILTERS.map((option) => {
            const active = option.value === raw;
            return (
              <Link
                key={option.value}
                href={
                  option.value === "all" ? "/admin/kyc?filter=all" : `/admin/kyc?filter=${option.value}`
                }
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

        {applications.length === 0 ? (
          <StateMessage title="Nothing waiting">
            Every application in this view has been decided. Decided applications leave the queue —
            they are in the audit log with the reason they were given.
          </StateMessage>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {applications.map((application) => {
              const chip = STATE_CHIP[application.state] ?? STATE_CHIP.pending!;
              return (
                <Link key={application.id} href={`/admin/kyc/${application.id}`}>
                  <Card
                    className={`p-[18px] transition-[border-color] duration-150 hover:border-brand ${
                      application.state === "ageing" ? "border-[#F3DFB4]" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[12px]">
                      <div className="min-w-0">
                        <span className="flex flex-wrap items-center gap-[9px]">
                          <span className="t-mono text-[13px] text-muted">{application.id}</span>
                          <span className="text-[16px] font-bold text-ink">
                            {application.applicantName}
                          </span>
                          {application.liveConsole ? (
                            <Chip tone="neutral">Live console</Chip>
                          ) : null}
                        </span>
                        <span className="t-body mt-[2px] block text-body">
                          {application.roleLabel}
                        </span>
                        <span className="t-caption mt-[2px] block text-muted">
                          {application.documentsLabel} · submitted {application.submittedAt}
                        </span>
                      </div>
                      <div className="flex-none text-right">
                        <Chip tone={chip.tone}>{chip.label}</Chip>
                        <span className="t-caption mt-[4px] block text-muted">
                          waiting {application.waitingLabel}
                        </span>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <p className="t-caption text-muted">
          Two of these applications belong to the accounts whose consoles exist in this build, and
          are marked. A decision on one of those changes what that console shows. The others are
          static records for accounts with no console here.
        </p>
      </div>
    </AdminShell>
  );
}
