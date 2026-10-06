import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import {
  presentProposedScore,
  type ProposedScore,
} from "@/lib/domain/proposed-score";

/**
 * The proposed assessment, with the things that must never be separated from
 * it.
 *
 * The number is deliberately not the largest thing on the panel. A staff
 * member glancing at this should read "proposed, by us, not approved" before
 * they read "6", because the number is the part that will otherwise end up in
 * a sentence beginning "the system says".
 *
 * Three axes, shown as three. Policy v1 showed one number, and that number
 * silently mixed "we have all the answers" with "this person wants to buy".
 * Somebody who answered everything and said they were just exploring looked
 * like a hot lead. So completeness, readiness and financial fit get their own
 * rows here, and nothing on this panel adds them together.
 */
export function ProposedScorePanel({ score }: { score: ProposedScore | null }) {
  const shown = presentProposedScore(score);

  if (!shown) {
    return (
      <Card>
        <h2 className="t-h3 text-ink">Proposed assessment</h2>
        <StateMessage tone="plain" title="Not assessed yet">
          No proposed assessment has been computed for this run.
        </StateMessage>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
        <h2 className="t-h3 text-ink">Proposed assessment</h2>
        <Chip tone="neutral">{shown.policyLabel}</Chip>
      </div>

      {/* Above the caveat and above the number, because it overrides both. */}
      {shown.optOutNotice ? (
        <p className="t-body mt-[10px] rounded-[8px] bg-[#FDE8E8] px-[12px] py-[10px] text-body">
          {shown.optOutNotice}
        </p>
      ) : null}

      <p className="t-body mt-[10px] rounded-[8px] bg-[#FFF7E8] px-[12px] py-[10px] text-body">
        {shown.caveat}
      </p>

      <p className="mt-[14px] font-[family-name:var(--font-heading)] text-[22px] font-bold text-ink">
        {shown.headline}
      </p>

      {/* The three axes, never merged into one figure. */}
      <dl className="mt-[12px] grid gap-[10px]">
        {shown.axes.map((axis) => (
          <div key={axis.label} className="rounded-[8px] border border-line px-[12px] py-[10px]">
            <dt className="t-label text-muted">{axis.label}</dt>
            <dd className="t-body mt-[2px] font-semibold text-ink">{axis.value}</dd>
            <dd className="t-body mt-[2px] text-muted">{axis.detail}</dd>
          </div>
        ))}
      </dl>

      <p className="t-body mt-[12px] text-body">{shown.ceilingNote}</p>

      {shown.stopReason ? (
        <p className="t-body mt-[8px] text-body">{shown.stopReason}</p>
      ) : null}
      {shown.inactiveProposalNote ? (
        <p className="t-body mt-[8px] text-muted">{shown.inactiveProposalNote}</p>
      ) : null}
      <p className="t-body mt-[8px] text-muted">{shown.commercialNote}</p>

      <table className="mt-[16px] w-full border-collapse text-left">
        <caption className="sr-only">
          All ten factors from the client&rsquo;s table, which axis each belongs to,
          whether it is met, and why
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="t-label py-[6px] pr-[10px] text-muted">Level</th>
            <th scope="col" className="t-label py-[6px] pr-[10px] text-muted">Factor</th>
            <th scope="col" className="t-label py-[6px] pr-[10px] text-muted">Measures</th>
            <th scope="col" className="t-label py-[6px] pr-[10px] text-muted">State</th>
            <th scope="col" className="t-label py-[6px] text-muted">Why</th>
          </tr>
        </thead>
        <tbody>
          {shown.rows.map((row) => (
            <tr key={row.level} className="border-b border-line align-top">
              <td className="t-body py-[7px] pr-[10px] text-ink">{row.level}</td>
              <td className="t-body py-[7px] pr-[10px] text-body">{row.factor}</td>
              <td className="t-body py-[7px] pr-[10px] text-muted">
                {row.axis === "completeness" ? "completeness"
                  : row.axis === "readiness" ? "readiness" : "financial fit"}
              </td>
              <td className="py-[7px] pr-[10px]">
                <Chip tone={row.state === "met" ? "success" : row.state === "not met" ? "neutral" : "warning"}>
                  {row.state}
                </Chip>
              </td>
              <td className="t-body py-[7px] text-body">{row.why}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
