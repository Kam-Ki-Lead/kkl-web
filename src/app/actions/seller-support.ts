"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServices } from "@/lib/services";
import { TICKET_TOPICS } from "@/lib/domain/support-topics";

/**
 * Which account's support queue a ticket belongs to.
 *
 * The Seller and Builder have separate ticket lists, so the scope travels on
 * the form. A Builder's ticket appearing in a Seller's list would be a data
 * leak, not a cosmetic bug.
 */
type SupportScope = "seller" | "builder";

function supportFor(scope: SupportScope) {
  const services = getServices();
  return scope === "builder" ? services.builder.support : services.support;
}

function scopeOf(formData: FormData): SupportScope {
  return String(formData.get("scope") ?? "seller") === "builder" ? "builder" : "seller";
}

function basePath(scope: SupportScope): string {
  return scope === "builder" ? "/builder/support" : "/seller/support";
}

/**
 * Support tickets (S-22 to S-24).
 *
 * Creating a ticket really creates one: it appears in the list with the body
 * that was typed, and the same service backs the Admin support queue (A-22), so
 * the two surfaces cannot disagree. What it does not do is fabricate a reply or
 * promise a response time — D-12 leaves any SLA unpublished, and an automated
 * "we will respond within X hours" would be the invention that rule exists to
 * prevent.
 */

const ticketSchema = z.object({
  topic: z.enum(TICKET_TOPICS),
  subject: z
    .string()
    .trim()
    .min(6, "Give the ticket a subject so support can see what it is about.")
    .max(140, "Keep the subject under 140 characters."),
  body: z
    .string()
    .trim()
    .min(15, "Describe what happened — a few sentences is enough.")
    .max(4000, "That is longer than a ticket can hold. Attach the detail instead."),
});

export type TicketFormState = {
  readonly errors?: Readonly<Record<string, string>>;
  readonly values?: Readonly<Record<string, string>>;
};

export async function createTicket(
  _previous: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const raw = {
    topic: String(formData.get("topic") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
  };

  const parsed = ticketSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
    }
    return { errors, values: raw };
  }

  const scope = scopeOf(formData);
  const ticket = await supportFor(scope).createTicket(parsed.data);
  revalidatePath(basePath(scope));
  redirect(`${basePath(scope)}/${ticket.reference}`);
}

const replySchema = z
  .string()
  .trim()
  .min(2, "Write a reply before sending.")
  .max(4000, "That reply is too long to send.");

export type ReplyFormState = { readonly error?: string; readonly value?: string };

export async function replyToTicket(
  _previous: ReplyFormState,
  formData: FormData,
): Promise<ReplyFormState> {
  const reference = String(formData.get("reference") ?? "");
  const raw = String(formData.get("body") ?? "");
  const parsed = replySchema.safeParse(raw);

  if (!reference) return { error: "That ticket could not be identified.", value: raw };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a reply.", value: raw };
  }

  const scope = scopeOf(formData);
  await supportFor(scope).reply({ reference, body: parsed.data });
  revalidatePath(`${basePath(scope)}/${reference}`);
  revalidatePath(basePath(scope));
  return {};
}

export async function resolveTicket(formData: FormData): Promise<void> {
  const reference = String(formData.get("reference") ?? "");
  if (!reference) return;
  const scope = scopeOf(formData);
  await supportFor(scope).resolve(reference);
  revalidatePath(`${basePath(scope)}/${reference}`);
  revalidatePath(basePath(scope));
}
