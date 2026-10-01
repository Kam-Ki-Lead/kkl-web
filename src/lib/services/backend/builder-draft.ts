import type { ListingDraft, ListingSectionId, ListingSectionState, PublishBlocker } from "@/lib/domain/types";

/**
 * The approved builder editor and the published listing record do not share a
 * price.
 *
 * The editor collects configuration names (1–5 BHK) and one project range:
 * priceMinInr and priceMaxInr. The record stores one listing priceInr, and
 * each configuration may store its own priceInr. The range is neither of
 * those. Nothing here copies the range into priceInr, picks its minimum, or
 * splits it across configurations.
 *
 * Rewriting configurations replaces every row. A price, area or availability
 * already stored on a configuration is copied back onto that same name.
 * A configuration the checkboxes cannot represent is kept as it was stored.
 */

export type StoredConfiguration = {
  readonly configuration: string | null;
  readonly priceInr: number | null;
  readonly areaSqft: number | null;
  readonly available: number | null;
};

export type ConfigurationWrite = {
  readonly configuration: string;
  readonly priceInr?: number;
  readonly areaSqft?: number;
  readonly available?: number;
};

const CHECKBOX = /^[1-5]$/;
const STORED_NAME = /^([1-5]) BHK$/;

export function configurationName(token: string): string | null {
  const trimmed = token.trim();
  return CHECKBOX.test(trimmed) ? `${trimmed} BHK` : null;
}

function wholeNumber(value: number | null): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : undefined;
}

function echo(name: string, prior: StoredConfiguration | undefined): ConfigurationWrite {
  const priceInr = wholeNumber(prior?.priceInr ?? null);
  const areaSqft = wholeNumber(prior?.areaSqft ?? null);
  const available =
    typeof prior?.available === "number" && Number.isInteger(prior.available) && prior.available >= 0
      ? prior.available
      : undefined;
  return {
    configuration: name,
    ...(priceInr === undefined ? {} : { priceInr }),
    ...(areaSqft === undefined ? {} : { areaSqft }),
    ...(available === undefined ? {} : { available }),
  };
}

