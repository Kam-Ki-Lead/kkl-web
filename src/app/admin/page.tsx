import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminSampleNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Operations dashboard", robots: { index: false } };

const TILE_TONES = {
  warning: "border-[#F3DFB4]",
  danger: "border-[#F3C4BF]",
  neutral: "border-line",
} as const;

const FLAG_TONES = {
  warning: "bg-chip-warning-bg text-chip-warning-fg",
  danger: "bg-chip-danger-bg text-chip-danger-fg",
  neutral: "bg-chip-neutral-bg text-chip-neutral-fg",
} as const;

const ALERT_TONES = {
  danger: "border-[#F3C4BF] bg-chip-danger-bg text-danger",
  warning: "border-[#F3DFB4] bg-[#FFF7E8] text-warning",
} as const;

/**
 * A-02 — operations dashboard.
 *
 * The four queue tiles are counted from the queues themselves, so clearing the
 * KYC queue moves the number. Today's volumes are fixtures and are labelled as
 * such, because there is no intake pipeline to count.
 */
export default async function AdminDashboardPage() {
  const { queues, volumes, alerts } = await getServices().admin.dashboard();

  return (
    <AdminShell title="Operations dashboard" subtitle="Queues, volumes and anything blocking">
      <div className="flex flex-col gap-[18px]">
        <div className="grid grid-cols-4 gap-[14px] max-[1060px]:grid-cols-2">
          {queues.map((queue) => (
            <Link
              key={queue.label}
              href={queue.href}
              className={`rounded-[12px] border bg-white p-[18px] transition-[border-color] duration-150 hover:border-brand ${TILE_TONES[queue.tone]}`}
            >
              <span className="flex items-baseline gap-[9px]">
                {/* 28px, as the approved A-02 declares. .t-figure is the shared
                    21px step the Seller and Builder tiles use. */}
                <span className="font-[family-name:var(--font-heading)] text-[28px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink">
                  {queue.value}
                </span>
                {queue.flag ? (
                  <span
                    className={`rounded-full px-[8px] py-[3px] text-[12px] font-bold ${FLAG_TONES[queue.tone]}`}
                  >
                    {queue.flag}
                  </span>
                ) : null}
              </span>
              <span className="mt-[5px] block text-[14px] font-semibold text-ink">
                {queue.label}
              </span>
              <span className="t-caption mt-[2px] block text-muted">{queue.note}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-[16px] max-[1200px]:grid-cols-1">
          <Card className="p-[18px]">
            <h2 className="t-heading text-ink">Today&rsquo;s volumes</h2>
            <div className="mt-[14px] grid grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-line bg-line max-[700px]:grid-cols-2">
              {volumes.map((volume) => (
                <div key={volume.label} className="bg-white px-[15px] py-[13px]">
                  <p className="t-caption text-muted">{volume.label}</p>
                  <p className="mt-[3px] font-[family-name:var(--font-heading)] text-[20px] font-extrabold text-ink">
                    {volume.value}
                  </p>
                </div>
              ))}
            </div>
            {/* Stated here rather than only in the console-wide notice: these
                six figures are the ones a reader is most likely to take for
                today's traffic. */}
            <p className="t-caption mt-[12px] text-muted">
              These six are fixtures. There is no intake pipeline, no qualification caller and no
              marketplace telemetry in this build, so nothing here was counted — the tiles above
              are, and they move when a queue does.
            </p>
          </Card>

          <Card className="p-[18px]">
            <h2 className="t-heading text-ink">Needs attention</h2>
            <div className="mt-[12px] flex flex-col gap-[10px]">
              {alerts.map((alert) => (
                <Link
                  key={alert.title}
                  href={alert.href}
                  className={`rounded-[8px] border p-[13px] ${ALERT_TONES[alert.tone]}`}
                >
                  <span className="block text-[14px] font-bold">{alert.title}</span>
                  <span className="t-body mt-[3px] block text-body">{alert.body}</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        <AdminSampleNotice />
      </div>
    </AdminShell>
  );
}
