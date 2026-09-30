import type { BuilderEnquiryService } from "@/lib/services/contracts";
import { ServiceError } from "@/lib/services/contracts";
import type { BuilderEnquiry, ContactAccessState } from "@/lib/domain/types";
import { callAs } from "./session";

/**
 * The recipient's enquiry inbox, served by kkl-backend.
 *
 * WHAT THE RECIPIENT GETS
 * The requirement — configuration, budget, timing — and the fact that
 * somebody enquired. Not the enquirer's name, not their number, and not the
 * free text they typed, because a message can carry a number as easily as a
 * name (Q-2b). That is the backend's projection, enforced by its own policies;
 * this adapter could not widen it if it tried.
 *
 * WHAT Q-2a IS, AND WHAT THIS DOES NOT DO ABOUT IT
 * Three rules are on the table: contact included at no extra charge, included
 * through a subscription, or unlocked by spending credits. None has been
 * chosen. So this reports `awaiting_decision` and the screens render a
 * sentence. It does not compose a mask — a mask says "a real value is being
 * withheld under a rule", and there is no rule — and it does not offer an
 * unlock, because offering one would select the third alternative by
 * implication.
 */

type BackendEnquiry = {
  id: string;
  reference: string;
  kind: "enquiry" | "visit_request";
  status: "new" | "acknowledged" | "in_progress" | "closed";
  listingId: string | null;
  subjectLabel: string | null;
  budgetBand: string | null;
  configurations: string[];
  timing: string | null;
  createdAt: string;
  read?: boolean;
  contact: null;
  contactAccess: ContactAccessState;
};

const AWAITING: ContactAccessState = {
  state: "awaiting_decision",
  selectedMode: null,
  label: "Contact access is awaiting confirmation.",
  detail:
    "Whether an enquirer's contact details reach you directly, through a subscription, or "
    + "by spending credits has not been decided. Until it is, no contact detail is released.",
  question: "Q-2a",
  candidateModes: ["included_free", "included_with_subscription", "paid_unlock"],
  unlockPriceCredits: null,
};

const requirementOf = (e: BackendEnquiry) =>
  [e.configurations.join(", "), e.budgetBand].filter(Boolean).join(" · ") || "Requirement not stated";

const toBuilderEnquiry = (e: BackendEnquiry): BuilderEnquiry => ({
  id: e.id,
  listingId: e.listingId ?? "",
  listingTitle: e.subjectLabel ?? "Your listing",
  kind: e.kind === "visit_request" ? "site_visit" : "enquiry",
  // No name. The backend sends none, and a placeholder like "A buyer" in a
  // field the screens treat as a name would be read as one.
  buyerName: null,
  contactMask: null,
  contactPhone: null,
  contactAccess: e.contactAccess ?? AWAITING,
  // The enquirer's own words are withheld from the recipient (Q-2b), so
  // there is nothing to show and nothing here that could leak one.
  message: null,
  requirement: requirementOf(e),
  budgetBand: e.budgetBand,
  timeline: e.timing,
  source: "Portal enquiry",
  receivedAt: e.createdAt,
  read: e.read === true,
  unlockPriceCredits: null,
});

function raise(status: number, body: { error?: string }): never {
  const message = body.error ?? `The enquiry service returned ${status}.`;
  if (status === 401) throw new ServiceError("unauthenticated", message);
  if (status === 403) throw new ServiceError("forbidden", message);
  throw new ServiceError("unavailable", message);
}

export const backendBuilderEnquiries: BuilderEnquiryService = {
  async list(filter) {
    const { status, body } = await callAs<{ enquiries: BackendEnquiry[] }>(
      "builder", "/v1/enquiries?as=recipient");
    if (status !== 200) raise(status, body);
    let enquiries = body.enquiries.map(toBuilderEnquiry);
    if (filter?.unreadOnly) enquiries = enquiries.filter((e) => !e.read);
    if (filter?.kind) enquiries = enquiries.filter((e) => e.kind === filter.kind);
    return enquiries;
  },

  async get(id) {
    const { status, body } = await callAs<BackendEnquiry>("builder", `/v1/enquiries/${id}`);
    if (status === 404) return null;
    if (status !== 200) raise(status, body);
    return toBuilderEnquiry(body);
  },

  async markRead(id) {
    const { status, body } = await callAs<BackendEnquiry>(
      "builder", `/v1/enquiries/${id}/read`, { method: "POST", body: {} });
    if (status !== 200 && status !== 404) raise(status, body);
  },

  async unreadCount() {
    const { status, body } = await callAs<{ unread: number }>("builder", "/v1/enquiries/unread");
    if (status !== 200) raise(status, body);
    return body.unread;
  },

  async contactAccessMode() {
    // Read from an enquiry when there is one, so the screen reflects what the
    // service actually says rather than a constant compiled in here. With no
    // enquiries, the service-level state is the same undecided one.
    const { status, body } = await callAs<{ enquiries: BackendEnquiry[] }>(
      "builder", "/v1/enquiries?as=recipient");
    if (status !== 200) return AWAITING;
    return body.enquiries[0]?.contactAccess ?? AWAITING;
  },

  async unlockContact() {
    // Not `insufficient_credits`, and not a silent success. No rule has been
    // chosen, so there is nothing to unlock and no price to charge; saying
    // "not applicable" is the only answer that does not pick an alternative.
    return { kind: "not_applicable" };
  },
};
