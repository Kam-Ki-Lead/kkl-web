import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { formatExactInr } from "@/lib/format";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Pricing & aging", robots: { index: false } };

const OPEN_QUESTIONS = [
  "The price list itself — every figure below is a placeholder.",
  "Whether price varies by locality as well as budget band.",
  "Whether the discount steps down further after the Sale window.",
  "What happens to a lead that reaches 10 days unsold — archived, re-priced, or re-qualified.",
];

/**
 * A-14 — lead prices, aging discount and the Sale window.
 *
 * **The fields are disabled and the figures are placeholders.** D-03 leaves the
 * price list unset, so a staff screen that let someone type a number would be
 * inventing the pricing model rather than configuring it — and the number would
 * then be quoted back as agreed. The screen shows the shape of the decision and
 * lists what is still open.
 */
export default async function AdminPricingPage() {
  const bands = await getServices().admin.priceBands();

  return (
    <AdminShell title="Pricing & aging" subtitle="Lead prices, aging discount and Sale window">
      <div className="flex max-w-[820px] flex-col gap-[16px]">
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="t-card-title text-warning">Nothing here is set, and nothing is editable</h2>
          <p className="t-body mt-[6px] text-body">
            {DECISIONS["D-03"].question} — <strong>D-03</strong>. Every figure below is a
            placeholder carried from the design so the table&rsquo;s shape can be reviewed. The
            fields are disabled: a price typed into a staff screen becomes a price somebody quotes.
          </p>
        </Card>

        <Card className="overflow-hidden p-0">
          <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
            Price by budget band
          </h2>
          <div className="t-mono grid grid-cols-3 gap-[10px] bg-[#F0F2F9] px-[18px] py-[11px] text-[11px] tracking-[0.06em] text-muted">
            <span>BUDGET BAND</span>
            <span>FULL PRICE</span>
            <span>SALE PRICE</span>
          </div>
          {bands.map((band) => (
            <div
              key={band.band}
              className="grid grid-cols-3 items-center gap-[10px] border-t border-[#EDEFF6] px-[18px] py-[13px]"
            >
              <span className="text-[15px] text-ink">{band.band}</span>
              <input
                type="text"
                defaultValue={formatExactInr(band.priceInr)}
                disabled
                aria-label={`Full price for ${band.band} — not editable`}
                className="min-h-[40px] rounded-[8px] border-[1.5px] border-line bg-[#F6F8FD] px-[11px] text-[15px] text-muted"
              />
              <input
                type="text"
                defaultValue={formatExactInr(band.saleInr)}
                disabled
                aria-label={`Sale price for ${band.band} — not editable`}
                className="min-h-[40px] rounded-[8px] border-[1.5px] border-line bg-[#F6F8FD] px-[11px] text-[15px] text-muted"
              />
            </div>
          ))}
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Still open</h2>
          <ul className="t-body mt-[8px] flex list-disc flex-col gap-[5px] pl-[20px] text-body">
            {OPEN_QUESTIONS.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <p className="t-caption mt-[10px] text-muted">
            Until D-03 is decided, the Sale tab in the Seller and Builder consoles shows a 20%
            aging discount as a placeholder and says so on the screen.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
