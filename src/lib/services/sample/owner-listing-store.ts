import type {
  OwnerContactPreference,
  OwnerListing,
  OwnerListingBlocker,
  OwnerListingEvent,
  OwnerListingIntent,
  OwnerListingMessage,
  OwnerListingPhoto,
  OwnerListingStatus,
  OwnerListingStepId,
  OwnerListingStepState,
  OwnerListingSummary,
} from "@/lib/domain/types";
import type { AdminOwnerListing, AdminTicketMessage } from "@/lib/domain/admin";
import type { StaffRef } from "@/lib/domain/identity";
import { photographStepComplete } from "@/lib/domain/listing-photographs";
import { ValidationError } from "@/lib/services/contracts";
import { processState } from "./process-state";
import { areaLabel, getLocation } from "./locations";

/**
 * CR02 — the sample store behind the individual owner's posting journey.
 *
 * WHAT THIS IS
 * ------------
 * Process memory for a review session, behind the service contract a durable
 * implementation fills. It exists so the whole journey — draft, steps,
 * validation, submission, the moderation queue, the owner's view of what
 * happened — can be used and checked in this build.
 *
 * WHAT IT IS NOT
 * --------------
 * It is not storage. Records here die with the server process. That is the
 * same limitation CR03's store had; CR03 is now served by kkl-backend because
 * the client required lead requests to persist. No such requirement has been
 * stated for owner drafts, so this stays sample — and the screens say so
 * rather than implying a draft will be there tomorrow.
 *
 * Nothing here publishes a listing, charges an owner, or awards a
 * verification. A submitted listing reaches a queue and stops.
 *
 * PHOTOGRAPHS
 * -----------
 * A chosen file's bytes are not kept. Media storage belongs to kkl-backend,
 * and a sample store that quietly substituted a stock photograph for
 * somebody's flat would be lying about the listing. So a photo record carries
 * the file's name and `retained: false`, and every screen that shows photos
 * renders that plainly.
 */

const STEPS: readonly { id: OwnerListingStepId; label: string }[] = [
  { id: "basics", label: "About the property" },
  { id: "location", label: "Where it is" },
  { id: "pricing", label: "Price and configuration" },
  { id: "photos", label: "Photographs" },
  { id: "contact", label: "How buyers reach you" },
  { id: "preview", label: "Preview and submit" },
];

export const OWNER_STEPS = STEPS;

/** The one sample owner — the identity every listing is associated with. */
const SAMPLE_OWNER = "Arindam Basu";

type StoredListing = {
  id: string;
  reference: string;
  status: OwnerListingStatus;
  intent: OwnerListingIntent | null;
  title: string;
  propertyType: string | null;
  configuration: string | null;
  description: string;
  localityId: string | null;
  addressLine: string;
  priceInr: number | null;
  carpetArea: string;
  floorLabel: string;
  furnishing: string | null;
  availableFrom: string;
  photos: OwnerListingPhoto[];
  contactPreference: OwnerContactPreference | null;
  contactName: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  events: OwnerListingEvent[];
  messages: OwnerListingMessage[];
  internalNotes: AdminTicketMessage[];
};

