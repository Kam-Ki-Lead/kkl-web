/**
 * Whether a listing photograph counts.
 *
 * The backend counts an owner photograph only when the row is stored and its
 * availability is `available`. A selected filename, a declared record, an
 * unavailable record, and a row with a missing or unexpected availability do
 * not. This is the only predicate the owner steps, summaries, cards and staff
 * screens use for that count.
 */
export type PhotographRow = {
  readonly id: string;
  readonly retained?: boolean;
  readonly availability?: string | null;
};

export function isStoredPhotograph(photo: {
  readonly retained?: boolean;
  readonly availability?: string | null;
}): boolean {
  return photo.retained === true && photo.availability === "available";
}

export function storedPhotographCount(photos: readonly PhotographRow[]): number {
  return photos.filter((photo) => isStoredPhotograph(photo)).length;
}

/**
 * The cover is the first stored photograph.
 *
 * A sample preview may still label the first chosen name, and only when no
 * row carries an availability. That label is a chosen name, not a stored
 * cover. Declared, unavailable, and missing-availability rows never receive it.
 */
export function photographCover(photos: readonly PhotographRow[]):
  | { readonly role: "stored"; readonly id: string }
  | { readonly role: "sample-name"; readonly id: string }
  | { readonly role: "none" } {
  const stored = photos.find((photo) => isStoredPhotograph(photo));
  if (stored) return { role: "stored", id: stored.id };
  const carriesAvailability = photos.some(
    (photo) => photo.availability !== undefined && photo.availability !== null,
  );
  const first = photos[0];
  if (!carriesAvailability && first) return { role: "sample-name", id: first.id };
  return { role: "none" };
}

export function coverBadge(
  photo: PhotographRow,
  photos: readonly PhotographRow[],
): "stored" | "sample-name" | null {
  const cover = photographCover(photos);
  if (cover.role === "none" || cover.id !== photo.id) return null;
  return cover.role;
}

/** What one row is. A missing availability is not described as declared or stored. */
export function photographRecordLabel(photo: {
  readonly retained?: boolean;
  readonly availability?: string | null;
}): string {
  if (isStoredPhotograph(photo)) return "stored";
  if (photo.availability === "declared") return "name, type and size recorded · not uploaded";
  if (photo.availability === "unavailable") return "not available · not uploaded";
  return "not stored";
}

/**
 * Owner step ticks. Backend rows count only through `isStoredPhotograph`.
 * Sample rows with no availability still count a chosen name, which is the
 * sample editor's own record and not a stored photograph.
 */
export function photographStepComplete(
  photos: readonly PhotographRow[],
  mode: "sample" | "backend",
): boolean {
  if (mode === "backend" || photos.some((photo) => photo.availability != null)) {
    return storedPhotographCount(photos) > 0;
  }
  return photos.length > 0;
}

export function ownerPhotographLine(
  photos: readonly PhotographRow[],
  mode: "sample" | "backend",
): string {
  const stored = storedPhotographCount(photos);
  if (stored === 1) return "1 stored";
  if (stored > 1) return `${stored} stored`;
  if (photos.length === 0) return "None";
  if (mode === "backend" || photos.some((photo) => photo.availability != null)) {
    return photos.length === 1
      ? "None stored · 1 file record, not uploaded"
      : `None stored · ${photos.length} file records, not uploaded`;
  }
  return `${photos.length} chosen · files not stored in this build`;
}

export function staffPhotographLabel(photos: readonly PhotographRow[]): string {
  if (photos.length === 0) return "no photographs";
  if (photos.every((photo) => photo.availability == null)) {
    return photos.length === 1 ? "1 photograph" : `${photos.length} photographs`;
  }
  const stored = storedPhotographCount(photos);
  if (stored === 0) {
    return photos.length === 1
      ? "1 file record, not uploaded"
      : `${photos.length} file records, not uploaded`;
  }
  return stored === 1 ? "1 stored" : `${stored} stored`;
}

export function staffPhotographSubtitle(photos: readonly PhotographRow[]): string {
  if (photos.length === 0) return "None on this listing";
  if (photos.every((photo) => photo.availability == null)) {
    return `${photos.length} chosen by the owner`;
  }
  const stored = storedPhotographCount(photos);
  if (stored > 0) return stored === 1 ? "1 stored" : `${stored} stored`;
  return photos.length === 1
    ? "1 file record, not uploaded"
    : `${photos.length} file records, not uploaded`;
}

const KNOWN_AVAILABILITY = new Set(["declared", "unavailable", "available"]);

/**
 * One media row from the listing API. `retained` keeps the API `stored` bit.
 * It becomes a photograph only when availability is also `available`.
 * An unknown availability is left unset. A non-image is omitted.
 */
export function imageFromMedia(row: {
  readonly id?: unknown;
  readonly kind?: unknown;
  readonly fileName?: unknown;
  readonly byteSize?: unknown;
  readonly stored?: unknown;
  readonly availability?: unknown;
}): { id: string; fileName: string; sizeLabel: string; retained: boolean; availability?: "declared" | "unavailable" | "available" } | null {
  if (row.kind !== "image") return null;
  if (typeof row.id !== "string" || row.id.trim() === "") return null;
  const availability = typeof row.availability === "string" && KNOWN_AVAILABILITY.has(row.availability)
    ? row.availability as "declared" | "unavailable" | "available"
    : undefined;
  const byteSize = typeof row.byteSize === "number" && Number.isInteger(row.byteSize) && row.byteSize > 0
    ? row.byteSize
    : null;
  return {
    id: row.id,
    fileName: typeof row.fileName === "string" && row.fileName.trim() !== "" ? row.fileName : "Unnamed file",
    sizeLabel: byteSize === null
      ? "size unknown"
      : byteSize >= 1024 * 1024
        ? `${(byteSize / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(byteSize / 1024))} KB`,
    retained: row.stored === true,
    ...(availability === undefined ? {} : { availability }),
  };
}

export type MediaDeclaration = {
  readonly fileName: string;
  readonly byteSize: number;
  readonly contentType: string;
};

function declarationKey(row: MediaDeclaration): string {
  return `${row.fileName}\0${row.byteSize}\0${row.contentType.trim().toLowerCase()}`;
}

/**
 * Declarations already on the draft are not posted again. A repeated save of
 * the same name, type and size stays one row. A different size is a new record.
 */
export function declarationsToAdd(
  existing: readonly MediaDeclaration[],
  incoming: readonly MediaDeclaration[],
): MediaDeclaration[] {
  const seen = new Set(existing.map(declarationKey));
  const added: MediaDeclaration[] = [];
  for (const row of incoming) {
    const key = declarationKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    added.push(row);
  }
  return added;
}
