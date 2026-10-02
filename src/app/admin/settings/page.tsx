import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import {
  CallingWindowForm,
  OptOutSignalsForm,
  SyntheticQuestionSetForm,
} from "@/components/admin/qualification-forms";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { MAPPING_NOT_CONFIGURED_LABEL } from "@/lib/domain/commerce-display";
import { qualificationStoreKind } from "@/lib/services/backend/config";
import { listQuestionSets } from "@/lib/services/backend/qualification";

export const metadata: Metadata = { title: "Platform settings", robots: { index: false } };
export const dynamic = "force-dynamic";

const TAXONOMY = [
  { label: "Apartment", note: "In every synthetic listing", on: true },
  { label: "Builder floor", note: "Proposed", on: true },
  { label: "Villa / row house", note: "Proposed", on: true },
  { label: "Plot", note: "Proposed — may be out of scope for launch", on: false },
];

/**
 * A-15 — taxonomy remains read-only (D-09). Qualification question sets,
 * calling window and opt-out use OpenAPI 1.0.0-phase4.a when
 * KKL_QUALIFICATION=backend. Pricing prompts are a different catalogue.
 */
export default async function AdminSettingsPage() {
  const qualificationBackend = qualificationStoreKind() === "backend";
  const questionSets = qualificationBackend ? await listQuestionSets() : null;

  return (
    <AdminShell title="Platform settings" subtitle="Taxonomy, calling hours and qualification questions">
      <div className="flex max-w-[820px] flex-col gap-[16px]">
        {qualificationBackend ? <IdentityBanner /> : null}

        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="t-card-title text-warning">Property taxonomy stays read-only</h2>
          <p className="t-body mt-[6px] text-body">
            The property-type list is a design proposal awaiting confirmation (<strong>D-09</strong>).
            Qualification question sets, the calling window and opt-out signals are configured
            below when the Phase 4 contract is connected — they do not invent Levels 1–10.
          </p>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Property types</h2>
          <ul className="mt-[12px] flex flex-col gap-[8px]">
            {TAXONOMY.map((item) => (
              <li
                key={item.label}
                className={`flex items-center justify-between gap-[12px] rounded-[8px] border px-[14px] py-[11px] ${
                  item.on ? "border-brand-mist bg-tint" : "border-line bg-white"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[15px] text-ink">{item.label}</span>
                  <span className="t-caption block text-muted">{item.note}</span>
                </span>
                <Chip tone={item.on ? "success" : "muted"}>{item.on ? "In use" : "Off"}</Chip>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Qualification question sets</h2>
          <p className="t-caption mt-[2px] text-muted">
            From <span className="t-mono">/v1/admin/qualification/question-sets</span>. Mapping:{" "}
            <strong className="text-ink">{MAPPING_NOT_CONFIGURED_LABEL}</strong>. Not the pricing
            prompt catalogue.
          </p>
          {!qualificationBackend ? (
            <p className="t-body mt-[10px] text-body">
              Set <span className="t-mono">KKL_QUALIFICATION=backend</span> against OpenAPI
              1.0.0-phase4.a to load and register sets. Synthetic prompts must say SYNTHETIC.
            </p>
          ) : null}
          {questionSets && !questionSets.ok ? (
            <StateMessage tone="error" title="Question sets could not be loaded">
              {questionSets.message}
            </StateMessage>
          ) : null}
          {questionSets?.ok && questionSets.value.length === 0 ? (
            <StateMessage title="No question set is stored">
              Register the synthetic fixture below for review. Do not present it as the client
              questionnaire.
            </StateMessage>
          ) : null}
          {questionSets?.ok && questionSets.value.length > 0 ? (
            <ul className="mt-[12px] flex flex-col gap-[8px]">
              {questionSets.value.map((set) => (
                <li
                  key={set.id}
                  className="flex flex-wrap items-center justify-between gap-[10px] rounded-[8px] border border-line px-[14px] py-[11px]"
                >
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-ink">
                      {set.versionLabel}
                      {set.synthetic ? " · SYNTHETIC" : ""}
                    </span>
                    <span className="t-caption block text-muted">
                      {set.provenance} · {set.questions} questions · {set.status}
                    </span>
                  </span>
                  <Chip tone={set.synthetic ? "warning" : "success"} size="sm">
                    {set.synthetic ? "Synthetic test" : "Client supplied"}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : null}
          {qualificationBackend ? <SyntheticQuestionSetForm /> : null}
        </Card>

        {qualificationBackend ? (
          <>
            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Calling window</h2>
              <p className="t-body mt-[6px] text-body">
                Hours are not assumed. Without a window, scheduling returns{" "}
                <span className="t-mono">calling_window_not_configured</span>.
              </p>
              <CallingWindowForm />
            </Card>
            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Opt-out signals</h2>
              <p className="t-body mt-[6px] text-body">
                A match suppresses voice and WhatsApp together. It does not grant marketplace
                consent.
              </p>
              <OptOutSignalsForm />
            </Card>
          </>
        ) : (
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Calling hours</h2>
            <p className="t-body mt-[6px] text-body">
              Connect Phase 4 qualification to edit the calling window and opt-out keywords. See{" "}
              <Link href="/admin/voice" className="text-brand underline underline-offset-2">
                voice qualification
              </Link>
              .
            </p>
          </Card>
        )}

        <p className="t-caption text-muted">
          No credential appears in this console. Integration credentials stay in the deployment
          environment — see{" "}
          <Link href="/admin/system" className="text-brand underline underline-offset-2">
            jobs &amp; integrations
          </Link>
          .
        </p>
      </div>
    </AdminShell>
  );
}
