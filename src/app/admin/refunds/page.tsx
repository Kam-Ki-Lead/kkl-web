import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReasonForm } from "@/components/admin/reason-form";
import { decideRefund } from "@/app/actions/admin";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { formatExactInr } from "@/lib/format";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Refunds", robots: { index: false } };

const CASES = [
  {
    chip: "Never completed",
    tone: "muted" as const,
    title: "Purchase that never completed",
    body: "Credits were deducted, then the release failed — the lead was already sold, or the deduction itself errored. The purchaser never received contact details.",
    handling:
      "Reversed automatically in the same ledger sequence. No refund request is needed and none should be raised. Example: ORD-10402.",
  },
  {
    chip: "Delivered",
    tone: "success" as const,
    title: "Completed purchase, download retry pending",
    body: "The lead was released and the contact details are visible in the purchaser's console. Only the CSV export failed.",
    handling:
      "Not a refund. The purchaser retries the download at no cost; the lead stays theirs. A download failure never reverses a purchase.",
  },
  {
    chip: "Needs a decision",
    tone: "warning" as const,
    title: "Refund request on a delivered lead",
    body: "The lead was delivered and the details were seen, but the purchaser disputes its quality — wrong number, already contacted, or not genuinely interested.",
    handling:
      "A human decision. Nothing reverses on its own. Whether this qualifies at all, and where the money goes, are both open client decisions.",
  },
];

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-20 — requests, decisions and audit trail.
 *
 * **Approving moves nothing.** D-06 leaves two things open at once: whether a
 * delivered lead qualifies for a refund at all, and where a refund goes —
 * wallet credits or a gateway reversal. Either half would have to be invented
 * to make this screen move money, so it records the decision and says plainly
 * that it is held. The three cases below exist because most "refunds" are not
 * refunds, and telling them apart is the actual work.
 */
export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const deciding = one(params.decide);
  const decision = one(params.as) === "declined" ? "declined" : "approved";

  const refunds = await getServices().admin.listRefunds();
  const target = refunds.find((r) => r.id === deciding);

  return (
    <AdminShell title="Refunds" subtitle="Requests, decisions and audit trail">
      <div className="flex max-w-[900px] flex-col gap-[16px]">
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="t-card-title text-warning">No refund moves anything here</h2>
          <p className="t-body mt-[6px] text-body">
            {DECISIONS["D-06"].question} — <strong>D-06</strong>. Both halves are open: whether a
            delivered lead qualifies at all, and whether a refund returns credits or reverses the
            original payment. Approving records the decision, with the reason, and writes no
            ledger entry. Nothing is moved and nothing is promised to the requester.
          </p>
        </Card>

        {target && !target.decision ? (
          <ReasonForm
            action={decideRefund}
            title={decision === "approved" ? "Approve this refund" : "Decline this refund"}
            body={
              decision === "approved"
                ? `Approving ${target.id} for ${formatExactInr(target.amountInr)} records the decision with your reason. Nothing moves: the destination is undecided (D-06), so the approval is held until that rule exists.`
                : "The requester is told the outcome and your reason. Nothing was moved and no ledger entry is written."
            }
            confirmLabel={decision === "approved" ? "Approve and record" : "Decline and record"}
            destructive={decision === "declined"}
            hidden={{ refundId: target.id, decision }}
            cancel={
              <Link href="/admin/refunds" className="t-caption text-brand underline underline-offset-2">
                Cancel
              </Link>
            }
          />
        ) : null}

        <div className="flex flex-col gap-[12px]">
          {refunds.map((refund) => (
            <Card
              key={refund.id}
              className={`p-[18px] ${refund.decision === null ? "border-[#F3DFB4]" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-[12px]">
                <div className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-[10px]">
                    <span className="t-mono text-[13px] text-muted">{refund.id}</span>
                    <span className="text-[16px] font-bold text-ink">
                      {formatExactInr(refund.amountInr)}
                    </span>
                  </span>
                  <span className="t-body mt-[2px] block text-body">
                    {refund.requesterName} · {refund.requesterRole} · {refund.when}
                  </span>
                  <span className="t-caption mt-[4px] block text-muted">
                    Reason given: &ldquo;{refund.reasonGiven}&rdquo;
                  </span>
                </div>
                <Chip
                  tone={
                    refund.decision === "approved"
                      ? "success"
                      : refund.decision === "declined"
                        ? "danger"
                        : "warning"
                  }
                >
                  {refund.decision === "approved"
                    ? "Approved"
                    : refund.decision === "declined"
                      ? "Declined"
                      : "Needs a decision"}
                </Chip>
              </div>

              <div className="mt-[14px] flex flex-wrap items-center gap-[10px] border-t border-line pt-[14px]">
                <ButtonLink
                  href={`/admin/orders/${refund.orderId}/delivery`}
                  variant="secondary"
                  size="sm"
                >
                  Open {refund.orderId}
                </ButtonLink>
                {refund.decision === null ? (
                  <>
                    <ButtonLink href={`/admin/refunds?decide=${refund.id}&as=approved`} size="sm">
                      Approve
                    </ButtonLink>
                    <ButtonLink
                      href={`/admin/refunds?decide=${refund.id}&as=declined`}
                      variant="destructive"
                      size="sm"
                    >
                      Decline
                    </ButtonLink>
                  </>
                ) : (
                  <p className="t-caption text-muted">
                    Decided, reason recorded: &ldquo;{refund.decisionReason}&rdquo;
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Three cases that look alike</h2>
          <p className="t-caption mt-[2px] text-muted">
            Only the third is a refund decision. The other two arrive as refund requests and are
            not.
          </p>
          <div className="mt-[14px] flex flex-col gap-[12px]">
            {CASES.map((item) => (
              <div key={item.title} className="rounded-[10px] border border-line p-[14px]">
                <Chip tone={item.tone}>{item.chip}</Chip>
                <h3 className="mt-[8px] text-[15px] font-bold text-ink">{item.title}</h3>
                <p className="t-body mt-[4px] text-body">{item.body}</p>
                <p className="t-caption mt-[6px] text-muted">{item.handling}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}
