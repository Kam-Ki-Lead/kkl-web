import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { NewTicketForm } from "@/components/console/new-ticket-form";

export const metadata: Metadata = { title: "New ticket" };

/**
 * S-23 — raise a ticket.
 *
 * One of the two steps the approved prototype leaves disconnected: there,
 * submitting opened the existing thread instead of creating anything. Here it
 * creates a real ticket through the support service, which is the same service
 * the Admin queue reads, so a ticket raised on this screen appears there.
 */
export default function NewTicketPage() {
  return (
    <BuilderShell title="New ticket" subtitle="Tell support what happened">
      <div className="max-w-[640px]">
        <NewTicketForm scope="builder" />
      </div>
    </BuilderShell>
  );
}
