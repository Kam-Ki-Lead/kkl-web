import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { getServices } from "@/lib/services";
import type { AdminLead } from "@/lib/domain/admin";

export const metadata: Metadata = { title: "Lead", robots: { index: false } };

const STATE: Record<AdminLead["state"], { label: string; tone: ChipTone }> = {
  qualifying: { label: "Qualifying", tone: "warning" },
  qualified: { label: "Qualified", tone: "success" },
  listed: { label: "Listed", tone: "neutral" },
  on_sale: { label: "On sale", tone: "warning" },
  sold: { label: "Sold", tone: "muted" },
  disqualified: { label: "Disqualified", tone: "danger" },
};

/**
 * A-13 — qualification, consent and lifecycle history.
 *
 * The screen where consent is either a record or a fiction, so it is shown as
 * a record: where it came from, when, and what it allows. The eligibility list
 * beside it is the reason a lead is or is not on the marketplace, line by line,
 * rather than a single verdict a reader has to trust.
 *
 * **No buyer contact detail appears anywhere on this screen.** Not masked —
 * absent. Staff need to see whether a lead may be sold, which is a different
 * question from who the buyer is, and the type this page reads has no field
 * that could carry one.
 */
export default async function AdminLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getServices().admin.getLead(id);
  if (!lead) notFound();

  const state = STATE[lead.state];

  return (
    <AdminShell title={lead.requirement} subtitle="Qualification, consent and lifecycle history">
      <div className="flex max-w-[900px] flex-col gap-[16px]">
        <Link href="/admin/leads" className="t-caption text-brand underline underline-offset-2">
          ← Leads
        </Link>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <p className="t-mono text-[13px] text-muted">{lead.id}</p>
              <h2 className="t-heading mt-[2px] text-ink">{lead.requirement}</h2>
              <p className="t-body text-body">
                {lead.area} · intaken {lead.intakenAt}
              </p>
            </div>
            <div className="flex flex-none flex-col items-end gap-[6px]">
              <Chip tone={state.tone}>{state.label}</Chip>
              <span className="t-caption text-muted">
                {lead.priceLabel ? `listed at ${lead.priceLabel}` : "not priced"}
              </span>
            </div>
          </div>
          <p className="t-caption mt-[14px] border-t border-line pt-[12px] text-muted">
            Contact details are not on this screen. Staff see the requirement and whether it may
            be sold; who the buyer is, is a separate question with a separate answer.
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-[16px] max-[900px]:grid-cols-1">
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Captured answers</h2>
            <p className="t-caption mt-[2px] text-muted">
              {lead.channel} · intent score {lead.score}
            </p>
            <dl className="mt-[12px] flex flex-col">
              {lead.answers.map((answer) => (
                <div
                  key={answer.label}
                  className="flex items-baseline justify-between gap-[10px] border-b border-line py-[9px] last:border-b-0"
                >
                  <dt className="t-caption text-muted">{answer.label}</dt>
                  <dd className="text-[15px] font-semibold text-ink">{answer.value}</dd>
                </div>
              ))}
            </dl>
            <p className="t-body mt-[12px] border-t border-line pt-[12px] text-body">
              {lead.summary}
            </p>
          </Card>

          <div className="flex flex-col gap-[16px]">
            <Card
              className={`p-[18px] ${lead.consent.given ? "border-[#BFE0CE]" : "border-[#F3C4BF]"}`}
            >
              <h2 className="t-card-title text-ink">Consent</h2>
              <p
                className={`mt-[4px] text-[15px] font-bold ${lead.consent.given ? "text-success" : "text-danger"}`}
              >
                {lead.consent.label}
              </p>
              <p className="t-body mt-[6px] text-body">{lead.consent.note}</p>
            </Card>

            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Eligibility</h2>
              <ul className="mt-[10px] flex flex-col gap-[7px]">
                {lead.eligibility.map((line) => (
                  <li key={line.text} className="flex items-baseline gap-[9px] text-[15px]">
                    <span
                      aria-hidden="true"
                      className={`flex-none font-bold ${line.met ? "text-success" : "text-danger"}`}
                    >
                      {line.met ? "✓" : "✕"}
                    </span>
                    <span className="text-body">
                      {line.text}
                      <span className="sr-only">{line.met ? " — met" : " — not met"}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p
                className={`mt-[12px] border-t border-line pt-[10px] text-[15px] font-bold ${lead.eligible ? "text-success" : "text-danger"}`}
              >
                {lead.eligibleLabel}
              </p>
            </Card>
          </div>
        </div>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Lifecycle</h2>
          <ol className="mt-[12px] flex flex-col">
            {lead.lifecycle.map((step) => (
              <li key={step.label} className="flex gap-[12px] py-[8px]">
                <span
                  aria-hidden="true"
                  className={`mt-[6px] h-[11px] w-[11px] flex-none rounded-full border-[1.5px] ${
                    step.done ? "border-brand bg-brand" : "border-line bg-white"
                  }`}
                />
                <span className="min-w-0">
                  <span
                    className={`block text-[15px] ${step.done ? "font-semibold text-ink" : "text-muted"}`}
                  >
                    {step.label}
                  </span>
                  <span className="t-caption block text-muted">{step.note}</span>
                </span>
              </li>
            ))}
          </ol>
          {lead.callId ? (
            <ButtonLink
              href={`/admin/voice/${lead.callId}`}
              variant="secondary"
              size="sm"
              className="mt-[12px]"
            >
              Open the qualification call
            </ButtonLink>
          ) : null}
        </Card>

        <p className="t-caption text-muted">
          Lead prices and the aging discount are <strong>D-03</strong> and are not set by the
          client. Any figure shown here is a placeholder — see{" "}
          <Link href="/admin/settings/pricing" className="text-brand underline underline-offset-2">
            pricing &amp; aging
          </Link>
          .
        </p>
      </div>
    </AdminShell>
  );
}
