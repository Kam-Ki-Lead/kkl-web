import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Jobs & integrations", robots: { index: false } };

const STATE: Record<string, { tone: ChipTone; border: string }> = {
  healthy: { tone: "success", border: "border-line" },
  degraded: { tone: "warning", border: "border-[#F3DFB4]" },
  failing: { tone: "danger", border: "border-[#F3C4BF]" },
};

/** A-31 — queue health and webhook failures. */
export default async function AdminSystemPage() {
  const { integrations, failures } = await getServices().admin.system();

  return (
    <AdminShell title="Jobs & integrations" subtitle="Queue health and webhook failures">
      <div className="flex max-w-[900px] flex-col gap-[16px]">
        <FixtureNotice>
          None of these integrations is connected. The health, metrics and failures below are
          fixtures — there is no payment gateway, telephony, transcription or WhatsApp account
          behind this build.
        </FixtureNotice>

        <div className="grid grid-cols-2 gap-[16px] max-[900px]:grid-cols-1">
          {integrations.map((integration) => {
            const state = STATE[integration.state] ?? STATE.healthy!;
            return (
              <Card key={integration.name} className={`p-[18px] ${state.border}`}>
                <div className="flex flex-wrap items-start justify-between gap-[10px]">
                  <div className="min-w-0">
                    <h2 className="t-card-title text-ink">{integration.name}</h2>
                    <p className="text-[14px] text-muted">{integration.role}</p>
                  </div>
                  <Chip tone={state.tone} size="sm">
                    {integration.stateLabel}
                  </Chip>
                </div>
                <dl className="mt-[12px] flex flex-col gap-[6px]">
                  {integration.metrics.map((metric) => (
                    <div key={metric.label} className="flex justify-between gap-[10px] text-[14px]">
                      <dt className="text-muted">{metric.label}</dt>
                      <dd className="font-semibold text-ink">{metric.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-[12px] border-t border-line pt-[12px] text-[14px] text-body">
                  {integration.note}
                </p>
              </Card>
            );
          })}
        </div>

        <Card className="overflow-hidden p-0">
          <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
            Recent job failures
          </h2>
          {failures.map((failure) => (
            <div
              key={failure.job}
              className="flex flex-wrap items-center justify-between gap-[14px] border-b border-[#EDEFF6] px-[18px] py-[14px] last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-ink">{failure.job}</span>
                {/* 14px, as the approved failure rows set the error line. */}
                <span className="mt-[1px] block text-[14px] text-muted">{failure.error}</span>
              </span>
              <span className="t-caption flex-none text-muted">
                {failure.when} · {failure.attempts}
              </span>
            </div>
          ))}
          <p className="t-caption border-t border-line px-[18px] py-[12px] text-muted">
            There is no retry control. Retries are scheduled by the job runner, and a button that
            appeared to trigger one would be doing nothing at all in this build.
          </p>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">No credentials appear in this console</h2>
          <p className="t-body mt-[6px] text-body">
            Credentials for every integration live in the deployment environment. This screen shows
            health and failures only — there is no field anywhere in the Admin console that
            reveals, accepts or edits a key or token, and adding one would put a secret in a
            server-rendered page.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
