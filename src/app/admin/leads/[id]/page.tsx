import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import type { AdminLead } from "@/lib/domain/admin";
import { MAPPING_NOT_CONFIGURED_DETAIL } from "@/lib/domain/commerce-display";
import { qualificationStoreKind } from "@/lib/services/backend/config";
import { getQualificationLead } from "@/lib/services/backend/qualification";
import {
  intentDisplay,
  levelDisplay,
  runUiPath,
} from "@/lib/services/backend/qualification-reading";

export const metadata: Metadata = { title: "Lead", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATE: Record<AdminLead["state"], { label: string; tone: ChipTone }> = {
  qualifying: { label: "Qualifying", tone: "warning" },
  qualified: { label: "Qualified", tone: "success" },
  listed: { label: "Listed", tone: "neutral" },
  on_sale: { label: "On sale", tone: "warning" },
  sold: { label: "Sold", tone: "muted" },
  disqualified: { label: "Disqualified", tone: "danger" },
};

const RUN_TONE: Record<string, ChipTone> = {
  collecting: "warning",
  completed: "success",
  incomplete: "warning",
  failed: "danger",
  opted_out: "muted",
};

/**
 * A-13 — staff operational lead detail (H4-2).
 * Under KKL_QUALIFICATION=backend this is GET /v1/admin/qualification/leads/{id}.
 * Contact numbers stay absent; runs link via latestRun.path / run.path.
 */
export default async function AdminLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (qualificationStoreKind() === "backend") {
    const loaded = await getQualificationLead(id);
    if (!loaded.ok) {
      return (
        <AdminShell title={`Lead ${id}`} subtitle="Qualification, consent and lifecycle history">
          <div className="flex max-w-[900px] flex-col gap-[16px]">
            <IdentityBanner />
            <Link href="/admin/leads" className="t-caption text-brand underline underline-offset-2">
              ← Leads
            </Link>
            <StateMessage tone="error" title="This lead could not be loaded">
              {loaded.message} Fixture answers and summaries are not shown in their place.
            </StateMessage>
            <p className="t-caption text-muted">{MAPPING_NOT_CONFIGURED_DETAIL}</p>
          </div>
        </AdminShell>
      );
    }
    if (!loaded.value) notFound();
    const lead = loaded.value;

    return (
      <AdminShell title={lead.reference} subtitle="Staff operational lead detail">
        <div className="flex max-w-[900px] flex-col gap-[16px]">
          <IdentityBanner />
          <Link href="/admin/leads" className="t-caption text-brand underline underline-offset-2">
            ← Leads
          </Link>

          <p className="t-caption rounded-[8px] bg-tint px-[13px] py-[10px] text-body">
            Staff lead from{" "}
            <span className="t-mono">GET /v1/admin/qualification/leads/{"{leadId}"}</span>
            . Not a marketplace row. Qualification level stays unset; marketplaceConsent is{" "}
            <span className="t-mono">{lead.qualification.marketplaceConsent}</span>.
            {lead.suppressed ? " This lead is suppressed." : null}
          </p>

          <Card className="p-[20px]">
            <div className="flex flex-wrap items-start justify-between gap-[12px]">
              <div className="min-w-0">
                <p className="t-mono text-[12px] text-muted">{lead.id}</p>
                <h2 className="t-heading mt-[2px] text-ink">{lead.reference}</h2>
                <p className="t-body text-body">
                  {lead.locationName ?? lead.locationId ?? "No location"}
                  {lead.propertyType ? ` · ${lead.propertyType}` : ""}
                  {lead.budgetBand ? ` · ${lead.budgetBand}` : ""}
                </p>
              </div>
              <div className="flex flex-none flex-col items-end gap-[6px]">
                <Chip tone="neutral">{lead.status.replace(/_/g, " ")}</Chip>
                <span className="t-caption text-muted">
                  Consent {lead.consentStatus.replace(/_/g, " ")}
                </span>
              </div>
            </div>
            {lead.summary ? (
              <p className="t-body mt-[14px] border-t border-line pt-[12px] text-body">{lead.summary}</p>
            ) : null}
            <p className="t-caption mt-[12px] text-muted">
              Contact details are not on this screen
              {lead.contactLabel ? ` (${lead.contactLabel})` : ""}. Staff see whether the lead may
              proceed through qualification — not the buyer number.
            </p>
          </Card>

          <div className="grid grid-cols-2 gap-[16px] max-[900px]:grid-cols-1">
            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Qualification snapshot</h2>
              <dl className="mt-[12px] flex flex-col gap-[8px]">
                <div className="flex justify-between gap-[10px]">
                  <dt className="t-caption text-muted">Level</dt>
                  <dd className="text-[15px] font-semibold text-ink">
                    {levelDisplay(lead.qualification)}
                  </dd>
                </div>
                <div className="flex justify-between gap-[10px]">
                  <dt className="t-caption text-muted">Model intent</dt>
                  <dd className="text-[15px] text-body">{intentDisplay(lead.qualification)}</dd>
                </div>
                <div className="flex justify-between gap-[10px]">
                  <dt className="t-caption text-muted">Marketplace consent</dt>
                  <dd className="text-[15px] font-semibold text-ink">
                    {lead.qualification.marketplaceConsent}
                  </dd>
                </div>
                <div className="flex justify-between gap-[10px]">
                  <dt className="t-caption text-muted">Reason</dt>
                  <dd className="text-[15px] text-body">{lead.qualification.reason}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Requirement fields</h2>
              <dl className="mt-[12px] flex flex-col gap-[8px]">
                <div className="flex justify-between gap-[10px]">
                  <dt className="t-caption text-muted">Timing</dt>
                  <dd className="text-[15px] text-body">{lead.timing ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-[10px]">
                  <dt className="t-caption text-muted">Configurations</dt>
                  <dd className="text-[15px] text-body">
                    {lead.configurations.length > 0 ? lead.configurations.join(", ") : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-[10px]">
                  <dt className="t-caption text-muted">Price credits</dt>
                  <dd className="text-[15px] text-body">
                    {lead.priceCredits === null ? "not priced" : lead.priceCredits}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Qualification runs</h2>
            <p className="t-caption mt-[2px] text-muted">
              Paths from the staff lead contract. Opening a run uses the Admin UI route mapped
              from <span className="t-mono">latestRun.path</span> / <span className="t-mono">run.path</span>.
            </p>
            {lead.runs.length === 0 ? (
              <p className="t-body mt-[10px] text-body">No qualification runs on this lead yet.</p>
            ) : (
              <ul className="mt-[12px] flex flex-col">
                {lead.runs.map((run) => (
                  <li
                    key={run.id}
                    className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line py-[12px] last:border-b-0"
                  >
                    <span className="min-w-0">
                      <span className="t-mono block text-[13px] text-ink">{run.reference}</span>
                      <span className="t-caption text-muted">
                        {run.channel} · review {run.reviewStatus.replace(/_/g, " ")}
                        {run.failureReason ? ` · ${run.failureReason}` : ""}
                      </span>
                      {run.capabilities ? (
                        <span className="t-caption mt-[2px] block text-muted">
                          resume{" "}
                          {run.capabilities.resume.allowed ? "allowed" : "blocked"}
                          {run.capabilities.resume.dispatchesProvider ? " (would dispatch)" : ""}
                          {" · "}
                          retry{" "}
                          {run.capabilities.retry.allowed ? "allowed" : "blocked"}
                          {run.capabilities.retry.dispatchesProvider ? " (would dispatch)" : ""}
                        </span>
                      ) : null}
                    </span>
                    <span className="flex flex-wrap items-center gap-[10px]">
                      <Chip tone={RUN_TONE[run.state] ?? "muted"}>{run.state.replace(/_/g, " ")}</Chip>
                      <ButtonLink href={runUiPath(run.path)} variant="secondary" size="sm">
                        Open run
                      </ButtonLink>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <p className="t-caption text-muted">{MAPPING_NOT_CONFIGURED_DETAIL}</p>
        </div>
      </AdminShell>
    );
  }

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
              <p className="t-mono text-[12px] text-muted">{lead.id}</p>
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
            be sold; who the buyer is, is a separate question with a separate answer. These fields
            are fixtures until the staff lead detail contract is published.
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
            <p className="t-caption mt-[10px] text-muted">
              A generated summary is not verified fact. Answer counts do not assign Levels 1–10 —
              mapping not configured.
            </p>
          </Card>

          <div className="flex flex-col gap-[16px]">
            <Card
              className={`p-[18px] ${lead.consent.given ? "border-[#BFE0CE]" : "border-[#F3C4BF]"}`}
            >
              <h2
                className={`t-card-title ${lead.consent.given ? "text-success" : "text-danger"}`}
              >
                Consent
              </h2>
              <p
                className={`mt-[4px] text-[16px] font-bold ${lead.consent.given ? "text-success" : "text-danger"}`}
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
                  <span className="block text-[15px] font-semibold text-ink">{step.label}</span>
                  <span className="block text-[14px] text-muted">{step.note}</span>
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
          . {MAPPING_NOT_CONFIGURED_DETAIL}
        </p>
      </div>
    </AdminShell>
  );
}
