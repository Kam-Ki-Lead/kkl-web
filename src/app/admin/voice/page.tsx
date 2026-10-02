import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { StartQualificationRunForm } from "@/components/admin/qualification-forms";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import { qualificationStoreKind } from "@/lib/services/backend/config";
import { listQuestionSets, listVoiceCalls } from "@/lib/services/backend/qualification";
import { providerStatusLabel } from "@/lib/services/backend/qualification-reading";

export const metadata: Metadata = { title: "Voice qualification", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Review fixture lead / synthetic set — see backend data/phase4-review-fixture.json. */
const FIXTURE_LEAD_ID = "671bdc88-e779-4699-95ad-d8be5b1baaa8";
const FIXTURE_QUESTION_SET_ID = "398fd2b2-f649-4554-bd75-8c11b7c74d47";

const OUTCOME: Record<string, ChipTone> = {
  qualified: "success",
  declined: "danger",
  no_answer: "muted",
  completed: "success",
  incomplete: "warning",
  collecting: "warning",
  failed: "danger",
  opted_out: "muted",
};

const REVIEW: Record<string, ChipTone> = {
  pending: "warning",
  recorded: "success",
  not_required: "muted",
};

/** A-24 — qualification runs on the voice channel. A run is not a lead. */
export default async function AdminVoicePage() {
  if (qualificationStoreKind() === "backend") {
    const [loaded, sets] = await Promise.all([listVoiceCalls(), listQuestionSets()]);
    if (!loaded.ok) {
      return (
        <AdminShell title="Voice qualification" subtitle="Qualification runs and call attempts">
          <div className="flex max-w-[900px] flex-col gap-[16px]">
            <IdentityBanner />
            <StateMessage tone="error" title="Qualification runs could not be loaded">
              {loaded.message} Sample volumes are not shown in their place.
            </StateMessage>
          </div>
        </AdminShell>
      );
    }
    const page = loaded.value;
    const runs = page.runs;
    const syntheticSet =
      sets.ok
        ? sets.value.find((set) => set.id === FIXTURE_QUESTION_SET_ID)
          ?? sets.value.find((set) => set.synthetic)
        : null;

    return (
      <AdminShell title="Voice qualification" subtitle="Qualification runs and call attempts">
        <div className="flex max-w-[900px] flex-col gap-[16px]">
          <IdentityBanner />
          <p className="t-caption rounded-[8px] bg-tint px-[13px] py-[10px] text-body">
            These rows are <strong className="text-ink">qualification runs</strong>, not the staff
            lead inventory (<span className="t-mono">inventory: false</span>
            {page.leadInventoryPath ? ` · lead list ${page.leadInventoryPath}` : ""}
            ). providerVerified is false on every attempt — queued or not_configured is not a live
            dial. Qualification level stays unset until mapping is supplied.
          </p>
          {runs.length === 0 ? (
            <StateMessage title="No voice qualification runs">
              No voice-channel runs are stored. Register a synthetic question set and calling window
              on platform settings before starting a run against a review API.
            </StateMessage>
          ) : (
            <Card className="overflow-hidden p-0">
              <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
                Voice runs
              </h2>
              {runs.map((run) => {
                const call = run.calls[0];
                return (
                  <Link
                    key={run.id}
                    href={`/admin/voice/${encodeURIComponent(run.id)}`}
                    className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[14px] transition-[background-color] duration-150 last:border-b-0 hover:bg-chip-neutral-bg"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-[10px]">
                        <span className="t-mono text-[13px] text-ink">{run.reference}</span>
                        <span className="t-mono text-[13px] text-body">
                          {run.phoneMasked ?? "No masked number"}
                        </span>
                      </span>
                      <span className="t-caption block text-muted">
                        Set {run.questionSet.versionLabel}
                        {run.questionSet.synthetic ? " · SYNTHETIC" : ""}
                        {call
                          ? ` · ${providerStatusLabel(call.status, false)}`
                          : " · no call row"}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-[10px]">
                      <Chip tone={OUTCOME[run.state] ?? "muted"}>{run.state.replace(/_/g, " ")}</Chip>
                      <Chip tone={REVIEW[run.reviewStatus] ?? "muted"} size="sm">
                        Review {run.reviewStatus.replace(/_/g, " ")}
                      </Chip>
                    </span>
                  </Link>
                );
              })}
            </Card>
          )}

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Start a non-dispatched run</h2>
            <p className="t-body mt-[6px] text-body">
              Creates a run on the synthetic fixture lead. Without Exotel the call stays{" "}
              <span className="t-mono">not_configured</span>. This does not dial.
            </p>
            {syntheticSet ? (
              <StartQualificationRunForm
                leadId={FIXTURE_LEAD_ID}
                questionSetId={syntheticSet.id}
                questionSetLabel={syntheticSet.versionLabel}
              />
            ) : (
              <p className="t-body mt-[10px] text-body">
                Load or register the synthetic question set on platform settings first.
              </p>
            )}
          </Card>

          <p className="t-caption text-muted">
            Lead inventory remains a separate staff contract (H4-1). No call is started from this
            screen as a live provider action.
          </p>
        </div>
      </AdminShell>
    );
  }

  const { stats, calls } = await getServices().admin.voice();

  return (
    <AdminShell title="Voice qualification" subtitle="Call volumes and outcomes">
      <div className="flex max-w-[900px] flex-col gap-[16px]">
        <FixtureNotice>
          No call has been placed. These volumes are fixtures. Set{" "}
          <span className="t-mono">KKL_QUALIFICATION=backend</span> against OpenAPI 1.0.0-phase4.b
          to read qualification runs. A fixture outcome is not sale eligibility.
        </FixtureNotice>

        <div className="grid grid-cols-4 gap-[14px] max-[1060px]:grid-cols-2">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-[18px]">
              <p className="font-[family-name:var(--font-heading)] text-[26px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink">
                {stat.value}
              </p>
              <p className="mt-[5px] text-[14px] font-semibold text-ink">{stat.label}</p>
              <p className="t-caption mt-[2px] text-muted">{stat.note}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden p-0">
          <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
            Recent calls
          </h2>
          {calls.map((call) => (
            <Link
              key={call.id}
              href={`/admin/voice/${call.id}`}
              className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[14px] transition-[background-color] duration-150 last:border-b-0 hover:bg-chip-neutral-bg"
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-[10px]">
                  <span className="t-mono text-[13px] text-ink">{call.id}</span>
                  <span className="t-mono text-[13px] text-body">{call.maskedNumber}</span>
                </span>
                <span className="t-caption block text-muted">
                  {call.language} · {call.length}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-[12px]">
                <span className="text-[15px] font-semibold text-ink">{call.outcomeLabel}</span>
                <Chip tone={OUTCOME[call.outcome] ?? "muted"}>
                  Consent {call.consentLabel.toLowerCase()}
                </Chip>
              </span>
            </Link>
          ))}
        </Card>
      </div>
    </AdminShell>
  );
}
