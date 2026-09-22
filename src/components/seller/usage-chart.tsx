import type { UsageMonth } from "@/lib/services/contracts";
import { formatExactInr } from "@/lib/format";

/**
 * The six-month usage bars on S-14.
 *
 * Deliberately not a charting library: six bars whose heights are a percentage
 * of the largest value need no runtime, and a dependency here would ship
 * kilobytes to draw six rectangles.
 *
 * Bar height is not information a screen reader can use, so the bars are marked
 * `aria-hidden` and the same figures are given as a real table, visually hidden.
 * Laying the bars out by overriding a table's `display` was the alternative, and
 * it breaks the table semantics that were the reason for using one.
 */
export function UsageChart({ months }: { months: readonly UsageMonth[] }) {
  const peak = Math.max(1, ...months.map((m) => m.spentInr));

  return (
    <div>
      <div aria-hidden="true" className="flex items-end gap-[10px]">
        {months.map((month) => (
          <div key={month.label} className="flex flex-1 flex-col items-stretch gap-[7px]">
            <span
              className="block rounded-t-[4px] bg-brand"
              style={{ height: `${Math.max(8, Math.round((month.spentInr / peak) * 118))}px` }}
            />
            <span className="t-caption text-center text-muted">{month.label}</span>
          </div>
        ))}
      </div>

      <table className="sr-only">
        <caption>Credits spent per month, last six months</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Credits spent</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.label}>
              <th scope="row">{month.label}</th>
              <td>{formatExactInr(month.spentInr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
