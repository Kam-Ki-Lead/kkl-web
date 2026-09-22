import type { Metadata } from "next";
import Link from "next/link";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDate } from "@/lib/format";
import { getServices } from "@/lib/services";
import type { SupportTicket } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Support" };

const STATUS: Record<SupportTicket["status"], { label: string; tone: ChipTone }> = {
  open: { label: "Open", tone: "neutral" },
  awaiting_reply: { label: "Awaiting your reply", tone: "warning" },
  replied: { label: "Support replied", tone: "neutral" },
  resolved: { label: "Resolved", tone: "success" },
};

/** S-22 — the Seller's tickets. */
export default async function SupportPage() {
  const tickets = await getServices().support.listTickets();

  return (
    <SellerShell title="Support" subtitle="Your tickets">
      <div className="flex flex-col gap-[16px]">
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <p className="text-[16px] font-bold text-ink">
            {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
          </p>
          <ButtonLink href="/seller/support/new">New ticket</ButtonLink>
        </div>

        {tickets.length === 0 ? (
          <StateMessage
            title="You have not opened a ticket"
            action={<ButtonLink href="/seller/support/new">New ticket</ButtonLink>}
          >
            Raise one about lead quality, payments and credits, KYC, or anything else. Replies
            appear on the ticket.
          </StateMessage>
        ) : (
          <ul className="flex flex-col gap-[10px]">
            {tickets.map((ticket) => {
              const status = STATUS[ticket.status];
              return (
                <li key={ticket.reference}>
                  <Card className="flex flex-wrap items-center justify-between gap-[12px] p-[18px]">
                    <div className="min-w-0">
                      <h2 className="t-card-title text-ink">
                        <Link
                          href={`/seller/support/${ticket.reference}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {ticket.subject}
                        </Link>
                      </h2>
                      <p className="t-caption mt-[2px] text-muted">
                        <span className="t-mono">{ticket.reference}</span> · {ticket.topic} ·{" "}
                        {ticket.status === "resolved" ? "Closed" : "Updated"}{" "}
                        {formatDate(ticket.updatedAt)}
                      </p>
                    </div>
                    <Chip tone={status.tone}>{status.label}</Chip>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}

        <p className="t-caption text-muted">{DECISIONS["D-12"].pendingCopy} (D-12).</p>
      </div>
    </SellerShell>
  );
}
