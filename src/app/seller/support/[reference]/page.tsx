import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SellerShell } from "@/components/seller/seller-shell";
import { TicketReplyForm } from "@/components/console/ticket-reply-form";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { formatDate, formatDateTime } from "@/lib/format";
import { getServices } from "@/lib/services";
import type { SupportTicket } from "@/lib/domain/types";

/**
 * Read per-account at request time: with a backend store selected this page
 * calls kkl-backend as the signed-in account, which cannot be prerendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Ticket" };

const STATUS: Record<SupportTicket["status"], { label: string; tone: ChipTone }> = {
  open: { label: "Open", tone: "neutral" },
  awaiting_reply: { label: "Awaiting your reply", tone: "warning" },
  replied: { label: "Support replied", tone: "success" },
  resolved: { label: "Resolved", tone: "muted" },
};

/** S-24 — the ticket conversation. */
export default async function TicketPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const thread = await getServices().support.getThread(reference);
  if (!thread) notFound();

  const status = STATUS[thread.status];

  return (
    <SellerShell title="Ticket" subtitle="Conversation with support">
      <div className="max-w-[760px]">
        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div>
              <h2 className="t-subsection text-ink">{thread.subject}</h2>
              <p className="t-caption mt-[2px] text-muted">
                <span className="t-mono">{thread.reference}</span> · {thread.topic} · opened{" "}
                {formatDate(thread.createdAt)}
              </p>
            </div>
            <Chip tone={status.tone}>{status.label}</Chip>
          </div>
        </Card>

        <ol className="mt-[16px] flex flex-col gap-[12px]">
          {thread.messages.map((message) => (
            <li key={message.id}>
              <Card
                className={`p-[18px] ${
                  message.author === "support" ? "bg-tint" : ""
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                  {/* The approved thread colours the speaker: brand for the
                      account holder, green for support. */}
                  <p
                    className={`text-[13px] font-bold ${
                      message.author === "support" ? "text-success" : "text-brand"
                    }`}
                  >
                    {message.authorLabel}
                  </p>
                  <p className="t-caption text-muted">{formatDateTime(message.sentAt)}</p>
                </div>
                {/* Pre-wrap, not a markdown renderer: a support message is plain
                    text a person typed, and interpreting it as markup would let
                    one ticket's content change how another renders. */}
                <p className="t-body mt-[6px] whitespace-pre-wrap text-body">{message.body}</p>
              </Card>
            </li>
          ))}
        </ol>

        <div className="mt-[18px]">
          <TicketReplyForm reference={thread.reference} resolved={thread.status === "resolved"} />
        </div>
      </div>
    </SellerShell>
  );
}