type OwnerListingState = {
  listings: StoredListing[];
  /** Idempotency: key → the listing it created or submitted. */
  tokens: Map<string, string>;
  nextReference: number;
  nextId: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function seed(): OwnerListingState {
  const at = "2026-09-25T11:20:00.000Z";
  return {
    tokens: new Map(),
    nextReference: 1042,
    nextId: 2,
    listings: [
      {
        id: "op-seed-1",
        reference: "OP-1041",
        status: "in_review",
        intent: "sell",
        title: "2 BHK in Salt Lake Sector II",
        propertyType: "apartment",
        configuration: "2",
        description:
          "South-facing flat on the fourth floor, corner unit, two balconies. Owner-occupied since 2016.",
        localityId: "salt-lake",
        addressLine: "Block CJ, Sector II",
        priceInr: 7200000,
        carpetArea: "985",
        floorLabel: "4th of 6",
        furnishing: "semi",
        availableFrom: "Immediately",
        photos: [
          { id: "op-seed-1-p1", fileName: "living-room.jpg", sizeLabel: "1.8 MB", retained: false },
          { id: "op-seed-1-p2", fileName: "balcony.jpg", sizeLabel: "2.1 MB", retained: false },
        ],
        contactPreference: "either",
        contactName: SAMPLE_OWNER,
        createdAt: at,
        updatedAt: at,
        submittedAt: at,
        events: [
          { at, status: "draft", actorLabel: SAMPLE_OWNER, note: null },
          { at, status: "submitted", actorLabel: SAMPLE_OWNER, note: null },
          {
            at,
            status: "in_review",
            actorLabel: "A. Dutta · Operations",
            note: "Picked up from the owner-submission queue.",
          },
        ],
        messages: [],
        internalNotes: [],
      },
    ],
  };
}

function store(): OwnerListingState {
  return processState<OwnerListingState>("kkl.sample.ownerListings", seed);
}

function find(id: string): StoredListing | null {
  return store().listings.find((l) => l.id === id) ?? null;
}

// ------------------------------------------------------------- projections --

function toListing(l: StoredListing): OwnerListing {
  return {
    id: l.id,
    reference: l.reference,
    status: l.status,
    intent: l.intent,
    title: l.title,
    propertyType: l.propertyType,
    configuration: l.configuration,
    description: l.description,
    localityId: l.localityId,
    addressLine: l.addressLine,
    priceInr: l.priceInr,
    carpetArea: l.carpetArea,
    floorLabel: l.floorLabel,
    furnishing: l.furnishing,
    availableFrom: l.availableFrom,
    photos: [...l.photos],
    contactPreference: l.contactPreference,
    contactName: l.contactName,
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    submittedAt: l.submittedAt,
    events: [...l.events],
    // Public thread only. `OwnerListing` has no field for an internal note, so
    // this is containment rather than a filter somebody has to remember.
    messages: [...l.messages],
  };
}

function toAdminListing(l: StoredListing): AdminOwnerListing {
  return {
    ...toListing(l),
    ownerLabel: `${l.contactName || SAMPLE_OWNER} · individual owner`,
    internalNotes: [...l.internalNotes],
  };
}

const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Apartment",
  villa: "Villa / independent house",
  plot: "Plot",
  commercial: "Commercial",
};

function priceLabel(l: StoredListing): string {
  if (l.priceInr === null) return "Price not set";
  const formatted = `₹${l.priceInr.toLocaleString("en-IN")}`;
  return l.intent === "rent" ? `${formatted} / month` : formatted;
}

