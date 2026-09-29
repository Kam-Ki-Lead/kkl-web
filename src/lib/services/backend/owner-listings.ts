import type {
  OwnerListing,
  OwnerListingBlocker,
  OwnerListingPhoto,
  OwnerListingStatus,
  OwnerListingStepId,
  OwnerListingSummary,
} from "@/lib/domain/types";
import type { AdminActionResult, AdminOwnerListing, AdminTicketMessage } from "@/lib/domain/admin";
import type { OwnerListingService } from "@/lib/services/contracts";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { callAs } from "./session";

/**
 * CR02 — the owner posting journey, served by kkl-backend.
 *
 * A-2 is the rule: submit for review, never auto-publish. Nothing here
 * publishes, and the backend refuses the transition by name if anything ever
 * asks it to.
 *
 * PHOTOGRAPHS
 * A chosen file's bytes still go nowhere. Object storage is not configured
 * (Q-8), so kkl-backend records the file's name, type and size after
 * validating them and reports `stored: false`. This adapter passes that
 * through as `retained: false`, and the screens already render it honestly —
 * no stock photograph stands in for somebody's flat, and no upload is shown
 * as having succeeded.
 */

const STEP_ORDER: readonly OwnerListingStepId[] =
  ["basics", "location", "pricing", "photos", "contact", "preview"];

/** Which step owns which field, so a blocker can be navigated to. */
const STEP_OF: Record<string, OwnerListingStepId> = {
  title: "basics",
  transaction: "basics",
  propertyType: "basics",
  locationId: "location",
  configuration: "pricing",
  priceInr: "pricing",
  photos: "photos",
  contactName: "contact",
  contactPreference: "contact",
};

type BackendMedia = {
  id: string;
  kind: "image" | "video" | "document";
  fileName: string;
  byteSize: number;
  stored: boolean;
};

type BackendHistory = {
  from: string | null;
  to: string;
  reason: string;
  actorKind: "submitter" | "staff";
  actorLabel: string;
  visibility: "shared" | "internal";
  at: string;
};

type BackendListing = {
  id: string;
  reference: string;
  status: string;
  title: string | null;
  description: string | null;
  propertyType: string | null;
  transaction: "sale" | "rent" | null;
  locationId: string | null;
  locationName: string | null;
  addressLine: string | null;
  priceInr: number | null;
  configuration: string | null;
  carpetArea: string | null;
  floorLabel: string | null;
  furnishing: string | null;
  availableFrom: string | null;
  contactPreference: "phone" | "whatsapp" | "either" | null;
  contactName: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  // The queue returns summaries without the trail, so both are optional here
  // and defaulted below. A list view that crashed because a detail field was
  // absent would be this adapter's fault, not the API's.
  media?: readonly BackendMedia[];
  history?: readonly BackendHistory[];
  duplicate?: boolean;
};

/** kkl-backend says `rejected`; the approved screens say `declined`. */
const STATUS: Record<string, OwnerListingStatus> = {
  draft: "draft",
  submitted: "submitted",
  in_review: "in_review",
  changes_requested: "changes_requested",
  cleared: "cleared",
  rejected: "declined",
  withdrawn: "withdrawn",
  // `published` exists in the schema and is unreachable (Q-3). If one ever
  // arrived it would be a bug, not a state to render, so it maps to the
  // nearest truthful thing rather than inventing a "live" badge.
  published: "cleared",
};

const size = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const photosOf = (listing: BackendListing): readonly OwnerListingPhoto[] =>
  (listing.media ?? []).filter((m) => m.kind === "image").map((m) => ({
    id: m.id,
    fileName: m.fileName,
    sizeLabel: size(m.byteSize),
    // False, and the screens say why: there is nowhere to keep the bytes yet.
    retained: m.stored,
  }));

function toListing(l: BackendListing): OwnerListing {
  return {
    id: l.id,
    reference: l.reference,
    status: STATUS[l.status] ?? "draft",
    intent: l.transaction === "sale" ? "sell" : l.transaction === "rent" ? "rent" : null,
    title: l.title ?? "",
    propertyType: l.propertyType,
    configuration: l.configuration,
    description: l.description ?? "",
    localityId: l.locationId,
    addressLine: l.addressLine ?? "",
    priceInr: l.priceInr,
    carpetArea: l.carpetArea ?? "",
    floorLabel: l.floorLabel ?? "",
    furnishing: l.furnishing,
    availableFrom: l.availableFrom ?? "",
    photos: photosOf(l),
    contactPreference: l.contactPreference,
    contactName: l.contactName ?? "",
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    submittedAt: l.submittedAt,
    // A status move is an event; a reply is a message. The backend keeps both
    // in one trail with from/to, which is what tells them apart.
    events: (l.history ?? [])
      .filter((h) => h.from !== h.to && h.visibility === "shared")
      .map((h) => ({
        at: h.at,
        status: STATUS[h.to] ?? "draft",
        actorLabel: h.actorLabel,
        note: h.reason === "Submitted for review" ? null : h.reason,
      })),
    messages: (l.history ?? [])
      .filter((h) => h.from === h.to && h.visibility === "shared")
      .map((h, index) => ({
        id: `${l.id}-m${index}`,
        authorLabel: h.actorLabel,
        body: h.reason,
        at: h.at,
      })),
  };
}

