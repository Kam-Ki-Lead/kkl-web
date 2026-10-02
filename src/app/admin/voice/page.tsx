import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import { qualificationStoreKind } from "@/lib/services/backend/config";
import { listVoiceCalls } from "@/lib/services/backend/qualification";

export const metadata: Metadata = { title: "Voice qualification", robots: { index: false } };
export const dynamic = "force-dynamic";

const OUTCOME: Record<string, ChipTone> = {
  qualified: "success",
  declined: "danger",
  no_answer: "muted",
};

/** A-24 — call volumes and outcomes. */
export default async function AdminVoicePage() {
  if (qualificationStoreKind() === "backend") {
    const loaded = await listVoiceCalls();
    return (
      <AdminShell title="Voice qualification" subtitle="Call volumes and outcomes">
        <div className="flex max-w-[900px] flex-col gap-[16px]">
          <IdentityBanner />
          <StateMessage tone="error" title="Call records could not be loaded">
            {loaded.message} No call is placed from this screen.
          </StateMessage>
          <p className="t-caption text-muted">
            Voice-bridge stubs on kkl-backend are for kkl-voice, not for this Admin list. Sample
            volumes are not shown while <span className="t-mono">KKL_QUALIFICATION=backend</span>.
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
          No call has been placed. kkl-voice is a separate service that is not connected to this
          build; these volumes, transcripts and outcomes are fixtures. They are not live traffic,
          and a completed fixture call is not sale eligibility.
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

        <p className="t-caption text-muted">
          Numbers are masked in the record. Calling hours, retry limits and the consent script are
          operational rules that belong to kkl-voice and kkl-backend, and are not configurable from
          this screen. No real call is started here.
        </p>
      </div>
    </AdminShell>
  );
}
