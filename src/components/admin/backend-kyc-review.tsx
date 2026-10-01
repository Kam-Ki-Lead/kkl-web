import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReasonForm } from "@/components/admin/reason-form";
import { decideApplication } from "@/app/actions/admin";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { ButtonLink } from "@/components/ui/button";
import { approvalIsAction, capabilityVerdict } from "@/lib/services/backend/admin-queue-reading";
import { loadKycApplication } from "@/lib/services/backend/admin-queues";

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function stamp(iso: string): string {
  return iso.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC");
}

const OPEN = new Set(["required", "in_progress", "needs_review"]);

/** One required verification case, projected as a KYC application. */
export async function BackendKycReview({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const action = one((await searchParams).action);
  const loaded = await loadKycApplication(id);
  if (!loaded.ok) {
    return (
      <AdminShell title="KYC review" subtitle="Required verification case">
        <StateMessage tone="error" title="That application could not be loaded">
          {loaded.message}
        </StateMessage>
      </AdminShell>
    );
  }
  if (!loaded.value) notFound();
  const application = loaded.value;
  const open = OPEN.has(application.outcome) && application.decision === null;
  const approvalBlocked = capabilityVerdict(application.approval) === "unavailable" || !approvalIsAction(application.approval);

  return (
    <AdminShell title="KYC review" subtitle="Required verification case">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Link href="/admin/kyc" className="t-caption text-brand underline underline-offset-2">
          ← KYC queue
        </Link>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <p className="t-mono text-[12px] text-muted">{application.id}</p>
              <h2 className="t-heading mt-[2px] text-ink">
                {application.applicantName ?? "Name not recorded"}
              </h2>
              <p className="t-body text-body">
                {application.role} · {application.action.replaceAll("_", " ")}
              </p>
            </div>
            <Chip tone={application.state === "ageing" ? "warning" : "muted"}>
              {application.state === "ageing" ? "Over 24 hours" : "Pending"}
            </Chip>
          </div>
          <dl className="mt-[16px] grid grid-cols-2 gap-x-[18px] gap-y-[10px] border-t border-line pt-[16px] max-[700px]:grid-cols-1">
            <div>
              <dt className="t-caption text-muted">Account</dt>
              <dd className="t-mono text-[14px] text-ink">{application.accountId}</dd>
            </div>
            <div>
              <dt className="t-caption text-muted">Opened</dt>
              <dd className="text-[15px] font-semibold text-ink">{stamp(application.submittedAt)}</dd>
            </div>
            <div>
              <dt className="t-caption text-muted">Outcome</dt>
              <dd className="text-[15px] font-semibold text-ink">{application.outcome.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt className="t-caption text-muted">Source</dt>
              <dd className="text-[15px] font-semibold text-ink">Verification case</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Documents</h2>
          <p className="t-body mt-[8px] text-body">{application.documents.message}</p>
          {capabilityVerdict(application.documents) === "unavailable" ? (
            <p className="t-caption mt-[8px] text-muted">
              Documents are unavailable. There is no upload to mark as missing or complete.
            </p>
          ) : (
            <p className="t-caption mt-[8px] text-muted">No document row was returned with this case.</p>
          )}
        </Card>

        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Checklist</h2>
          <p className="t-body mt-[8px] text-body">{application.checks.message}</p>
          {capabilityVerdict(application.checks) === "unavailable" ? (
            <p className="t-caption mt-[8px] text-muted">
              Checks are unavailable. Nothing here is ticked or left unticked.
            </p>
          ) : (
            <p className="t-caption mt-[8px] text-muted">No checklist row was returned with this case.</p>
          )}
        </Card>

        {approvalBlocked ? (
          <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
            <h2 className="t-card-title text-warning">Approval is not authorised</h2>
            <p className="t-body mt-[6px] text-body">{application.approval.message}</p>
          </Card>
        ) : null}

        {application.decision === "rejected" ? (
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Recorded as failed</h2>
            <p className="t-body mt-[6px] text-body">
              This case was failed. It leaves the open queue. The reason is kept with the decision.
            </p>
          </Card>
        ) : null}

        {open && (action === "reject" || action === "resubmit") ? (
          <ReasonForm
            action={decideApplication}
            title={action === "reject" ? "Fail this case" : "Ask for more information"}
            body={
              action === "reject"
                ? "This records the outcome as failed and the case leaves the open queue. A reason is required. Account status is not changed."
                : "This records the outcome as needing more information and the case stays open. It does not collect a document. A reason is required."
            }
            confirmLabel={action === "reject" ? "Fail the case" : "Ask for more information"}
            destructive={action === "reject"}
            hidden={{
              applicationId: application.id,
              decision: action === "reject" ? "rejected" : "resubmit",
            }}
            recordedNote="The decision is kept with the case. This screen does not say a message was delivered."
            cancel={
              <Link
                href={`/admin/kyc/${application.id}`}
                className="t-caption text-brand underline underline-offset-2"
              >
                Cancel
              </Link>
            }
          />
        ) : null}

        {open && action !== "reject" && action !== "resubmit" ? (
          <Card className="p-[20px]">
            <h2 className="t-card-title text-ink">Decision</h2>
            <p className="t-caption mt-[4px] text-muted">
              Fail the case, or ask for more information. Approval is not offered.
            </p>
            <div className="mt-[14px] flex flex-wrap gap-[10px]">
              <ButtonLink href={`/admin/kyc/${application.id}?action=reject`} variant="destructive" size="md">
                Fail the case
              </ButtonLink>
              <ButtonLink href={`/admin/kyc/${application.id}?action=resubmit`} variant="secondary" size="md">
                Ask for more information
              </ButtonLink>
            </div>
          </Card>
        ) : null}

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Case history</h2>
          {application.events.length === 0 ? (
            <p className="t-body mt-[8px] text-body">No event was returned with this case.</p>
          ) : (
            <ul className="mt-[10px] flex flex-col">
              {application.events.map((event) => (
                <li
                  key={`${event.at}-${event.outcome}-${event.actorLabel}`}
                  className="border-b border-line py-[10px] last:border-b-0"
                >
                  <span className="text-[15px] text-ink">
                    {event.outcome.replaceAll("_", " ")} · {event.actorLabel}
                  </span>
                  <span className="t-caption mt-[2px] block text-muted">
                    {stamp(event.at)} · {event.visibility}
                    {event.note ? ` · ${event.note}` : ""}
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
