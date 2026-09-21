import Link from "next/link";
import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "My account" };

/** P-12 — buyer dashboard. */
export default async function BuyerDashboardPage() {
  const enquiries = await getServices().enquiries.listMine();
  const awaiting = enquiries.filter((e) => e.status === "open").length;

  return (
    <div className="mx-auto max-w-[900px] px-[32px] pb-[50px] pt-[28px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">My account</h1>
      <p className="t-body mt-[6px] text-body">
        Your enquiries, your shortlist and the requirement we match against.
      </p>

      <div className="mt-[20px] grid grid-cols-3 gap-[14px] max-[900px]:grid-cols-1">
        <Card className="p-[18px]">
          <p className="t-figure text-ink">{enquiries.length}</p>
          <p className="t-caption mt-[2px] text-muted">
            {enquiries.length === 1 ? "Enquiry sent" : "Enquiries sent"}
          </p>
          <Link
            href="/account/enquiries"
            className="mt-[10px] block text-[15px] font-semibold text-brand hover:text-brand-deep"
          >
            View all <span aria-hidden="true">→</span>
          </Link>
        </Card>

        <Card className="p-[18px]">
          <p className="t-figure text-ink">{awaiting}</p>
          <p className="t-caption mt-[2px] text-muted">Awaiting a builder reply</p>
          <p className="t-caption mt-[10px] text-muted">No response time is promised.</p>
        </Card>

        <Card className="p-[18px]">
          <p className="t-card-title text-ink">Find my match</p>
          <p className="t-caption mt-[4px] text-body">
            Answer five questions and we match published projects to your requirement.
          </p>
          <ButtonLink href="/find-my-match" size="sm" className="mt-[10px]">
            Start
          </ButtonLink>
        </Card>
      </div>

      <Card className="mt-[16px] p-[20px]">
        <h2 className="t-card-title text-ink">Recent enquiries</h2>
        {enquiries.length === 0 ? (
          <p className="t-caption mt-[6px] text-body">
            Nothing yet. Enquiries you send appear here with the builder&rsquo;s replies.
          </p>
        ) : (
          <ul className="mt-[10px] divide-y divide-line">
            {enquiries.slice(0, 3).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-[12px] py-[10px]">
                <span className="text-[15px] text-ink">{e.propertyTitle}</span>
                <Link
                  href={`/account/enquiries/${e.id}`}
                  className="flex-none text-[15px] font-semibold text-brand"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