function detailLine(l: StoredListing): string {
  const parts = [
    l.configuration ? `${l.configuration} BHK` : null,
    l.propertyType ? (PROPERTY_TYPES[l.propertyType] ?? l.propertyType) : null,
    l.carpetArea ? `${l.carpetArea} sq ft` : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(" · ") : "Details not filled in yet";
}

export function stepStates(l: OwnerListing): readonly OwnerListingStepState[] {
  return STEPS.map((s) => ({ ...s, complete: stepComplete(l, s.id) }));
}

function stepComplete(l: OwnerListing, step: OwnerListingStepId): boolean {
  switch (step) {
    case "basics":
      return l.title.trim() !== "" && l.propertyType !== null && l.intent !== null;
    case "location":
      return l.localityId !== null;
    case "pricing":
      return l.priceInr !== null && l.configuration !== null;
    case "photos":
      return photographStepComplete(l.photos, "sample");
    case "contact":
      return l.contactPreference !== null && l.contactName.trim() !== "";
    case "preview":
      // The preview is complete when everything it previews is.
      return (["basics", "location", "pricing", "photos", "contact"] as const).every((s) =>
        stepComplete(l, s),
      );
  }
}

function stepNumber(step: OwnerListingStepId): number {
  return STEPS.findIndex((s) => s.id === step) + 1;
}

/**
 * What is missing, in the order an owner would hit it, each pointing at the
 * step that owns it — a blocker that cannot be navigated to is just a
 * complaint.
 */
export function blockers(listingId: string): readonly OwnerListingBlocker[] {
  const stored = find(listingId);
  if (stored === null) return [];
  const l = toListing(stored);
  const out: OwnerListingBlocker[] = [];
  const add = (step: OwnerListingStepId, message: string) =>
    out.push({ step, stepNumber: stepNumber(step), message });

  if (l.title.trim() === "") add("basics", "The listing needs a title buyers will recognise it by.");
  if (l.intent === null) add("basics", "Say whether you are selling or letting the property.");
  if (l.propertyType === null) add("basics", "Choose the property type.");
  if (l.localityId === null) add("location", "Choose the locality the property is in.");
  if (l.configuration === null) add("pricing", "Choose the configuration.");
  if (l.priceInr === null) {
    add("pricing", l.intent === "rent" ? "Enter the monthly rent." : "Enter the price you expect.");
  }
  if (l.photos.length === 0) add("photos", "Add at least one photograph of the property.");
  if (l.contactName.trim() === "") add("contact", "Give the name buyers will see.");
  if (l.contactPreference === null) add("contact", "Choose how buyers should contact you.");
  return out;
}

// ------------------------------------------------------------------ reads --

export function listMine(): readonly OwnerListingSummary[] {
  const steps = STEPS.length;
  return [...store().listings]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((l) => {
      const projected = toListing(l);
      return {
        id: l.id,
        reference: l.reference,
        title: l.title.trim() === "" ? "Untitled draft" : l.title,
        status: l.status,
        locationLabel: l.localityId === null ? "Locality not set" : areaLabel(l.localityId),
        priceLabel: priceLabel(l),
        detailLine: detailLine(l),
        photoCount: l.photos.length,
        stepsComplete: stepStates(projected).filter((s) => s.complete).length,
        stepsTotal: steps,
        updatedAt: l.updatedAt,
      };
    });
}

export function getMine(id: string): OwnerListing | null {
  const found = find(id);
  return found === null ? null : toListing(found);
}

export function listForStaff(filter?: { status?: OwnerListingStatus }): readonly AdminOwnerListing[] {
  // Drafts are not in the queue. A draft is the owner's private working copy
  // and staff have no business reading one before it is sent.
  return store()
    .listings.filter((l) => l.status !== "draft")
    .filter((l) => (filter?.status ? l.status === filter.status : true))
    .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt))
    .map(toAdminListing);
}

export function getForStaff(id: string): AdminOwnerListing | null {
  const found = find(id);
  if (found === null || found.status === "draft") return null;
  return toAdminListing(found);
}

// ----------------------------------------------------------------- writes --

export function startDraft(input: { idempotencyKey: string }): OwnerListing {
  const replayed = store().tokens.get(`start:${input.idempotencyKey}`);
  if (replayed !== undefined) {
    const existing = find(replayed);
    if (existing !== null) return toListing(existing);
  }

  const at = nowIso();
  const s = store();
  const id = `op-${s.nextId++}`;
  const listing: StoredListing = {
    id,
    reference: `OP-${s.nextReference++}`,
    status: "draft",
    intent: null,
    title: "",
    propertyType: null,
    configuration: null,
    description: "",
    localityId: null,
    addressLine: "",
    priceInr: null,
    carpetArea: "",
    floorLabel: "",
    furnishing: null,
    availableFrom: "",
    photos: [],
    contactPreference: null,
    contactName: SAMPLE_OWNER,
    createdAt: at,
    updatedAt: at,
    submittedAt: null,
    events: [{ at, status: "draft", actorLabel: SAMPLE_OWNER, note: null }],
    messages: [],
    internalNotes: [],
  };
  s.listings.unshift(listing);
  s.tokens.set(`start:${input.idempotencyKey}`, id);
  return toListing(listing);
}