export function configurationPayload(
  selectedTokens: readonly string[],
  existing: readonly StoredConfiguration[],
): ConfigurationWrite[] {
  const selected = selectedTokens
    .map((token) => (typeof token === "string" ? configurationName(token) : null))
    .filter((name): name is string => name !== null);
  const known = selected.map((name) =>
    echo(name, existing.find((entry) => entry.configuration === name)),
  );
  const kept = existing
    .filter((entry) => entry.configuration && !STORED_NAME.test(entry.configuration))
    .map((entry) => echo(entry.configuration as string, entry));
  return [...kept, ...known];
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function positiveInteger(value: unknown): number | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/** Fields this section may write. The price range is never among them. */
export function sectionPatch(
  section: string,
  values: Readonly<Record<string, unknown>>,
  existing: readonly StoredConfiguration[] = [],
): Record<string, unknown> {
  if (section === "basics") {
    const patch: Record<string, unknown> = {};
    const title = text(values.title);
    const propertyType = text(values.propertyType);
    const description = text(values.description);
    if (title !== undefined) patch.title = title.trim() === "" ? null : title.trim();
    if (propertyType !== undefined) patch.propertyType = propertyType.trim() === "" ? null : propertyType.trim();
    if (description !== undefined) patch.description = description;
    return patch;
  }
  if (section === "location") {
    const patch: Record<string, unknown> = {};
    const locality = text(values.locality);
    const addressLine = text(values.addressLine);
    if (locality !== undefined) patch.locationId = locality.trim() === "" ? null : locality.trim();
    if (addressLine !== undefined) patch.addressLine = addressLine;
    return patch;
  }
  if (section === "pricing") {
    if (!Array.isArray(values.configurations)) return {};
    return {
      configurations: configurationPayload(
        values.configurations.filter((token): token is string => typeof token === "string"),
        existing,
      ),
    };
  }
  if (section === "specifications") {
    const patch: Record<string, unknown> = {};
    const totalUnits = positiveInteger(values.totalUnits);
    if (totalUnits !== undefined) patch.totalUnits = totalUnits;
    const reraNumber = text(values.reraNumber);
    if (reraNumber !== undefined) patch.reraId = reraNumber.trim() === "" ? null : reraNumber.trim();
    return patch;
  }
  return {};
}

type ListingBody = {
  id?: string;
  status?: string;
  title?: string | null;
  description?: string | null;
  propertyType?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  addressLine?: string | null;
  priceInr?: number | null;
  reraId?: string | null;
  totalUnits?: number | null;
  updatedAt?: string | null;
  configurations?: readonly StoredConfiguration[];
  media?: readonly { kind?: string; stored?: boolean; availability?: string }[];
};

function checkboxToken(name: string | null): string | null {
  if (!name) return null;
  return STORED_NAME.exec(name)?.[1] ?? null;
}

function knownStatus(status: string | undefined): ListingDraft["status"] {
  if (status === "published" || status === "unpublished" || status === "draft") return status;
  return "draft";
}

export function toBuilderDraft(body: ListingBody): ListingDraft {
  const configurations = body.configurations ?? [];
  const tokens = configurations
    .map((entry) => checkboxToken(entry.configuration))
    .filter((token): token is string => token !== null);
  const configurationPrices = configurations.flatMap((entry) => {
    const price = wholeNumber(entry.priceInr);
    if (!entry.configuration || price === undefined) return [];
    return [{ label: entry.configuration, priceInr: price }];
  });
  return {
    id: body.id ?? "",
    status: knownStatus(body.status),
    title: body.title ?? "",
    propertyType: body.propertyType ?? null,
    possessionTarget: null,
    description: body.description ?? "",
    localityId: body.locationId ?? null,
    addressLine: body.addressLine ?? "",
    configurations: tokens,
    priceMinInr: null,
    priceMaxInr: null,
    listingPriceInr: wholeNumber(body.priceInr ?? null) ?? null,
    configurationPrices,
    areaMin: "",
    areaMax: "",
    totalUnits: body.totalUnits == null ? "" : String(body.totalUnits),
    amenities: [],
    reraRegistered: false,
    reraNumber: body.reraId ?? null,
    media: [],
    videoUrl: null,
    publishedAt: null,
    updatedAt: body.updatedAt ?? "",
    enquiryCount: 0,
  };
}

const SECTION_LABELS: readonly { id: ListingSectionId; label: string }[] = [
    { id: "basics", label: "Basics" },
    { id: "location", label: "Location" },
    { id: "pricing", label: "Pricing" },
    { id: "specifications", label: "Specifications" },
    { id: "media", label: "Media" },
    { id: "preview", label: "Preview" },
  ];

export function builderSections(listing: ListingDraft): ListingSectionState[] {
  const content: Record<string, boolean> = {
    basics: listing.title.trim() !== "" && listing.propertyType !== null && listing.propertyType !== "",
    location: listing.localityId !== null && listing.localityId !== "",
    pricing: listing.configurations.length > 0,
    specifications: listing.totalUnits.trim() !== "",
    media: false,
  };
  const blockers = builderBlockers(listing);
  return SECTION_LABELS.map((section) => ({
    id: section.id,
    label: section.label,
    complete: section.id === "preview" ? blockers.length === 0 : content[section.id] === true,
  }));
}

export function builderBlockers(listing: ListingDraft): PublishBlocker[] {
  const blockers: PublishBlocker[] = [];
  if (listing.title.trim() === "") {
    blockers.push({ section: "basics", sectionNumber: 1, message: "Enter the project name." });
  }
  if (!listing.propertyType) {
    blockers.push({ section: "basics", sectionNumber: 1, message: "Choose a property type." });
  }
  if (!listing.localityId) {
    blockers.push({ section: "location", sectionNumber: 2, message: "Choose a locality." });
  }
  if (listing.listingPriceInr == null) {
    blockers.push({
      section: "pricing",
      sectionNumber: 3,
      message:
        "The listing needs one priceInr. The lowest and highest prices on this form are a range, and that range is not saved as the listing price or as a configuration price.",
    });
  }
  blockers.push({
    section: "preview",
    sectionNumber: 6,
    message: "No request publishes a listing. The draft stays a draft.",
  });
  return blockers;
}

export function priceWasNotCopied(patch: Record<string, unknown>): boolean {
  if ("priceInr" in patch || "priceMinInr" in patch || "priceMaxInr" in patch) return false;
  const configurations = patch.configurations;
  if (!Array.isArray(configurations)) return true;
  return configurations.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    return !("priceMinInr" in entry) && !("priceMaxInr" in entry);
  });
}
