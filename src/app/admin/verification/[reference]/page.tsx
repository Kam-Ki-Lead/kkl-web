import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { OUTCOME } from "@/components/verification/outcome";
import { VerificationDecisionForm } from "@/components/verification/verification-forms";
import { Card, InsetPanel, SectionHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { getServices } from "@/lib/services";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Verification case", robots: { index: false } };

/**
 * CR07 — one verification case.
 *
 * Shows why the check was required, who has it, what happened when, and the
 * decision controls. The history is append-only in the same sense the audit log
 * is: nothing on this screen rewrites an earlier entry, and a mistake is
 * corrected by a new decision with its own reason.
 */
export default async function AdminVerificationCasePage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const found = await getServices().admin.getVerificationCase(reference);
  if (found === null) notFound();

  const state = OUTCOME[found.outcome];

  return (
    <AdminShell title={`Case ${found.reference}`} subtitle={found.actionLabel}>
      <div className="flex flex-wrap items-center gap-[12px]">
        <Chip tone={state.tone}>{state.label}</Chip>
        <p className="t-body min-w-0 text-body">{state.line}</p>
        <Link href="/admin/verification" className="t-caption font-semibold text-brand">
          Back to the queue
        </Link>
      </div>

      <Card className="mt-[16px] p-[20px]">
        <SectionHeader title="Why a check was required" />
        <p className="t-body text-body">{found.requiredBecause}</p>
        {/* The record behind the rule. Staff see it here; the requester's own
            views carry no field that could show it, which is the same
            containment the internal notes use. */}
        <InsetPanel className="mt-[12px] bg-tint">
          <p className="t-caption text-muted">
            Policy record ·{" "}
            {found.policyProvenance.basis === "product_decision"
              ? "product decision"
              : found.policyProvenance.basis === "specification"
                ? "client specification"
                : "unconfirmed assumption"}
            {found.policyProvenance.decidedBy === null
              ? ""
              : ` · ${found.policyProvenance.decidedBy}`}
          </p>
          <p className="t-body mt-[4px] text-ink">{found.policyProvenance.note}</p>
        </InsetPanel>
        <InsetPanel className="mt-[14px]">
          <dl className="grid grid-cols-2 gap-[14px] max-[560px]:grid-cols-1">
            <Row label="Action" value={found.actionLabel} />
            <Row label="Service" value={found.provider.label} />
            <Row
              label="Service reference"
              value={found.provider.reference ?? "Not sent to the service yet"}
              mono={found.provider.reference !== null}
            />
            <Row label="Opened" value={formatDateTime(found.openedAt)} />
          </dl>
        </InsetPanel>
        {found.provider.isSample ? (
          <p className="t-caption mt-[12px] rounded-[8px] border border-[#F3DFB4] bg-[#FFF7E8] px-[13px] py-[10px] text-body">
            <strong className="text-ink">This is a sample verification service.</strong> No provider
            has been selected, no identity document was collected, and nothing was sent anywhere. The
            case exists so the policy and the queue can be reviewed.
          </p>
        ) : null}
      </Card>

      <Card className="mt-[16px] p-[20px]">
        <SectionHeader title="Record a decision" />
        <VerificationDecisionForm reference={found.reference} />
      </Card>

      <Card className="mt-[16px] p-[20px]">
        <SectionHeader title="History" subtitle="Append-only — a mistake is corrected by a new decision" />
        <ol className="flex flex-col gap-[10px]">
          {found.events.map((e, i) => (
            <li key={`${e.at}-${i}`} className="border-l-[2px] border-line pl-[12px]">
              <p className="t-label text-ink">{OUTCOME[e.outcome].label}</p>
              <p className="t-caption text-muted">
                {e.actorLabel} · {formatDateTime(e.at)}
              </p>
              {e.note ? <p className="t-body mt-[2px] text-body">{e.note}</p> : null}
            </li>
          ))}
        </ol>
      </Card>
    </AdminShell>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="t-caption text-muted">{label}</dt>
      <dd className={`mt-[2px] break-words text-ink ${mono ? "t-mono text-[14px]" : "t-body"}`}>
        {value}
      </dd>
    </div>
  );
}