function text(values: Readonly<Record<string, string | readonly string[]>>, key: string): string | undefined {
  const raw = values[key];
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? (raw[0] ?? "") : String(raw);
}

function optionOf<T extends string>(raw: string | undefined, allowed: readonly T[]): T | null | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  return (allowed as readonly string[]).includes(trimmed) ? (trimmed as T) : null;
}

/**
 * A rupee amount.
 *
 * Returns `undefined` when the field was not submitted, `null` when it was
 * submitted empty, and the number otherwise. `NaN` means the owner typed
 * something that is not an amount — the caller raises a field error rather than
 * treating it as blank. Silently discarding what someone typed is worse than
 * refusing it: they move on believing the price is in.
 *
 * ₹, commas and spaces are tolerated because people paste them.
 */
function money(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const cleaned = trimmed.replace(/[₹,\s]/g, "");
  return /^\d+$/.test(cleaned) ? Number(cleaned) : Number.NaN;
}

/**
 * Saves one step. A partly-filled step is saved, not refused: an owner filling
 * in what they know first is the normal case, and the blockers list is what
 * stops an incomplete listing being submitted.
 *
 * What *is* refused is a value that is wrong rather than absent — a price that
 * is not a number, a locality the records do not know. Storing those would put
 * a listing in the queue that nobody can act on.
 */
