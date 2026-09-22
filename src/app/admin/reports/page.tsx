import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };

/**
 * A-29 — operational and commercial reporting.
 *
 * One report, drawn as a funnel, with the caveat where a reader will see it
 * rather than in a footnote: these are synthetic figures for layout review and
 * no performance claim is made. A staff reporting screen is exactly where an
 * invented number becomes a board slide.
 *
 * The CSV export is a Route Handler, so the file is generated on the server
 * from the same figures the chart reads — not assembled in the browser, where
 * the two could drift.
 */
export default async function AdminReportsPage() {
  const funnel = await getServices().admin.funnelReport();

  return (
    <AdminShell title="Reports" subtitle="Operational and commercial reporting">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <FixtureNotice>
          Synthetic figures for layout review. No performance claim is made and these numbers are
          not projections — there is no analytics pipeline in this build.
        </FixtureNotice>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
            <h2 className="t-heading text-ink">Lead funnel · 1–16 September 2026</h2>
            <a
              href="/admin/reports/funnel.csv"
              className="text-[15px] font-bold text-brand underline underline-offset-2"
            >
              Export CSV ↓
            </a>
          </div>

          <div className="mt-[18px] flex h-[190px] items-end gap-[14px] max-[560px]:gap-[6px]">
            {funnel.map((stage) => (
              <div key={stage.label} className="flex h-full flex-1 flex-col justify-end gap-[7px]">
                <span className="text-center font-[family-name:var(--font-heading)] text-[15px] font-extrabold text-ink">
                  {stage.value.toLocaleString("en-IN")}
                </span>
                <div
                  className="w-full rounded-t-[5px] bg-brand"
                  style={{ height: `${stage.percent}%` }}
                  role="img"
                  aria-label={`${stage.label}: ${stage.value.toLocaleString("en-IN")}, ${stage.percent}% of intaken`}
                />
                <span className="t-caption text-center text-muted">{stage.label}</span>
              </div>
            ))}
          </div>

          {/* The bars are decorative; this is the accessible version of the
              same data, and it is not hidden behind a toggle. */}
          <table className="mt-[18px] w-full border-t border-line">
            <caption className="sr-only">Lead funnel figures, 1 to 16 September 2026</caption>
            <thead>
              <tr>
                <th scope="col" className="t-caption py-[8px] text-left text-muted">
                  Stage
                </th>
                <th scope="col" className="t-caption py-[8px] text-right text-muted">
                  Count
                </th>
                <th scope="col" className="t-caption py-[8px] text-right text-muted">
                  Share of intaken
                </th>
              </tr>
            </thead>
            <tbody>
              {funnel.map((stage) => (
                <tr key={stage.label} className="border-t border-line">
                  <th scope="row" className="py-[9px] text-left text-[15px] font-semibold text-ink">
                    {stage.label}
                  </th>
                  <td className="py-[9px] text-right text-[15px] text-body">
                    {stage.value.toLocaleString("en-IN")}
                  </td>
                  <td className="py-[9px] text-right text-[15px] text-body">{stage.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Not built</h2>
          <p className="t-body mt-[6px] text-body">
            The approved design shows a report picker and a date range. Neither is offered here,
            because there is one report and no data behind it — a range control that changed
            nothing would be worse than its absence. Revenue, conversion and per-broker reporting
            all depend on figures that only kkl-backend will have.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
