import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import type { AdminTicketFilter } from "@/lib/domain/admin";

export const metadata: Metadata = { title: "Support queue", robots: { index: false } };

const FILTERS = [
  { label: "Awaiting our reply", value: "awaiting_reply" },
  { label: "Awaiting user", value: "awaiting_user" },
  { label: "Resolved", value: "resolved" },
  { label: "All", value: "all" },
];

const STATE: Record<string, { label: string; tone: ChipTone }> = {
  awaiting_reply: { label: "Awaiting our reply", tone: "warning" },
  awaiting_user: { label: "Awaiting user", tone: "neutral" },
  resolved: { label: "Resolved", tone: "muted" },
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-22 — open tickets across all roles.
 *
 * The join the brief asks for, in both directions: a ticket raised in the
 * Seller console (S-23) and one raised in the Builder console (B-23) both
 * arrive here, each carrying which console it came from. That field is not
 * decoration — it is what decides where a reply is delivered, and it is read
 * from the ticket rather than supplied by whoever is replying.
 */
export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = one((await searchParams).filter) || "awaiting_reply";
  const filter = (["awaiting_reply", "awaiting_user", "resolved", "all"].includes(raw)
    ? raw
    : "awaiting_reply") as AdminTicketFilter;

  const tickets = await getServices().admin.listTickets(filter);

  return (
    <AdminShell title="Support queue" subtitle="Open tickets across all roles">
      <div className="flex max-w-[900px] flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[8px]">
          {FILTERS.map((option) => {
            const active = option.value === filter;
            return (
              <Link
                key={option.value}
                href={`/admin/support?filter=${option.value}`}
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

        {tickets.length === 0 ? (
          <StateMessage title="Nothing in this view">
            No tickets are in this state right now.
          </StateMessage>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {tickets.map((ticket) => {
              const state = STATE[ticket.state] ?? STATE.awaiting_reply!;
              return (
                <Link key={ticket.reference} href={`/admin/support/${ticket.reference}`}>
                  <Card
                    className={`p-[18px] transition-[border-color] duration-150 hover:border-brand ${
                      ticket.state === "awaiting_reply" ? "border-[#F3DFB4]" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[12px]">
                      <div className="min-w-0">
                        <span className="flex flex-wrap items-baseline gap-[10px]">
                          <span className="t-mono text-[13px] text-muted">{ticket.reference}</span>
                          <span className="text-[16px] font-bold text-ink">{ticket.subject}</span>
                        </span>
                        <span className="t-body mt-[2px] block text-body">
                          {ticket.requesterName} · {ticket.requesterRole}
                        </span>
                        <span className="t-caption mt-[2px] block text-muted">
                          {ticket.liveConsole
                            ? `Raised in the ${ticket.liveConsole === "seller" ? "Seller" : "Builder"} console`
                            : "Static record — this account has no console in this build"}
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
          Tickets from both consoles land in this one queue, and each row says which console it
          came from. That is what decides where a reply goes — a reply cannot be delivered to the
          wrong thread, because the destination is read from the ticket rather than chosen when
          replying.
        </p>
      </div>
    </AdminShell>
  );
}
