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
import { listWhatsAppJourney } from "@/lib/services/backend/qualification";
import { providerStatusLabel } from "@/lib/services/backend/qualification-reading";

export const metadata: Metadata = { title: "WhatsApp qualification", robots: { index: false } };
export const dynamic = "force-dynamic";

const BAR_TONE = { brand: "bg-brand", warning: "bg-warning", success: "bg-success" } as const;
const STATE_TONE: Record<string, ChipTone> = {
  success: "success",
  danger: "danger",
  warning: "warning",
  muted: "muted",
  completed: "success",
  incomplete: "warning",
  collecting: "warning",
  failed: "danger",
  opted_out: "muted",
};

/** A-26 — WhatsApp-channel qualification runs. Queued ≠ delivered. */
export default async function AdminWhatsAppPage() {
  if (qualificationStoreKind() === "backend") {
    const loaded = await listWhatsAppJourney();
    if (!loaded.ok) {
      return (
        <AdminShell title="WhatsApp qualification" subtitle="Qualification runs and message status">
          <div className="flex max-w-[860px] flex-col gap-[16px]">
            <IdentityBanner />
            <StateMessage tone="error" title="WhatsApp runs could not be loaded">
              {loaded.message}
            </StateMessage>
          </div>
        </AdminShell>
      );
    }
    const runs = loaded.value.runs;
    return (
      <AdminShell title="WhatsApp qualification" subtitle="Qualification runs and message status">
        <div className="flex max-w-[860px] flex-col gap-[16px]">
          <IdentityBanner />
          <p className="t-caption rounded-[8px] bg-tint px-[13px] py-[10px] text-body">
            Rows are <strong className="text-ink">qualification runs</strong> on the WhatsApp
            channel (<span className="t-mono">inventory: false</span>
            {loaded.value.leadInventoryPath
              ? ` · ${loaded.value.leadInventoryPath}`
              : ""}
            ). Queued and not_configured are not delivery. Conversation completion is not
            sale eligibility. marketplaceConsent stays unchanged.
          </p>
          {runs.length === 0 ? (
            <StateMessage title="No WhatsApp qualification runs">
              No WhatsApp-channel runs are stored yet.
            </StateMessage>
          ) : (
            <Card className="overflow-hidden p-0">
              <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
                WhatsApp runs
              </h2>
              {runs.map((run) => {
                const message = run.messages[0];
                return (
                  <Link
                    key={run.id}
                    href={`/admin/voice/${encodeURIComponent(run.id)}`}
                    className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[13px] last:border-b-0 hover:bg-chip-neutral-bg"
                  >
                    <span className="min-w-0">
                      <span className="t-mono block text-[13px] text-ink">{run.reference}</span>
                      <span className="t-caption block text-muted">
                        {run.phoneMasked ?? "Masked number unavailable"}
                        {message
                          ? ` · ${providerStatusLabel(message.status, false)}`
                          : " · no message row"}
                        {run.questionSet.synthetic ? " · SYNTHETIC" : ""}
                      </span>
                    </span>
                    <Chip tone={STATE_TONE[run.state] ?? "muted"} size="sm">
                      {run.state.replace(/_/g, " ")}
                    </Chip>
                  </Link>
                );
              })}
            </Card>
          )}
          <p className="t-caption text-muted">
            A conversation cannot be started from this screen. Numbers on the suppression list are
            never messaged.
          </p>
        </div>
      </AdminShell>
    );
  }

  const { funnel, conversations } = await getServices().admin.whatsapp();
  const top = funnel[0]?.count ?? 1;

  return (
    <AdminShell title="WhatsApp qualification" subtitle="Journey progress and conversations">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <FixtureNotice>
          No WhatsApp message has been sent. Fixtures only. Queued is not delivery.
        </FixtureNotice>
        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Journey</h2>
          <ul className="mt-[14px] flex flex-col gap-[12px]">
            {funnel.map((step) => (
              <li key={step.label}>
                <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
                  <span className="text-[15px] font-semibold text-ink">{step.label}</span>
                  <span className="t-caption text-muted">
                    <strong className="text-ink">{step.count.toLocaleString("en-IN")}</strong> ·{" "}
                    {step.percent}
                  </span>
                </div>
                <div className="mt-[5px] h-[10px] overflow-hidden rounded-full bg-[#EFF1F7]">
                  <div
                    className={`h-full rounded-full ${BAR_TONE[step.tone]}`}
                    style={{ width: `${Math.round((step.count / top) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="overflow-hidden p-0">
          <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
            Recent conversations
          </h2>
          {conversations.map((conversation) => (
            <div
              key={conversation.maskedNumber}
              className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[13px] last:border-b-0"
            >
              <span className="min-w-0">
                <span className="t-mono block text-[13px] text-ink">{conversation.maskedNumber}</span>
                <span className="t-caption block text-muted">
                  {conversation.step} · {conversation.when}
                </span>
              </span>
              <Chip tone={STATE_TONE[conversation.tone] ?? "muted"} size="sm">
                {conversation.stateLabel}
              </Chip>
            </div>
          ))}
        </Card>
      </div>
    </AdminShell>
  );
}
