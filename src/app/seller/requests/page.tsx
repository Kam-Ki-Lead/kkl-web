import type { Metadata } from "next";
import Link from "next/link";
import { LeadRequestStorageNote } from "@/components/seller/lead-request-storage-note";
import { SellerShell } from "@/components/seller/seller-shell";
import { REQUEST_STATUS } from "@/components/console/request-status";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PendingRule, StateMessage } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDate } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "My lead requests" };

/**
 * CR03 — the Seller's own lead requests (the tracking view).
 *
 * Every row is a request this account filed through Request Leads: its
 * reference, where it stands, and the replies the team has posted on it. A
 * request is not a purchase — nothing here spent credits or released a
 * contact, and the page says so rather than letting the two blur.
 *
 * The list comes from the service, which returns only the requesting
 * account's records. In this sample build there is one Seller; the durable
 * rule — your requests only, others' indistinguishable from nonexistent — is
 * on the contract, not on this screen.
 */
export default async function SellerRequestsPage() {
  const requests = await getServices().leadRequests.listMine();

  return (
    <SellerShell
      title="My lead requests"
      subtitle="Leads you have asked us to find, and where each request stands"
    >
      <div className="flex max-w-[900px] flex-col gap-[14px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <p className="t-caption text-muted">
            <PendingRule>{DECISIONS["D-17"].pendingCopy}</PendingRule>
          </p>
          <ButtonLink href="/seller/requests/new" size="action">
            Request leads
          </ButtonLink>
        </div>

        {requests.length === 0 ? (
          <StateMessage
            title="No requests yet"
            action={<ButtonLink href="/seller/requests/new">Request leads</ButtonLink>}
          >
            Describe the area and the kind of leads you need, and the team picks it up from there.
            You get a reference you can track here.
          </StateMessage>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {requests.map((request) => {
              const state = REQUEST_STATUS[request.status];
              return (
                <Link key={request.id} href={`/seller/requests/${request.id}`}>
                  <Card className="p-[18px] transition-[border-color] duration-150 hover:border-brand">
                    <div className="flex flex-wrap items-start justify-between gap-[12px]">
                      <div className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-[10px]">
                          <span className="t-mono text-[13px] text-muted">{request.reference}</span>
                          <span className="text-[16px] font-bold text-ink">
                            {request.areaLabels.join(" · ")}
                          </span>
                        </span>
                        <span className="t-body mt-[2px] block text-body">
                          {[
                            request.propertyType,
                            request.configurations.length > 0
                              ? `${request.configurations.join(", ")} BHK`
                              : null,
                            request.intent === "buy"
                              ? "Buyers"
                              : request.intent === "rent"
                                ? "Tenants"
                                : null,
                            request.quantity !== null
                              ? `${request.quantity} ${request.quantity === 1 ? "lead" : "leads"}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span className="t-caption mt-[2px] block text-muted">
                          Sent {formatDate(request.createdAt)}
                          {request.responses.length > 0
                            ? ` · ${request.responses.length} ${
                                request.responses.length === 1 ? "reply" : "replies"
                              } from the team`
                            : ""}
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
          A request asks the team to find leads; it does not buy one and no credits move when you
          send it. Buying an available lead stays on{" "}
          <Link href="/seller/leads" className="font-semibold text-brand">
            Buy Leads
          </Link>
          . <LeadRequestStorageNote />
        </p>
      </div>
    </SellerShell>
  );
}
