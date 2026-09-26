import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerShell } from "@/components/seller/seller-shell";
import { REQUEST_STATUS } from "@/components/console/request-status";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { PendingRule } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";
import { ServiceError } from "@/lib/services/contracts";

export const metadata: Metadata = { title: "Lead request" };

/**
 * CR03 — one of the Seller's own lead requests.
 *
 * The record the Seller sees: what they asked for, where it stands, the
 * replies the team has posted, and the status history. Internal staff notes
 * are not on this screen and cannot be — the type this page renders has no
 * field that could carry one.
 *
 * Ownership is enforced by the service: another account's request throws the
 * same `not_found` as one that does not exist, so this page cannot confirm
 * that somebody else's request exists.
 */
export default async function SellerLeadRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const created = (await searchParams).created;

  let request;
  try {
    request = await getServices().leadRequests.getMine(id);
  } catch (error) {
    if (error instanceof ServiceError && error.kind === "not_found") notFound();
    throw error;
  }

  const state = REQUEST_STATUS[request.status];

  const facts: readonly { label: string; value: string }[] = [
    { label: "Area", value: request.areaLabels.join(" · ") },
    { label: "Property type", value: request.propertyType ?? "Any" },
    {
      label: "Configurations",
      value: request.configurations.length > 0 ? `${request.configurations.join(", ")} BHK` : "Any",
    },
    {
      label: "Looking for",
      value: request.intent === "buy" ? "Buyer leads" : request.intent === "rent" ? "Tenant leads" : "—",
    },
    { label: "Budget band", value: request.budgetBand ?? "Any budget" },
    {
      label: "Leads needed",
      value: request.quantity !== null ? String(request.quantity) : "—",
    },
    { label: "Timing", value: request.timing ?? "—" },
  ];

  return (
    <SellerShell title={`Request ${request.reference}`} subtitle="Your lead request">
      <div className="flex max-w-[760px] flex-col gap-[16px]">
        {typeof created === "string" && created === request.reference ? (
          <Card className="border-[#BFE0CE] bg-chip-success-bg p-[18px]">
            <h2 className="t-card-title text-success">Request sent</h2>
            <p className="t-body mt-[6px] text-body">
              Your reference is <span className="t-mono font-semibold">{request.reference}</span>.
              The team picks it up from here, and every reply and status change appears on this
              page.
            </p>
          </Card>
        ) : null}

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-center justify-between gap-[12px]">
            <Chip tone={state.tone}>{state.label}</Chip>
            <span className="t-caption text-muted">Sent {formatDateTime(request.createdAt)}</span>
          </div>
          <dl className="mt-[14px] grid grid-cols-2 gap-x-[20px] gap-y-[12px] max-[620px]:grid-cols-1">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="t-caption text-muted">{fact.label}</dt>
                <dd className="t-body mt-[2px] font-semibold text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
          {request.notes ? (
            <div className="mt-[14px] border-t border-line pt-[12px]">
              <p className="t-caption text-muted">Your notes</p>
              <p className="t-body mt-[4px] whitespace-pre-line text-body">{request.notes}</p>
            </div>
          ) : null}
          <p className="t-caption mt-[14px] text-muted">
            <PendingRule>{DECISIONS["D-17"].pendingCopy}</PendingRule>
          </p>
        </Card>

        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Replies from the team</h2>
          {request.responses.length === 0 ? (
            <p className="t-body mt-[8px] text-muted">
              No replies yet. When the team updates this request, it appears here.
            </p>
          ) : (
            <ol className="mt-[10px] flex flex-col gap-[12px]">
              {request.responses.map((response) => (
                <li key={response.id} className="rounded-[8px] bg-tint px-[14px] py-[12px]">
                  <p className="t-caption text-muted">
                    {response.authorLabel} · {formatDateTime(response.at)}
                  </p>
                  <p className="t-body mt-[4px] whitespace-pre-line text-body">{response.body}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Progress</h2>
          <ol className="mt-[10px] flex flex-col gap-[10px]">
            {request.history.map((entry, index) => (
              <li key={`${entry.status}-${entry.at}-${index}`} className="flex gap-[12px]">
                <span
                  aria-hidden
                  className="mt-[7px] h-[9px] w-[9px] shrink-0 rounded-full bg-brand"
                />
                <div>
                  <p className="t-body font-semibold text-ink">
                    {REQUEST_STATUS[entry.status].label}
                    <span className="ml-[8px] font-normal text-muted">
                      {formatDateTime(entry.at)}
                    </span>
                  </p>
                  {entry.note ? <p className="t-caption mt-[2px] text-body">{entry.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="flex flex-wrap gap-[10px]">
          <ButtonLink href="/seller/requests" variant="secondary">
            Back to my requests
          </ButtonLink>
          <ButtonLink href="/seller/leads" variant="secondary">
            Buy Leads
          </ButtonLink>
        </div>
      </div>
    </SellerShell>
  );
}
