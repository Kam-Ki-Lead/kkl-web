/**
 * The purchased-lead CSV (S-12, S-13), in one place.
 *
 * WHY THIS IS SHARED AND NOT TWO SERIALISERS
 * Sample mode had a working CSV in the seller store. With kkl-backend
 * connected the export threw `unavailable` and said so on screen, which was
 * honest while nothing had been built but is not a storage dependency and
 * never was — the route streams the body in its own response and no object
 * store is involved anywhere in it. Building a second serialiser for the
 * connected path is how the two modes come to disagree about what a
 * purchased-lead file looks like, so both now map to one row shape and call
 * this.
 *
 * Quoting is deliberate: a requirement line is free text, and a field
 * containing a comma, a quote or a newline has to survive the round trip.
 */

/** One row, independent of which service produced it. */
export type PurchasedExportRow = {
  readonly leadId: string;
  readonly orderReference: string;
  readonly purchasedAt: string;
  readonly requirement: string | null;
  readonly area: string | null;
  readonly configuration: string | null;
  readonly budgetBand: string | null;
  /** Null until the question-to-level mapping is confirmed. Not a zero. */
  readonly intentScore: number | null;
  readonly name: string | null;
  readonly mobile: string | null;
  readonly email: string | null;
  readonly bestTimeToCall: string | null;
  readonly creditsPaid: number | null;
};

const COLUMNS: ReadonlyArray<readonly [string, (row: PurchasedExportRow) => string | number | null]> = [
  ["Lead", (r) => r.leadId],
  ["Order", (r) => r.orderReference],
  ["Purchased", (r) => r.purchasedAt],
  ["Requirement", (r) => r.requirement],
  ["Area", (r) => r.area],
  ["Configuration", (r) => r.configuration],
  ["Budget band", (r) => r.budgetBand],
  ["Intent score", (r) => r.intentScore],
  ["Name", (r) => r.name],
  ["Mobile", (r) => r.mobile],
  ["Email", (r) => r.email],
  ["Best time to call", (r) => r.bestTimeToCall],
  ["Credits paid", (r) => r.creditsPaid],
];

function cell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function purchasedLeadsCsv(rows: readonly PurchasedExportRow[]): string {
  const lines = [COLUMNS.map(([heading]) => heading).join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map(([, read]) => cell(read(row))).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** The filename both modes use, so a reviewer gets the same file either way. */
export function purchasedLeadsFilename(now: Date = new Date()): string {
  return `kkl-purchased-leads-${now.toISOString().slice(0, 10)}.csv`;
}

export const PURCHASED_EXPORT_CONTENT_TYPE = "text/csv; charset=utf-8";
