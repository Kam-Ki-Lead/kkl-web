import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { TicketReplyForm } from "@/components/admin/ticket-reply-form";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Ticket", robots: { index: false } };

const STATE: Record<string, { label: string; tone: ChipTone }> = {
  awaiting_reply: { label: "Awaiting our reply", tone: "warning" },
  awaiting_user: { label: "Awaiting user", tone: "neutral" },
  resolved: { label: "Resolved", tone: "muted" },
};

/**
 * A-23 — conversation and internal notes.
 *
 * Two kinds of message on one thread, and the difference between them is the
 * whole screen:
 *
 * - A **reply** is written into the requester's own console store, so it
 *   appears in their support thread. Which store is read from the ticket's
 *   recorded console, never from the form.
 * - An **internal note** is kept in the Admin store and nowhere else. No
 *   Seller- or Builder-facing service reads it, and a console `TicketMessage`
 *   has no field that could carry one. The containment is structural rather
 *   than a filter, because a filter is the thing a future screen forgets.
 *
 * Notes are drawn dark and labelled, so a staff member cannot mistake one for
 * something the requester has seen.
 */
export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const thread = await getServices().admin.getThread(reference);
  if (!thread) notFound();

  const state = STATE[thread.state] ?? STATE.awaiting_reply!;

  return (
    <AdminShell title={thread.subject} subtitle="Conversation and internal notes">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Link href="/admin/support" className="t-caption text-brand underline underline-offset-2">
          ← Support queue
        </Link>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <p className="t-mono text-[13px] text-muted">{thread.reference}</p>
              <h2 className="t-heading mt-[2px] text-ink">{thread.subject}</h2>
              <p className="t-body text-body">
                {thread.requesterName} · {thread.requesterRole}
              </p>
            </div>
            <Chip tone={state.tone}>{state.label}</Chip>
          </div>

          <dl className="mt-[16px] grid grid-cols-2 gap-x-[18px] gap-y-[10px] border-t border-line pt-[16px] max-[700px]:grid-cols-1">
            {thread.context.map((fact) => (
              <div key={fact.label}>
                <dt className="t-caption text-muted">{fact.label}</dt>
                <dd className="text-[15px] font-semibold text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card className="p-[20px]">
          <h2 className="t-card-title text-ink">Conversation</h2>
          <ol className="mt-[14px] flex flex-col gap-[12px]">
            {thread.messages.map((message) => (
              <li
                key={message.id}
                className={`flex ${message.fromUser || message.internal ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-[10px] border px-[14px] py-[11px] ${
                    message.internal
                      ? "border-[#C6CCE0] bg-[#EFF1F7]"
                      : message.fromUser
                        ? "border-line bg-white"
                        : "border-[#D4DBF3] bg-tint"
                  }`}
                >
                  <p
                    className={`text-[13px] font-bold ${
                      message.internal
                        ? "text-muted"
                        : message.fromUser
                          ? "text-brand"
                          : "text-success"
                    }`}
                  >
                    {message.authorLabel}
                    {message.internal ? (
                      <span className="ml-[8px] rounded-full bg-ink px-[8px] py-[2px] text-[11px] font-bold text-white">
                        Internal — the user never sees this
                      </span>
                    ) : null}
                  </p>
                  <p className="t-body mt-[4px] text-body">{message.body}</p>
                  <p className="t-caption mt-[4px] text-muted">
                    {message.sentAt.includes("T") ? formatDateTime(message.sentAt) : message.sentAt}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <TicketReplyForm
          reference={thread.reference}
          liveConsole={thread.liveConsole}
          resolved={thread.state === "resolved"}
        />
      </div>
    </AdminShell>
  );
}