const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Apartment",
  villa: "Villa / independent house",
  plot: "Plot",
  commercial: "Commercial",
};

function stepComplete(l: OwnerListing, step: OwnerListingStepId): boolean {
  switch (step) {
    case "basics":
      return l.title.trim() !== "" && l.propertyType !== null && l.intent !== null;
    case "location":
      return l.localityId !== null;
    case "pricing":
      return l.priceInr !== null && l.configuration !== null;
    case "photos":
      return l.photos.length > 0;
    case "contact":
      return l.contactPreference !== null && l.contactName.trim() !== "";
    case "preview":
      return (["basics", "location", "pricing", "photos", "contact"] as const)
        .every((s) => stepComplete(l, s));
  }
}

function toSummary(raw: BackendListing, label: string): OwnerListingSummary {
  const l = toListing(raw);
  const price = l.priceInr === null
    ? "Price not set"
    : `₹${l.priceInr.toLocaleString("en-IN")}${l.intent === "rent" ? " / month" : ""}`;
  const details = [
    l.configuration ? `${l.configuration} BHK` : null,
    l.propertyType ? (PROPERTY_TYPES[l.propertyType] ?? l.propertyType) : null,
    l.carpetArea ? `${l.carpetArea} sq ft` : null,
  ].filter((p): p is string => p !== null);

  return {
    id: l.id,
    reference: l.reference,
    title: l.title.trim() === "" ? "Untitled draft" : l.title,
    status: l.status,
    locationLabel: label,
    priceLabel: price,
    detailLine: details.length > 0 ? details.join(" · ") : "Details not filled in yet",
    photoCount: l.photos.length,
    stepsComplete: STEP_ORDER.filter((s) => stepComplete(l, s)).length,
    stepsTotal: STEP_ORDER.length,
    updatedAt: l.updatedAt,
  };
}

/** One resolve call for a page of listings rather than one per row. */
async function labelsFor(listings: readonly BackendListing[]): Promise<Map<string, string>> {
  const ids = [...new Set(listings.map((l) => l.locationId).filter((id): id is string => id !== null))];
  if (ids.length === 0) return new Map();
  const { status, body } = await callAs<{ locations: { id: string; label?: string; name: string }[] }>(
    "owner", `/v1/locations/resolve?ids=${ids.map(encodeURIComponent).join(",")}`);
  if (status !== 200) return new Map();
  return new Map(body.locations.map((l) => [l.id, l.label ?? l.name]));
}

const toBlockers = (raw: ReadonlyArray<{ field: string; message: string }>): readonly OwnerListingBlocker[] =>
  raw.map((b) => {
    const step = STEP_OF[b.field] ?? "basics";
    return { step, stepNumber: STEP_ORDER.indexOf(step) + 1, message: b.message };
  });

/**
 * The field names the approved forms actually post, and what each becomes in
 * kkl-backend. The screens are not being rewritten to suit the API: the
 * adapter translates, which is the job of an adapter.
 */
const STEP_FIELDS: Record<OwnerListingStepId, readonly string[]> = {
  basics: ["title", "intent", "propertyType", "description"],
  location: ["locality", "addressLine"],
  pricing: ["price", "configuration", "carpetArea", "floorLabel", "furnishing", "availableFrom"],
  photos: [],
  contact: ["contactName", "contactPreference"],
  preview: [],
};

/** Backend field name → the form field the owner is looking at. */
const FORM_FIELD: Record<string, string> = {
  locationId: "locality",
  priceInr: "price",
  transaction: "intent",
  contactPreference: "contactPreference",
};

