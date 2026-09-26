import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { LeadRequestActions } from "@/components/admin/lead-request-actions";
import { REQUEST_STATUS } from "@/components/console/request-status";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Lead request", robots: { index: false } };

/**
 * CR03 — one lead request, staff view.
 *
 * Everything the requester sees, plus who asked and the internal notes. The
 * two threads render in separate blocks with separate labels, and they are
 * separate on the record itself: a public reply is appended to the thread the
 * requester's console reads, an internal note to a list only this console
 * reads. Nothing on this page can move text from one to the other.
 */
export default async function AdminLeadRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getServices().admin.getLeadRequest(id);
  if (!request) notFound();

  const state = REQUEST_STATUS[request.status];

  const facts: readonly { label: string; value: string }[] = [
    { label: "Requested by", value: request.requesterLabel },
    { label: "Area", value: request.areaLabels.join(" · ") },
    { label: "Property type", value: request.propertyType ?? "Any" },
    {
      label: "Configurations",
      value: request.configurations.length > 0 ? `${request.configurations.join(", ")} BHK` : "Any",
    },
    {
      label: "Looking for",
      value:
        request.intent === "buy" ? "Buyer leads" : request.intent === "rent" ? "Tenant leads" : "—",
    },
    { label: "Budget band", value: request.budgetBand ?? "Any budget" },
    { label: "Leads needed", value: request.quantity !== null ? String(request.quantity) : "—" },
    { label: "Timing", value: request.timing ?? "—" },
  ];

  return (
    <AdminShell title={`Lead request ${request.reference}`} subtitle="Seller lead request">
      <div className="grid max-w-[1100px] grid-cols-[minmax(0,1fr)_380px] gap-[18px] max-[1060px]:grid-cols-1">
        <div className="flex flex-col gap-[16px]">
          <Card className="p-[20px]">
            <div className="flex flex-wrap items-center justify-between gap-[12px]">
              <Chip tone={state.tone}>{state.label}</Chip>
              <span className="t-caption text-muted">
                Sent {formatDateTime(request.createdAt)} · updated {formatDateTime(request.updatedAt)}
              </span>
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
                <p className="t-caption text-muted">Requester&rsquo;s notes</p>
                <p className="t-body mt-[4px] whitespace-pre-line text-body">{request.notes}</p>
              </div>
            ) : null}
          </Card>

          <Card className="p-[20px]">
            <h2 className="t-card-title text-ink">Public thread — the requester sees this</h2>
            {request.responses.length === 0 ? (
              <p className="t-body mt-[8px] text-muted">No public replies yet.</p>
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
            <h2 className="t-card-title text-ink">Internal notes — staff only</h2>
            {request.internalNotes.length === 0 ? (
              <p className="t-body mt-[8px] text-muted">No internal notes yet.</p>
            ) : (
              <ol className="mt-[10px] flex flex-col gap-[12px]">
                {request.internalNotes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-[10px] border border-[#C6CCE0] bg-[#EFF1F7] px-[14px] py-[11px]"
                  >
                    <p className="text-[13px] font-bold text-muted">
                      {note.authorLabel}
                      <span className="ml-[8px] rounded-full bg-ink px-[8px] py-[2px] text-[11px] font-bold text-white">
                        Internal — the requester never sees this
                      </span>
                    </p>
                    <p className="t-body mt-[4px] whitespace-pre-line text-body">{note.body}</p>
                    <p className="t-caption mt-[4px] text-muted">{formatDateTime(note.sentAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="p-[20px]">
            <h2 className="t-card-title text-ink">Status history</h2>
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
                    {entry.note ? (
                      <p className="t-caption mt-[2px] text-body">{entry.note}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-[16px]">
          <LeadRequestActions requestId={request.id} currentStatus={request.status} />
          <ButtonLink href="/admin/requests" variant="secondary">
            Back to the queue
          </ButtonLink>
        </div>
      </div>
    </AdminShell>
  );
}