export function saveStep(input: {
  listingId: string;
  step: OwnerListingStepId;
  values: Readonly<Record<string, string | readonly string[]>>;
}): OwnerListing {
  const l = find(input.listingId);
  if (l === null) throw new ValidationError({ form: "That listing could not be found." });
  if (!editable(l.status)) {
    throw new ValidationError({
      form: "This listing is with the review team, so it cannot be edited. Withdraw it first if you need to change it.",
    });
  }

  const v = input.values;
  const fields: Record<string, string> = {};

  switch (input.step) {
    case "basics": {
      const title = text(v, "title");
      if (title !== undefined) {
        if (title.trim().length > 120) fields.title = "Keep the title under 120 characters.";
        else l.title = title.trim();
      }
      const intent = optionOf(text(v, "intent"), ["sell", "rent"] as const);
      if (intent !== undefined) l.intent = intent;
      const type = optionOf(text(v, "propertyType"), ["apartment", "villa", "plot", "commercial"] as const);
      if (type !== undefined) l.propertyType = type;
      const description = text(v, "description");
      if (description !== undefined) {
        if (description.length > 2000) fields.description = "Keep the description under 2000 characters.";
        else l.description = description.trim();
      }
      break;
    }
    case "location": {
      const locality = text(v, "locality");
      if (locality !== undefined) {
        const trimmed = locality.trim();
        if (trimmed === "") l.localityId = null;
        else if (getLocation(trimmed) === null) fields.locality = "Choose a locality from the list.";
        else l.localityId = trimmed;
      }
      const address = text(v, "addressLine");
      if (address !== undefined) {
        if (address.length > 200) fields.addressLine = "Keep this under 200 characters.";
        else l.addressLine = address.trim();
      }
      break;
    }
    case "pricing": {
      const price = money(text(v, "price"));
      if (price !== undefined) {
        if (price !== null && Number.isNaN(price)) {
          fields.price = "Enter the amount in figures — for example 7200000.";
        } else if (price !== null && price <= 0) {
          fields.price = "Enter the amount as a number above zero.";
        } else if (price !== null && price > 10_000_000_000) {
          fields.price = "That amount looks wrong. Check it.";
        } else {
          l.priceInr = price;
        }
      }
      const config = optionOf(text(v, "configuration"), ["1", "2", "3", "4+"] as const);
      if (config !== undefined) l.configuration = config;
      const carpet = text(v, "carpetArea");
      if (carpet !== undefined) {
        const trimmed = carpet.trim();
        if (trimmed !== "" && !/^\d{2,6}$/.test(trimmed)) {
          fields.carpetArea = "Enter the carpet area in square feet, as a number.";
        } else l.carpetArea = trimmed;
      }
      const floor = text(v, "floorLabel");
      if (floor !== undefined) l.floorLabel = floor.trim().slice(0, 40);
      const furnishing = optionOf(text(v, "furnishing"), ["unfurnished", "semi", "furnished"] as const);
      if (furnishing !== undefined) l.furnishing = furnishing;
      const available = text(v, "availableFrom");
      if (available !== undefined) l.availableFrom = available.trim().slice(0, 60);
      break;
    }
    case "photos": {
      // The form posts the file names it collected. The bytes are not here and
      // are not kept anywhere; see the note at the top of this file.
      const names = v.photoNames;
      const sizes = v.photoSizes;
      if (names !== undefined) {
        const list = Array.isArray(names) ? names : [String(names)];
        const sizeList = Array.isArray(sizes) ? sizes : sizes === undefined ? [] : [String(sizes)];
        const kept = list.map((n) => String(n).trim()).filter((n) => n !== "");
        if (kept.length > 12) fields.photos = "Twelve photographs is the most a listing can carry.";
        else {
          l.photos = kept.map((fileName, i) => ({
            id: `${l.id}-p${i + 1}`,
            fileName: fileName.slice(0, 120),
            sizeLabel: String(sizeList[i] ?? "").slice(0, 20) || "size unknown",
            retained: false,
          }));
        }
      }
      const removeId = text(v, "removePhotoId");
      if (removeId !== undefined && removeId.trim() !== "") {
        l.photos = l.photos.filter((p) => p.id !== removeId.trim());
      }
      break;
    }
    case "contact": {
      const name = text(v, "contactName");
      if (name !== undefined) {
        if (name.trim().length > 80) fields.contactName = "Keep the name under 80 characters.";
        else l.contactName = name.trim();
      }
      const preference = optionOf(text(v, "contactPreference"), ["phone", "whatsapp", "either"] as const);
      if (preference !== undefined) l.contactPreference = preference;
      break;
    }
    case "preview":
      // Nothing to save; the preview shows what the other steps hold.
      break;
  }

  if (Object.keys(fields).length > 0) throw new ValidationError(fields);
  l.updatedAt = nowIso();
  return toListing(l);
}

function editable(status: OwnerListingStatus): boolean {
  return status === "draft" || status === "changes_requested" || status === "withdrawn";
}

export function submit(input: { listingId: string; idempotencyKey: string }):
  | { ok: true; listing: OwnerListing; duplicate: boolean }
  | { ok: false; blockers: readonly OwnerListingBlocker[] } {
  const replayed = store().tokens.get(`submit:${input.idempotencyKey}`);
  if (replayed !== undefined) {
    const existing = find(replayed);
    // A replayed submit returns the listing as it now stands and queues
    // nothing. The owner sees the same reference, not a second one.
    if (existing !== null) return { ok: true, listing: toListing(existing), duplicate: true };
  }

  const l = find(input.listingId);
  if (l === null) return { ok: false, blockers: [] };

  const missing = blockers(input.listingId);
  if (missing.length > 0) return { ok: false, blockers: missing };

  const at = nowIso();
  l.status = "submitted";
  l.submittedAt = at;
  l.updatedAt = at;
  l.events.push({ at, status: "submitted", actorLabel: l.contactName || SAMPLE_OWNER, note: null });
  store().tokens.set(`submit:${input.idempotencyKey}`, l.id);
  return { ok: true, listing: toListing(l), duplicate: false };
}

