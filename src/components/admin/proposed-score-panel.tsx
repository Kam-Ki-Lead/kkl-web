import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import {
  presentProposedScore,
  type ProposedScore,
} from "@/lib/domain/proposed-score";

/**
 * The proposed qualification level, with the one thing that must never be
 * separated from it.
 *
 * The number is deliberately not the largest thing on the panel. A staff
 * member glancing at this should read "proposed, by us, not approved" before
 * they read "7", because the number is the part that will otherwise end up in
 * a sentence beginning "the system says".
 */
export function ProposedScorePanel({ score }: { score: ProposedScore | null }) {
  const shown = presentProposedScore(score);

  if (!shown) {
    return (
      <Card>
        <h2 className="t-h3 text-ink">Proposed qualification level</h2>
        <StateMessage tone="plain" title="Not scored yet">
          No proposed level has been computed for this run.
        </StateMessage>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
        <h2 className="t-h3 text-ink">Proposed qualification level</h2>
        <Chip tone="neutral">{shown.policyLabel}</Chip>
      </div>

      <p className="t-body mt-[10px] rounded-[8px] bg-[#FFF7E8] px-[12px] py-[10px] text-body">
        {shown.caveat}
      </p>

      <p className="mt-[14px] font-[family-name:var(--font-heading)] text-[22px] font-bold text-ink">
        {shown.headline}
      </p>
      <p className="t-body mt-[2px] text-muted">{shown.reachedLabel}</p>

      {shown.stopReason ? (
        <p className="t-body mt-[10px] text-body">{shown.stopReason}</p>
      ) : null}
      {shown.affordabilityNote ? (
        <p className="t-body mt-[8px] text-body">{shown.affordabilityNote}</p>
      ) : null}
      {shown.aboveGapNote ? (
        <p className="t-body mt-[8px] text-muted">{shown.aboveGapNote}</p>
      ) : null}

      <table className="mt-[16px] w-full border-collapse text-left">
        <caption className="sr-only">
          Every level, whether it is met, and why
        </caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className="t-label py-[6px] pr-[10px] text-muted">Level</th>
            <th scope="col" className="t-label py-[6px] pr-[10px] text-muted">Factor</th>
            <th scope="col" className="t-label py-[6px] pr-[10px] text-muted">State</th>
            <th scope="col" className="t-label py-[6px] text-muted">Why</th>
          </tr>
        </thead>
        <tbody>
          {shown.rows.map((row) => (
            <tr key={row.level} className="border-b border-line align-top">
              <td className="t-body py-[7px] pr-[10px] text-ink">{row.level}</td>
              <td className="t-body py-[7px] pr-[10px] text-body">{row.factor}</td>
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
