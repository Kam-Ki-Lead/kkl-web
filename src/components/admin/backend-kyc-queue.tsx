import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { PageNav } from "@/components/admin/page-nav";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import {
  capabilityBlocked,
  kycFilterCaption,
  kycListKind,
} from "@/lib/services/backend/admin-queue-reading";
import {
  loadKycApplications,
  selectedKycFilter,
} from "@/lib/services/backend/admin-queues";
import { pageOffset } from "@/lib/services/backend/staff-views";

const FILTERS = [
  { label: "Pending", value: "pending" },
  { label: "Resubmitted", value: "resubmitted" },
  { label: "Ageing over 24h", value: "ageing" },
  { label: "All open", value: "all" },
] as const;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function stamp(iso: string): string {
  return iso.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC");
}

function waiting(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  if (hours < 1) return "under 1 hour";
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} days`;
}

/**
 * KYC applications from required verification cases.
 * Sample document applications are not rendered on this path.
 */
export async function BackendKycQueue({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = selectedKycFilter(one(params.filter) || "pending");
  const offset = pageOffset(one(params.offset));
  const loaded = await loadKycApplications(filter, offset);

  return (
    <AdminShell title="KYC queue" subtitle="Required verification cases awaiting a decision">
      <div className="flex max-w-[900px] flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[8px]">
          {FILTERS.map((option) => {
            const active = option.value === filter;
            return (
              <Link
                key={option.value}
                href={`/admin/kyc?filter=${option.value}`}
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

        {loaded.ok ? <QueueBody filter={filter} page={loaded.value} /> : (
          <StateMessage tone="error" title="The KYC queue could not be loaded">
            {loaded.message}
          </StateMessage>
        )}
      </div>
    </AdminShell>
  );
}

function QueueBody({
  filter,
  page,
}: {
  filter: ReturnType<typeof selectedKycFilter>;
  page: Awaited<ReturnType<typeof loadKycApplications>> extends infer R
    ? R extends { ok: true; value: infer V }
      ? V
      : never
    : never;
}) {
  const kind = kycListKind(page);
  const caption = kycFilterCaption(filter);
  const window = {
    total: page.total,
    offset: page.offset,
    limit: page.limit,
    returned: page.applications.length,
  };

  return (
    <>
      {caption ? <p className="t-caption text-muted">{caption}</p> : null}
      <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[16px]">
        <h2 className="t-card-title text-warning">Documents, checks and approval are unavailable</h2>
        <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
          <li>{page.documents.message}</li>
          <li>{page.checks.message}</li>
          <li>{page.approval.message}</li>
        </ul>
        {capabilityBlocked(page.approval) ? (
          <p className="t-caption mt-[8px] text-muted">
            Approval is not a working action on this queue.
          </p>
        ) : null}
      </Card>

      {kind.kind === "resubmission-unavailable" ? (
        <StateMessage title="Resubmission is unavailable">
          {kind.message} This filter is not a count of resubmitted applications.
        </StateMessage>
      ) : null}

      {kind.kind === "past-end" ? (
        <>
          <PageNav pathname="/admin/kyc" page={window} noun="open applications" extra={{ filter }} />
          <StateMessage title="This page is past the end">
            {page.total} open {page.total === 1 ? "application is" : "applications are"} stored.
            This offset has none of them.
          </StateMessage>
        </>
      ) : null}

      {kind.kind === "empty-open" ? (
        <StateMessage title={kind.title}>{kind.body}</StateMessage>
      ) : null}

      {kind.kind === "rows" ? (
        <>
          <PageNav pathname="/admin/kyc" page={window} noun="open applications" extra={{ filter }} />
          <div className="flex flex-col gap-[10px]">
            {page.applications.map((application) => (
              <Link key={application.id} href={`/admin/kyc/${application.id}`}>
                <Card
                  className={`p-[18px] transition-[border-color] duration-150 hover:border-brand ${
                    application.state === "ageing" ? "border-[#F3DFB4]" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-[12px]">
                    <div className="min-w-0">
                      <span className="flex flex-wrap items-center gap-[9px]">
                        <span className="text-[15px] text-body">{application.id}</span>
                        <span className="font-[family-name:var(--font-heading)] text-[16px] font-bold text-ink">
                          {application.applicantName ?? "Name not recorded"}
                        </span>
                      </span>
                      <span className="t-body mt-[2px] block text-body">
                        {application.role} · {application.action.replaceAll("_", " ")}
                      </span>
                      <span className="t-caption mt-[2px] block text-muted">
                        Verification case · opened {stamp(application.submittedAt)}
                      </span>
                    </div>
                    <div className="flex-none text-right">
                      <Chip tone={application.state === "ageing" ? "warning" : "muted"}>
                        {application.state === "ageing" ? "Over 24 hours" : "Pending"}
                      </Chip>
                      <span className="t-caption mt-[4px] block text-muted">
                        open {waiting(application.waitingSeconds)}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <p className="t-caption text-muted">
        These rows are verification cases the policy marks required. The verification
        workflow stays on Verification cases. Owner submissions are not in this list.
      </p>
    </>
  );
}