export function withdraw(input: { listingId: string; reason: string }): OwnerListing {
  const l = find(input.listingId);
  if (l === null) throw new ValidationError({ form: "That listing could not be found." });
  if (l.status === "draft" || l.status === "withdrawn") {
    throw new ValidationError({ form: "This listing is not with the review team." });
  }
  const reason = input.reason.trim();
  if (reason === "") {
    throw new ValidationError({ reason: "Say why you are withdrawing it. The team sees this." });
  }
  const at = nowIso();
  l.status = "withdrawn";
  l.updatedAt = at;
  l.events.push({ at, status: "withdrawn", actorLabel: l.contactName || SAMPLE_OWNER, note: reason });
  return toListing(l);
}

export function reply(input: { listingId: string; body: string }): OwnerListing {
  const l = find(input.listingId);
  if (l === null) throw new ValidationError({ form: "That listing could not be found." });
  const body = input.body.trim();
  if (body === "") throw new ValidationError({ body: "Write your reply before sending it." });
  if (body.length > 2000) throw new ValidationError({ body: "Keep the reply under 2000 characters." });
  l.messages.push({
    id: `${l.id}-m${l.messages.length + 1}`,
    authorLabel: l.contactName || SAMPLE_OWNER,
    body,
    at: nowIso(),
  });
  l.updatedAt = nowIso();
  return toListing(l);
}

// ------------------------------------------------------------ staff writes --

export function staffRespond(input: {
  actor: StaffRef;
  listingId: string;
  body: string;
  internal: boolean;
}): { ok: true } | { ok: false; error: string } {
  const l = find(input.listingId);
  if (l === null || l.status === "draft") return { ok: false, error: "That listing could not be found." };
  const body = input.body.trim();
  if (body === "") return { ok: false, error: "Write the message before sending it." };

  const at = nowIso();
  const authorLabel = `${input.actor.name} · ${input.actor.team}`;
  if (input.internal) {
    l.internalNotes.push({
      id: `${l.id}-n${l.internalNotes.length + 1}`,
      authorLabel,
      body,
      sentAt: at,
      internal: true,
      fromUser: false,
    });
  } else {
    l.messages.push({ id: `${l.id}-m${l.messages.length + 1}`, authorLabel, body, at });
  }
  l.updatedAt = at;
  return { ok: true };
}

const DECISION_STATUS: Record<string, OwnerListingStatus> = {
  in_review: "in_review",
  changes_requested: "changes_requested",
  cleared: "cleared",
  declined: "declined",
};

export function staffDecide(input: {
  actor: StaffRef;
  listingId: string;
  decision: "in_review" | "changes_requested" | "cleared" | "declined";
  reason: string;
}): { ok: true; from: OwnerListingStatus; to: OwnerListingStatus; reference: string } | { ok: false; error: string } {
  const l = find(input.listingId);
  if (l === null || l.status === "draft") return { ok: false, error: "That listing could not be found." };
  const to = DECISION_STATUS[input.decision];
  if (to === undefined) return { ok: false, error: "That decision was not recognised." };
  const reason = input.reason.trim();
  if (reason === "") {
    return {
      ok: false,
      error:
        "Record why. The reason is kept with the decision and, where the owner is told the outcome, shown to them.",
    };
  }
  if (l.status === to) {
    return { ok: false, error: `This listing is already ${to.replace("_", " ")}.` };
  }

  const from = l.status;
  const at = nowIso();
  l.status = to;
  l.updatedAt = at;
  l.events.push({ at, status: to, actorLabel: `${input.actor.name} · ${input.actor.team}`, note: reason });
  return { ok: true, from, to, reference: l.reference };
}

/** Review-only: drop everything back to the seeded state. */
export function resetOwnerListings(): void {
  const s = store();
  const fresh = seed();
  s.listings = fresh.listings;
  s.tokens = fresh.tokens;
  s.nextReference = fresh.nextReference;
  s.nextId = fresh.nextId;
}
