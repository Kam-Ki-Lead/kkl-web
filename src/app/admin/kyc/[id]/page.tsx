import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReasonForm } from "@/components/admin/reason-form";
import { KycApproveForm } from "@/components/admin/kyc-approve-form";
import { decideApplication, reviewDocument, toggleKycCheck } from "@/app/actions/admin";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "KYC review", robots: { index: false } };

const VERDICT: Record<string, { label: string; tone: ChipTone }> = {
  ok: { label: "Legible", tone: "success" },
  problem: { label: "Problem noted", tone: "danger" },
};

/**
 * A-06 — document review, checklist and decision. **A-07 is this screen.**
 *
 * The screen inventory lists A-07 as a nested state inside A-06's review flow,
 * not as a route, and building it as one would invent a step the design does
 * not have: a reviewer who has just read four documents should not be sent to
 * another page to say what they concluded. So the decision panel appears below
 * the checklist, on this screen, and the outcome replaces it in place.
 *
 * WHAT IS NOT HERE, AND WHY
 * -------------------------
 * **The documents themselves.** No file is rendered, downloaded or linked,
 * because none exists — nothing was ever uploaded (see B-12 and S-03). What a
 * reviewer marks is the *record* that a file was named. A screen that drew a
 * PDF viewer over an empty store would be the most convincing lie in this
 * build.
 *
 * WHAT IS ENFORCED
 * ----------------
 * Approval is gated on the checklist, in the store, not in this markup: every
 * line ticked or the decision is refused. Rejection and resubmission are gated
 * on a written reason, the same way. Approving writes the checklist itself into
 * the audit entry as the reason, because that is what the reason was.
 */
