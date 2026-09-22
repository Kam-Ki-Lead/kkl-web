import type { Metadata } from "next";
import Link from "next/link";
import { BuilderShell } from "@/components/builder/builder-shell";
import { Card } from "@/components/ui/card";
import { Chip, MaskedValue } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Enquiries" };

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "enquiry", label: "Enquiries" },
  { key: "site_visit", label: "Site visits" },
] as const;

/** B-16 — enquiries on the Builder's own listings. */
export default async function BuilderEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const tab = one(params.tab) ?? "all";

  const services = getServices().builder;
  const [enquiries, mode] = await Promise.all([
    services.enquiries.list({
      unreadOnly: tab === "unread" || undefined,
      kind: tab === "enquiry" ? "enquiry" : tab === "site_visit" ? "site_visit" : undefined,
    }),
    services.enquiries.contactAccessMode(),
  ]);

  return (
    <BuilderShell title="Enquiries" subtitle="Buyers who contacted you about your listings">
      <div className="flex flex-col gap-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <div role="tablist" aria-label="Enquiry filter" className="flex gap-[20px] border-b border-line">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/builder/enquiries" : `/builder/enquiries?tab=${t.key}`}
                aria-current={t.key === tab ? "page" : undefined}
                className={`-mb-px border-b-[3px] pb-[10px] text-[16px] transition-[color,border-color] duration-150 ${
                  t.key === tab
                    ? "border-brand font-bold text-brand"
                    : "border-transparent font-medium text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </div>
          <ButtonLink href="/builder/enquiries/notifications" variant="secondary" size="sm">
            How enquiries reach you
          </ButtonLink>
        </div>

        {enquiries.length === 0 ? (
          <StateMessage
            title={tab === "all" ? "No enquiries yet" : "Nothing matches this filter"}
            action={<ButtonLink href="/builder/properties">My properties</ButtonLink>}
          >
            {tab === "all"
              ? "Enquiries arrive here when a buyer contacts you through one of your published listings."
              : "Switch tabs to see your other enquiries."}
          </StateMessage>
        ) : (
          <ul className="flex flex-col gap-[10px]">
            {enquiries.map((enquiry) => (
              <li key={enquiry.id}>
                <Card className="flex flex-wrap items-start justify-between gap-[12px] p-[18px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-[10px]">
                      <h2 className="t-card-title text-ink">
                        <Link
                          href={`/builder/enquiries/${enquiry.id}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {enquiry.buyerName}
                        </Link>
                      </h2>
                      {enquiry.read ? null : <Chip tone="warning">New</Chip>}
                    </div>
                    <p className="t-caption mt-[2px] text-muted">
                      {enquiry.listingTitle} ·{" "}
                      {enquiry.kind === "site_visit" ? "Site-visit request" : "Enquiry"}
                    </p>
                    <p className="t-caption mt-[1px] text-muted">
                      <span className="t-mono">{enquiry.id}</span> ·{" "}
                      {formatDateTime(enquiry.receivedAt)}
                    </p>
                  </div>

                  <div className="flex-none text-right">
                    {enquiry.contactPhone ? (
                      <>
                        <p className="t-mono text-[15px] font-medium text-ink">
                          {enquiry.contactPhone}
                        </p>
                        <p className="t-caption text-success">Contact available</p>
                      </>
                    ) : (
                      <>
                        <MaskedValue>{enquiry.contactMask}</MaskedValue>
                        <p className="t-caption text-muted">
                          Locked · ₹{enquiry.unlockPriceCredits?.toLocaleString("en-IN")} to unlock
                        </p>
                      </>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {/* D-05. The screen says which alternative is showing, every time. */}
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="t-card-title text-ink">
            Showing alternative {mode === "included" ? "A" : "B"}
          </h2>
          <p className="t-body mt-[6px] text-body">
            {mode === "included"
              ? "Contact details on enquiries for your own listings are visible without unlocking."
              : "Contact details on enquiries for your own listings are unlocked with credits, one enquiry at a time."}{" "}
            This is a design proposal, not a stated rule.
          </p>
          <p className="t-caption mt-[8px] text-muted">{DECISIONS["D-05"].question} — D-05</p>
        </Card>
      </div>
    </BuilderShell>
  );
}
