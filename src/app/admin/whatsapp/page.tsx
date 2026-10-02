import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import { qualificationStoreKind } from "@/lib/services/backend/config";
import { listWhatsAppJourney } from "@/lib/services/backend/qualification";

export const metadata: Metadata = { title: "WhatsApp qualification", robots: { index: false } };
export const dynamic = "force-dynamic";

const BAR_TONE = { brand: "bg-brand", warning: "bg-warning", success: "bg-success" } as const;
const STATE_TONE: Record<string, ChipTone> = {
  success: "success",
  danger: "danger",
  warning: "warning",
  muted: "muted",
};

/** A-26 — journey progress and conversations. */
export default async function AdminWhatsAppPage() {
  if (qualificationStoreKind() === "backend") {
    const loaded = await listWhatsAppJourney();
    return (
      <AdminShell title="WhatsApp qualification" subtitle="Journey progress and conversations">
        <div className="flex max-w-[860px] flex-col gap-[16px]">
          <IdentityBanner />
          <StateMessage tone="error" title="WhatsApp journey could not be loaded">
            {loaded.message} Queued fixture rows are not delivery, and they are not shown here.
          </StateMessage>
          <p className="t-caption text-muted">
            A conversation cannot be started from this screen. Conversation completion is not sale
            eligibility. Numbers on the suppression list are never messaged.
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
          No WhatsApp message has been sent. The journey, the drop-off and the stalled
          conversation below are fixtures. A queued or stalled fixture row is not delivery, and a
          completed fixture journey is not sale eligibility.
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
          <p className="t-caption mt-[14px] text-muted">
            The drop between &ldquo;budget captured&rdquo; and &ldquo;requirement captured&rdquo;
            is the rejected template, not buyer behaviour — conversations stall at the question the
            provider will not deliver.
          </p>
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
                <span className="t-mono block text-[13px] text-ink">
                  {conversation.maskedNumber}
                </span>
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

        <p className="t-caption text-muted">
          Message content is not shown. Numbers are masked in the record. A conversation cannot be
          started from this screen, and a number on the suppression list is never messaged at all.
        </p>
      </div>
    </AdminShell>
  );
}