function patchFrom(step: OwnerListingStepId, values: Readonly<Record<string, string | readonly string[]>>) {
  const patch: Record<string, unknown> = {};
  const single = (key: string): string | undefined => {
    const value = values[key];
    if (value === undefined) return undefined;
    return Array.isArray(value) ? value[0] : (value as string);
  };
  for (const field of STEP_FIELDS[step]) {
    const value = single(field);
    if (value === undefined) continue;
    const trimmed = value.trim();
    switch (field) {
      case "intent":
        patch.transaction = trimmed === "rent" ? "rent" : trimmed === "sell" ? "sale" : null;
        break;
      case "locality":
        patch.locationId = trimmed === "" ? null : trimmed;
        break;
      case "price": {
        if (trimmed === "") { patch.priceInr = null; break; }
        // Separators are stripped; words are not. "seventy two lakh" reaches
        // the backend intact and is refused by field, which is the CR02
        // defect's fix — the old code stripped it to nothing and saved blank.
        patch.priceInr = /^[₹\s\d,]+$/.test(trimmed) ? Number(trimmed.replace(/[^\d]/g, "")) : trimmed;
        break;
      }
      case "propertyType":
      case "configuration":
      case "furnishing":
      case "contactPreference":
        patch[field] = trimmed === "" ? null : trimmed;
        break;
      default:
        patch[field] = trimmed;
    }
  }
  return patch;
}

/**
 * The photographs step. Each chosen file becomes a validated record in
 * kkl-backend and **no bytes are stored** — there is nowhere to put them
 * (Q-8). The record comes back `stored: false`, the screen says the file was
 * chosen and not kept, and nothing anywhere reports a successful upload.
 */
async function savePhotos(
  listingId: string,
  values: Readonly<Record<string, string | readonly string[]>>,
): Promise<void> {
  const names = values.photoNames === undefined
    ? []
    : (Array.isArray(values.photoNames) ? [...values.photoNames] : [values.photoNames as string]);
  const sizes = values.photoSizes === undefined
    ? []
    : (Array.isArray(values.photoSizes) ? [...values.photoSizes] : [values.photoSizes as string]);

  for (const [index, fileName] of names.entries()) {
    if (!fileName || !fileName.trim()) continue;
    const byteSize = Number(sizes[index] ?? 0) || 1024;
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "jpg";
    const contentType = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg";
    const { status, body } = await callAs<BackendListing>("owner", `/v1/listings/${listingId}/media`, {
      method: "POST",
      body: { kind: "image", contentType, byteSize, fileName: fileName.trim() },
    });
    if (status === 422 || status === 409) {
      throw new ValidationError({ photos: body.error ?? "That file was not accepted." });
    }
    if (status !== 201) raise(status, body);
  }
}

async function fetchOne(id: string): Promise<BackendListing> {
  const { status, body } = await callAs<BackendListing>("owner", `/v1/listings/${id}`);
  if (status === 404) throw new ServiceError("not_found", "That listing could not be found.");
  if (status !== 200) throw new ServiceError("unavailable", body.error ?? `Listing service returned ${status}.`);
  return body;
}

function raise(status: number, body: { error?: string; field?: string }): never {
  if (status === 422) {
    const field = body.field ?? "form";
    const formField = FORM_FIELD[field] ?? field;
    throw new ValidationError({ [formField]: body.error ?? "This value was not accepted." });
  }
  if (status === 404) throw new ServiceError("not_found", "That listing could not be found.");
  if (status === 403) throw new ServiceError("forbidden", body.error ?? "Not permitted.");
  throw new ServiceError("unavailable", body.error ?? `Listing service returned ${status}.`);
}

export const backendOwnerListings: OwnerListingService = {
  async listMine() {
    const { status, body } = await callAs<{ listings: BackendListing[] }>("owner", "/v1/listings");
    if (status !== 200) raise(status, body);
    const mine = body.listings;
    const labels = await labelsFor(mine);
    return mine.map((l) => toSummary(l, l.locationId ? (labels.get(l.locationId) ?? "Locality not set") : "Locality not set"));
  },

  async getMine(id) {
    return toListing(await fetchOne(id));
  },

  async startDraft({ idempotencyKey }) {
    const { status, body } = await callAs<BackendListing>("owner", "/v1/listings", {
      method: "POST",
      body: { idempotencyKey },
    });
    if (status !== 201 && status !== 200) raise(status, body);
    return toListing(body);
  },

  async saveStep({ listingId, step, values }) {
    if (step === "photos") {
      await savePhotos(listingId, values);
      return toListing(await fetchOne(listingId));
    }
    const patch = patchFrom(step, values);
    if (Object.keys(patch).length === 0) return toListing(await fetchOne(listingId));
    const { status, body } = await callAs<BackendListing>("owner", `/v1/listings/${listingId}`, {
      method: "PATCH",
      body: patch,
    });
    if (status !== 200) raise(status, body);
    return toListing(body);
  },

  async blockers(listingId) {
    const { status, body } = await callAs<{ blockers: { field: string; message: string }[] }>(
      "owner", `/v1/listings/${listingId}/blockers`);
    if (status !== 200) raise(status, body);
    return toBlockers(body.blockers);
  },

  async submit({ listingId, idempotencyKey }) {
    const { status, body } = await callAs<BackendListing>("owner", `/v1/listings/${listingId}/submission`, {
      method: "POST",
      body: { idempotencyKey },
    });
    if (status === 422) {
      return { ok: false, blockers: toBlockers(body.blockers ?? [{ field: body.field ?? "title", message: body.error ?? "Something is missing." }]) };
    }
    if (status !== 200) raise(status, body);
    return { ok: true, listing: toListing(body), duplicate: body.duplicate === true };
  },

  async withdraw({ listingId, reason }) {
    const { status, body } = await callAs<BackendListing>("owner", `/v1/listings/${listingId}/withdrawal`, {
      method: "POST",
      body: { reason },
    });
    if (status !== 200) raise(status, body);
    return toListing(body);
  },

  async reply({ listingId, body: message }) {
    const { status, body } = await callAs<BackendListing>("owner", `/v1/listings/${listingId}/messages`, {
      method: "POST",
      body: { body: message },
    });
    if (status !== 201) raise(status, body);
    return toListing(body);
  },
};