export default async function AdminKycReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const action = (await searchParams).action;

  const admin = getServices().admin;
  const application = await admin.getApplication(id);
  if (!application) notFound();

  const account = await admin.getAccount(application.accountId);
  const remaining = application.checks.filter((c) => !c.done).length;
  const decided = application.decision !== null;

  return (
    <AdminShell title="KYC review" subtitle="Documents, checklist and decision">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Link href="/admin/kyc" className="t-caption text-brand underline underline-offset-2">
          ← KYC queue
        </Link>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <p className="t-mono text-[13px] text-muted">{application.id}</p>
              <h2 className="t-heading mt-[2px] text-ink">{application.applicantName}</h2>
              <p className="t-body text-body">{application.roleLabel}</p>
            </div>
            <div className="flex-none text-right">
              <Chip tone={application.state === "ageing" ? "warning" : "muted"}>
                waiting {application.waitingLabel}
              </Chip>
            </div>
          </div>

          <dl className="mt-[16px] grid grid-cols-2 gap-x-[18px] gap-y-[10px] border-t border-line pt-[16px] max-[700px]:grid-cols-1">
            <div>
              <dt className="t-caption text-muted">Account</dt>
              <dd className="t-mono text-[14px] text-ink">
                {account ? (
                  <Link
                    href={`/admin/users/${account.accountId}`}
                    className="text-brand underline underline-offset-2"
                  >
                    {account.accountId}
                  </Link>
                ) : (
                  application.accountId
                )}
              </dd>
            </div>
            <div>
              <dt className="t-caption text-muted">Submitted</dt>
              <dd className="text-[15px] font-semibold text-ink">{application.submittedAt}</dd>
            </div>
            <div>
              <dt className="t-caption text-muted">Current verification</dt>
              <dd className="text-[15px] font-semibold text-ink">
                {account?.kycStatus ?? "unknown"}
              </dd>
            </div>
            <div>
              <dt className="t-caption text-muted">Account status</dt>
              <dd className="text-[15px] font-semibold text-ink">
                {account?.status ?? "unknown"}
                <span className="t-caption block font-normal text-muted">
                  A decision here does not change this
                </span>
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Documents</h2>
          <p className="t-caption mt-[4px] text-warning">
            <strong>Nothing was uploaded.</strong> No file exists to open — these are the records
            that a file was named, kept so the review flow can be walked end to end. Document
            storage, scanning, retention and who may open one are kkl-backend&rsquo;s.
          </p>

          <ul className="mt-[14px] flex flex-col gap-[10px]">
            {application.documents.map((document) => {
              const verdict = document.verdict ? VERDICT[document.verdict] : null;
              return (
                <li
                  key={document.key}
                  className={`rounded-[10px] border p-[14px] ${
                    document.verdict === "problem"
                      ? "border-[#F3C4BF]"
                      : document.verdict === "ok"
                        ? "border-[#BFE0CE]"
                        : "border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-[10px]">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink">{document.title}</p>
                      <p className="t-caption text-muted">{document.fileLabel}</p>
                    </div>
                    <Chip tone={verdict?.tone ?? "muted"}>{verdict?.label ?? "Not checked"}</Chip>
                  </div>

                  {decided ? null : (
                    <div className="mt-[10px] flex flex-wrap gap-[8px]">
                      {(["ok", "problem"] as const).map((verdictValue) => (
                        <form key={verdictValue} action={reviewDocument}>
                          <input type="hidden" name="applicationId" value={application.id} />
                          <input type="hidden" name="documentKey" value={document.key} />
                          <input type="hidden" name="verdict" value={verdictValue} />
                          <button
                            type="submit"
                            aria-pressed={document.verdict === verdictValue}
                            className={`min-h-[36px] rounded-[8px] border-[1.5px] px-[13px] text-[14px] font-semibold ${
                              document.verdict === verdictValue
                                ? verdictValue === "ok"
                                  ? "border-success bg-success text-white"
                                  : "border-danger bg-danger text-white"
                                : verdictValue === "ok"
                                  ? "border-[#BFE0CE] bg-white text-success"
                                  : "border-[#F3C4BF] bg-white text-danger"
                            }`}
                          >
                            {verdictValue === "ok" ? "Legible" : "Problem"}
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Checklist</h2>
          <p className="t-caption mt-[4px] text-muted">
            Every line has to be ticked before approval is available. Approval is the one
            decision here the applicant cannot undo, so it is the one with a gate.
          </p>
          <ul className="mt-[12px] flex flex-col gap-[8px]">
            {application.checks.map((check) => (
              <li key={check.key}>
                <form action={toggleKycCheck}>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <input type="hidden" name="checkKey" value={check.key} />
                  <button
                    type="submit"
                    disabled={decided}
                    data-check={check.key}
                    aria-pressed={check.done}
                    className={`flex w-full items-center gap-[11px] rounded-[8px] border px-[14px] py-[11px] text-left text-[15px] disabled:cursor-not-allowed ${
                      check.done ? "border-[#D4DBF3] bg-tint" : "border-line bg-white"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-[20px] w-[20px] flex-none items-center justify-center rounded-[4px] border-[1.5px] text-[13px] font-bold text-white ${
                        check.done ? "border-brand bg-brand" : "border-line bg-white"
                      }`}
                    >
                      {check.done ? "✓" : ""}
                    </span>
                    <span className="text-ink">{check.label}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>

        {decided ? (
          <Card className="border-[#BFE0CE] bg-chip-success-bg p-[18px]">
            <h2 className="t-card-title text-success">Decision recorded</h2>
            <p className="t-body mt-[6px] text-body">
              This application was{" "}
              {application.decision === "approved"
                ? "approved"
                : application.decision === "rejected"
                  ? "rejected"
                  : "sent back for resubmission"}
              . It has left the queue, and the reason is in the audit log.
            </p>
            <div className="mt-[12px] flex flex-wrap gap-[10px]">
              <ButtonLink href="/admin/kyc" size="sm">
                Back to the queue
              </ButtonLink>
              <ButtonLink href="/admin/audit" variant="secondary" size="sm">
                See the audit entry
              </ButtonLink>
            </div>
          </Card>
        ) : action === "reject" || action === "resubmit" ? (
          <ReasonForm
            action={decideApplication}
            title={action === "reject" ? "Reject this verification" : "Ask for the documents again"}
            body={
              action === "reject"
                ? "The account moves to rejected and the applicant sees your reason on their own verification screen. Their account status is not changed."
                : "The account returns to pending with your message attached, and the applicant can upload again. Their account status is not changed."
            }
            confirmLabel={action === "reject" ? "Reject and notify" : "Request resubmission"}
            destructive={action === "reject"}
            hidden={{
              applicationId: application.id,
              decision: action === "reject" ? "rejected" : "resubmit",
            }}
            cancel={
              <Link
                href={`/admin/kyc/${application.id}`}
                className="t-caption text-brand underline underline-offset-2"
              >
                Cancel
              </Link>
            }
          />
        ) : (
          <Card className="p-[20px]">
            <h2 className="t-card-title text-ink">Decision</h2>
            <p className="t-caption mt-[4px] text-muted">
              {remaining === 0
                ? "The checklist is complete, so approval is available."
                : `${remaining} checklist ${remaining === 1 ? "line is" : "lines are"} outstanding. Approval is refused until they are ticked; rejection and resubmission are available now.`}
            </p>
            <div className="mt-[14px] flex flex-wrap gap-[10px]">
              <KycApproveForm applicationId={application.id} />
              <ButtonLink
                href={`/admin/kyc/${application.id}?action=reject`}
                variant="destructive"
                size="sm"
              >
                Reject
              </ButtonLink>
              <ButtonLink
                href={`/admin/kyc/${application.id}?action=resubmit`}
                variant="secondary"
                size="sm"
              >
                Ask for the documents again
              </ButtonLink>
            </div>
            <p className="t-caption mt-[12px] text-muted">
              Approving records the checklist as the reason. None of these three changes the
              account&rsquo;s suspension state — that is a separate decision on A-04.
            </p>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
