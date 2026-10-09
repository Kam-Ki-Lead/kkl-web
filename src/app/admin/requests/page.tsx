import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { RequestQueueFilters } from "@/components/admin/request-queue-filters";
import { REQUEST_STATUS } from "@/components/console/request-status";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PendingRule, StateMessage } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDate } from "@/lib/format";
import { getServices } from "@/lib/services";
import type { LeadRequestStatus } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Purchase Order System", robots: { index: false } };

const STATUS_FILTERS: readonly { value: LeadRequestStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under review" },
  { value: "needs_clarification", label: "Needs clarification" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "closed", label: "Closed" },
];

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * CR03 — the staff queue for lead requests.
 *
 * The same records the Sellers see, from the other side: who asked, what they
 * need, where it stands. Opening one shows the public thread and the internal
 * notes, and the two stay separate there the same way they do on tickets.
 *
 * The status names are the confirmation document's proposal (D-17).
 */
export default async function AdminLeadRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawStatus = one(params.status);
  const status = STATUS_FILTERS.some((f) => f.value === rawStatus)
    ? (rawStatus as LeadRequestStatus | "")
    : "";
  const areaId = one(params.area) || undefined;

  const services = getServices();
  const [requests, areas] = await Promise.all([
    services.admin.listLeadRequests({
      status: status === "" ? undefined : status,
      areaId,
    }),
    services.locations.areaOptions({ cityId: "in-wb-kol" }),
  ]);

  const statusHref = (value: string) => {
    const next = new URLSearchParams();
    if (value) next.set("status", value);
    if (areaId) next.set("area", areaId);
    const qs = next.toString();
    return qs ? `/admin/requests?${qs}` : "/admin/requests";
  };

  return (
    <AdminShell title="Purchase Order System" subtitle="What Sellers have asked the team to find">
      <div className="flex max-w-[900px] flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[8px]">
          {STATUS_FILTERS.map((option) => {
            const active = option.value === status;
            return (
              <Link
                key={option.value || "all"}
                href={statusHref(option.value)}
                aria-current={active ? "true" : undefined}
                className={`min-h-[40px] rounded-full border-[1.5px] px-[14px] py-[9px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-body hover:border-[#C6CCE0]"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        <RequestQueueFilters areas={areas} />

        {requests.length === 0 ? (
          <StateMessage title="Nothing in this view">
            No lead requests match this filter right now.
          </StateMessage>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {requests.map((request) => {
              const state = REQUEST_STATUS[request.status];
              return (
                <Link key={request.id} href={`/admin/requests/${request.id}`}>
                  <Card
                    className={`p-[18px] transition-[border-color] duration-150 hover:border-brand ${
                      request.status === "submitted" ? "border-[#F3DFB4]" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[12px]">
                      <div className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-[10px]">
                          <span className="t-mono text-[13px] text-muted">{request.reference}</span>
                          <span className="text-[16px] font-bold text-ink">
                            {request.areaLabels.join(" · ")}
                          </span>
                        </span>
                        <span className="t-body mt-[2px] block text-body">
                          {request.requesterLabel}
                        </span>
                        <span className="t-caption mt-[2px] block text-muted">
                          {[
                            request.propertyType,
                            request.quantity !== null
                              ? `${request.quantity} ${request.quantity === 1 ? "lead" : "leads"}`
                              : null,
                            `sent ${formatDate(request.createdAt)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <Chip tone={state.tone}>{state.label}</Chip>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <p className="t-caption text-muted">
          <PendingRule>{DECISIONS["D-17"].pendingCopy}</PendingRule> A request is not an order:
          handling it here moves no credits and releases no contact details.
        </p>
      </div>
    </AdminShell>
  );
}
