import type { ListingDraft, ListingSectionId, ListingSectionState, PublishBlocker } from "@/lib/domain/types";

/**
 * The approved builder editor and the published listing record do not share a
 * price.
 *
 * The editor collects configuration names (1–5 BHK) and one project range:
 * priceMinInr and priceMaxInr. The range is stored on those two fields.
 * It is not copied into the listing priceInr and it is not split across
 * configurations. A configuration keeps its own priceInr, areaSqft and
 * available count. Echoing those values writes the same numbers back;
 * leaving one out would also keep it, and sending null would clear it.
 * A configuration the checkboxes cannot represent is kept as it was stored.
 * Amenities are the labels the form already offers. There is no extra list.
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

/**
 * Names the checkboxes still select, in the order already stored.
 *
 * `sort_order` is not a field on the published configuration object. The
 * write assigns it from the array position, and a read comes back in that
 * order. Keeping the stored order keeps the sort. A newly checked name is
 * appended. An unchecked 1–5 BHK name is left out. Any other stored name
 * stays, with its price, area and availability.
 */
export function configurationPayload(
  selectedTokens: readonly string[],
  existing: readonly StoredConfiguration[],
): ConfigurationWrite[] {
  const selected = new Set(
    selectedTokens
      .map((token) => (typeof token === "string" ? configurationName(token) : null))
      .filter((name): name is string => name !== null),
  );
  const written: ConfigurationWrite[] = [];
  const seen = new Set<string>();
  for (const entry of existing) {
    const name = entry.configuration?.trim();
    if (!name || seen.has(name)) continue;
    if (STORED_NAME.test(name) && !selected.has(name)) continue;
    written.push(echo(name, entry));
    seen.add(name);
  }
  for (const name of selected) {
    if (seen.has(name)) continue;
    written.push(echo(name, undefined));
    seen.add(name);
  }
  return written;
}

const NOT_ON_LISTING: Record<string, readonly { key: string; label: string }[]> = {
  basics: [{ key: "possessionTarget", label: "Possession target" }],
  specifications: [
    { key: "areaMin", label: "Smallest carpet area" },
    { key: "areaMax", label: "Largest carpet area" },
    { key: "reraRegistered", label: "RERA registered" },
  ],
  media: [
    { key: "photos", label: "Photographs" },
    { key: "photoCount", label: "Photograph count" },
    { key: "videoUrl", label: "Video link" },
  ],
};

function filled(value: unknown): boolean {
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "boolean") return value;
  return false;
}

/** Labels for values the form sent that this section does not write. */
export function fieldsNotStored(section: string, values: Readonly<Record<string, unknown>>): string[] {
  return (NOT_ON_LISTING[section] ?? [])
    .filter((field) => filled(values[field.key]))
    .map((field) => field.label);
}

/**
 * What a save may say. Media writes nothing, so it never reports a saved draft.
 * A section that did write says so, and names any value that was left out.
 */
export function sectionSaveMessage(section: string, omitted: readonly string[]): string {
  if (section === "media") {
    return "Photographs, the photograph count and the video link were not stored.";
  }
  if (omitted.length === 0) return "Draft saved.";
  return `Saved. Not stored: ${omitted.join(", ")}.`;
}

/**
 * All returns every status the list returned, including published.
 * A named tab returns only rows whose status is that name.
 */
export function listingsMatchingStatus<T extends { status?: string | null }>(
  listings: readonly T[],
  status?: string,
): T[] {
  if (!status) return [...listings];
  return listings.filter((listing) => listing.status === status);
}

export function listingListPresentation(status: string | undefined): {
  status: ListingDraft["status"];
  recordStatus: string;
  detailLine: string;
} {
  const recordStatus = status && status.trim() !== "" ? status : "draft";
  if (recordStatus === "published") {
    return {
      status: "published",
      recordStatus,
      detailLine: "Published on the record. This screen does not publish or unpublish.",
    };
  }
  if (recordStatus === "unpublished") {
    return {
      status: "unpublished",
      recordStatus,
      detailLine: "Unpublished on the record. This screen does not republish.",
    };
  }
  if (recordStatus === "draft") {
    return {
      status: "draft",
      recordStatus,
      detailLine: "Draft. Nothing on this screen publishes it.",
    };
  }
  return {
    status: "draft",
    recordStatus,
    detailLine: `Record status: ${recordStatus}. This screen does not publish it.`,
  };
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

/** A whole-rupee amount, including zero, so the service can refuse a zero. */
function rupeeAmount(value: unknown): number | null | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return undefined;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

/** Fields this section may write. The range is its own pair of fields. */
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
    const patch: Record<string, unknown> = {};
    if (Array.isArray(values.configurations)) {
      patch.configurations = configurationPayload(
        values.configurations.filter((token): token is string => typeof token === "string"),
        existing,
      );
    }
    const lowest = rupeeAmount(values.priceMinInr);
    const highest = rupeeAmount(values.priceMaxInr);
    if (lowest !== undefined) patch.priceMinInr = lowest;
    if (highest !== undefined) patch.priceMaxInr = highest;
    return patch;
  }
  if (section === "specifications") {
    const patch: Record<string, unknown> = {};
    const totalUnits = positiveInteger(values.totalUnits);
    if (totalUnits !== undefined) patch.totalUnits = totalUnits;
    const reraNumber = text(values.reraNumber);
    if (reraNumber !== undefined) patch.reraId = reraNumber.trim() === "" ? null : reraNumber.trim();
    if (Array.isArray(values.amenities)) {
      patch.amenities = values.amenities
        .filter((label): label is string => typeof label === "string")
        .map((label) => label.trim())
        .filter((label) => label !== "");
    }
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
  priceMinInr?: number | null;
  priceMaxInr?: number | null;
  amenities?: readonly string[] | null;
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
    priceMinInr: wholeNumber(body.priceMinInr ?? null) ?? null,
    priceMaxInr: wholeNumber(body.priceMaxInr ?? null) ?? null,
    listingPriceInr: wholeNumber(body.priceInr ?? null) ?? null,
    configurationPrices,
    areaMin: "",
    areaMax: "",
    totalUnits: body.totalUnits == null ? "" : String(body.totalUnits),
    amenities: (body.amenities ?? []).filter((label): label is string => typeof label === "string"),
    reraRegistered: false,
    reraNumber: body.reraId ?? null,
    media: [],
    videoUrl: null,
    publishedAt: null,
    updatedAt: body.updatedAt ?? "",
    enquiryCount: null,
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
        "The listing needs one priceInr. The lowest and highest prices are stored as the project range and are not used as that price or as a configuration price.",
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
  if ("priceInr" in patch) return false;
  const configurations = patch.configurations;
  if (!Array.isArray(configurations)) return true;
  return configurations.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    return !("priceMinInr" in entry) && !("priceMaxInr" in entry);
  });
}
