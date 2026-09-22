/**
 * The topics a Seller can raise a ticket under (S-23).
 *
 * In its own module, not exported from the server-action file. Every export of
 * a `"use server"` module is turned into a server-action reference, so an array
 * exported from there arrives in a Client Component as a function — and
 * `topics.map` throws at render. Constants shared with a client belong outside
 * the action module.
 */
export const TICKET_TOPICS = [
  "Lead quality",
  "Payment or credits",
  "KYC",
  "Something else",
] as const;

export type TicketTopic = (typeof TICKET_TOPICS)[number];