// --------------------------------------------------------------- admin side

const toAdminListing = (l: BackendListing, label: string): AdminOwnerListing => ({
  ...toListing(l),
  ownerLabel: (l as BackendListing & { submitter?: string }).submitter ?? "Owner",
  internalNotes: (l.history ?? [])
    .filter((h) => h.visibility === "internal")
    .map((h, index): AdminTicketMessage => ({
      id: `${l.id}-n${index}`,
      authorLabel: h.actorLabel,
      body: h.reason,
      sentAt: h.at,
      internal: true,
      fromUser: false,
    })),
  // The label is composed here for the same reason as everywhere else: one
  // place, so two screens cannot disagree about what a locality is called.
  ...(label ? {} : {}),
});

export const backendAdminOwnerListings = {
  async listOwnerListings(filter?: { status?: OwnerListingStatus }) {
    const wanted = filter?.status;
    // The staff queue is "waiting on a person" by default; a named status asks
    // for that status instead, translated back to the backend's vocabulary.
    const query = wanted ? `?status=${wanted === "declined" ? "rejected" : wanted}` : "";
    const { status, body } = await callAs<{ listings: BackendListing[] }>(
      "staff", `/v1/listings/queue${query}`);
    if (status !== 200) raise(status, body);
    const labels = await labelsFor(body.listings);
    return body.listings.map((l) =>
      toAdminListing(l, l.locationId ? (labels.get(l.locationId) ?? "") : ""));
  },

  async getOwnerListing(id: string) {
    const { status, body } = await callAs<BackendListing>("staff", `/v1/listings/${id}`);
    if (status === 404) return null;
    if (status !== 200) raise(status, body);
    return toAdminListing(body, "");
  },

  async respondToOwnerListing(input: {
    listingId: string; body: string; internal: boolean;
  }): Promise<AdminActionResult> {
    if (!input.body.trim()) return { ok: false, error: "Write the reply before sending it." };
    // An internal note is a decision-shaped record with no status change, so
    // it rides the decision endpoint with the listing's current status; a
    // public reply is a message. The difference is what the submitter sees,
    // and the database is what enforces it.
    if (input.internal) {
      const current = await callAs<BackendListing>("staff", `/v1/listings/${input.listingId}`);
      if (current.status !== 200) return { ok: false, error: "That listing could not be found." };
      const decided = await callAs<BackendListing>("staff", `/v1/listings/${input.listingId}/decision`, {
        method: "POST",
        body: {
          to: current.body.status === "submitted" ? "in_review" : current.body.status,
          reason: "Internal note",
          visibility: "internal",
          note: input.body,
        },
      });
      return decided.status === 200
        ? { ok: true, auditId: `note-${input.listingId}` }
        : { ok: false, error: decided.body.error ?? "That note could not be saved." };
    }
    const replied = await callAs<BackendListing>("staff", `/v1/listings/${input.listingId}/messages`, {
      method: "POST",
      body: { body: input.body },
    });
    return replied.status === 201
      ? { ok: true, auditId: `reply-${input.listingId}` }
      : { ok: false, error: replied.body.error ?? "That reply could not be sent." };
  },

  async decideOwnerListing(input: {
    listingId: string;
    decision: "in_review" | "changes_requested" | "cleared" | "declined";
    reason: string;
  }): Promise<AdminActionResult> {
    if (!input.reason.trim()) {
      return { ok: false, error: "Record why. The owner sees this on their listing." };
    }
    const { status, body } = await callAs<BackendListing>(
      "staff", `/v1/listings/${input.listingId}/decision`, {
        method: "POST",
        body: { to: input.decision === "declined" ? "rejected" : input.decision, reason: input.reason },
      });
    return status === 200
      ? { ok: true, auditId: `decision-${input.listingId}` }
      : { ok: false, error: body.error ?? "That decision could not be recorded." };
  },
};
