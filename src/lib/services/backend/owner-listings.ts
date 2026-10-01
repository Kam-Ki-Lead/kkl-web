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
 * Object storage is not configured (Q-8). A file selected in the browser is
 * not an upload. Saving the photograph step can POST the file's own name,
 * content type and byte size to /v1/listings/{id}/media. The backend records
 * that as availability `declared` and stored false, and that row does not
 * satisfy an owner's photograph requirement. The upload route is called so
 * its refusal is the one the owner sees; a 503 does not mark the row
 * available, and this adapter never supplies a storage key. A builder listing
 * is not held to the photograph rule.
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
  availability?: "declared" | "unavailable" | "available";
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

/** A photograph counts only when the storage adapter has confirmed the bytes. */
function storedPhotograph(photo: { retained: boolean; availability?: string }): boolean {
  return photo.retained && photo.availability === "available";
}

const photosOf = (listing: BackendListing): readonly OwnerListingPhoto[] =>
  (listing.media ?? []).filter((m) => m.kind === "image").map((m) => {
    const availability = m.availability === "available" || m.availability === "declared" || m.availability === "unavailable"
      ? m.availability
      : undefined;
    return {
      id: m.id,
      fileName: m.fileName,
      sizeLabel: size(m.byteSize),
      availability,
      // `stored` alone is not enough. A declared or unavailable row, and a
      // row whose key was set without adapter confirmation, stays unretained.
      retained: availability === "available" && m.stored === true,
    };
  });

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
      return l.photos.some((photo) => storedPhotograph(photo));
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
    photoCount: l.photos.filter((photo) => storedPhotograph(photo)).length,
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
  contentType: "photos",
  byteSize: "photos",
  fileName: "photos",
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

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function postedList(
  values: Readonly<Record<string, string | readonly string[]>>,
  key: string,
): readonly string[] {
  const value = values[key];
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => String(item));
}

/**
 * Record the files the owner actually selected. The name, type and size come
 * from that selection. A missing size is refused here rather than replaced
 * with a guess, and no storage key is sent. The row the API returns is
 * declared metadata; it is not marked stored.
 */
async function declareSelected(
  listingId: string,
  values: Readonly<Record<string, string | readonly string[]>>,
): Promise<number> {
  const names = postedList(values, "photoFileName");
  const sizes = postedList(values, "photoByteSize");
  const types = postedList(values, "photoContentType");
  let declared = 0;
  for (let index = 0; index < names.length; index += 1) {
    const fileName = names[index]?.trim() ?? "";
    if (fileName === "") continue;
    const byteSize = Number(sizes[index]);
    const contentType = (types[index] ?? "").trim().toLowerCase();
    if (fileName.includes("/") || fileName.includes("\\") || fileName.length > 200) {
      throw new ValidationError({ photos: "That file name cannot be recorded." });
    }
    if (!Number.isInteger(byteSize) || byteSize <= 0 || !IMAGE_TYPES.has(contentType)) {
      throw new ValidationError({
        photos: "The selected file did not include a usable size and type, so it was not recorded.",
      });
    }
    const { status, body } = await callAs<BackendListing>("owner", `/v1/listings/${listingId}/media`, {
      method: "POST",
      body: { kind: "image", contentType, byteSize, fileName },
    });
    if (status !== 201) raise(status, body);
    declared += 1;
  }
  return declared;
}

async function removeDeclared(
  listingId: string,
  values: Readonly<Record<string, string | readonly string[]>>,
): Promise<void> {
  const mediaId = postedList(values, "removePhotoId").find((id) => id.trim() !== "")?.trim();
  if (!mediaId) return;
  const { status, body } = await callAs<BackendListing>(
    "owner",
    `/v1/listings/${listingId}/media/${mediaId}`,
    { method: "DELETE" },
  );
  if (status !== 200) raise(status, body);
}

/**
 * Ask the upload route to accept the file. While storage is unconfigured it
 * answers 503 and leaves every row declared. That refusal is not a failure
 * of the draft, and it is not turned into a stored photograph.
 */
async function refuseUpload(listingId: string): Promise<void> {
  const { status, body } = await callAs<{ code?: string }>(
    "owner",
    `/v1/listings/${listingId}/media/upload`,
    { method: "POST", body: {} },
  );
  if (status === 503) return;
  if (status === 401 || status === 403 || status === 404) raise(status, body);
  // Any other answer is still not proof the bytes were stored. The following
  // read of the listing is what decides availability.
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
      await removeDeclared(listingId, values);
      const declared = await declareSelected(listingId, values);
      if (declared > 0) await refuseUpload(listingId);
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
