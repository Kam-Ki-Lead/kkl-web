/**
 * Pure readings of the phase 3.k order and intake payloads.
 *
 * Contract: kkl-backend `docs/api/v1.yaml` `1.0.0-phase3.k`
 * (commit c64967f79373534c2746c636d4111af8c25a4adf).
 * These functions do not call a server. The auth stand-in is a different
 * test, and it is not this one.
 *
 * List responses are `OrderPage` and `IntakeBatchPage`: `orders` or
 * `batches`, plus `total`, `offset` and `limit`. Intake items are
 * `IntakeAccepted`, `IntakeDuplicate`, `IntakeRejected` and `IntakeSkipped`.
 * A phone number is not on those schemas, and one present on a payload is
 * dropped.
 */

/** Published default page sizes. The maxima (500 and 200) are not a full list. */
export const ORDER_PAGE_SIZE = 100;
export const INTAKE_PAGE_SIZE = 50;

export const ORDER_STATUSES = ["pending", "completed", "failed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Approved-screen facts the order payload does not carry. */
export const ORDER_SCREEN_OMISSIONS = [
  "An order has no organisation.",
  "amountCredits is a credit count. It is not converted into an INR amount.",
  "An order has no delivery-event list.",
  "buyerDisplayName and leadReference are present on a list. A single-order read supplies lead and, when policy allows, contact. It does not guarantee buyerDisplayName.",
] as const;

/** Approved-screen facts the intake payload does not carry. */
export const INTAKE_SCREEN_OMISSIONS = [
  "A rejected item carries a row index and problems of code, field and reason. It carries no phone number, so none is shown.",
] as const;

export type PageWindow = {
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly returned: number;
};

/** A non-negative integer from the query string. Anything else is the first page. */
export function pageOffset(raw: string): number {
  if (!/^\d+$/.test(raw)) return 0;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : 0;
}

/** Next exists only when this page does not reach the unpaged total. */
export function hasNextPage(page: Pick<PageWindow, "offset" | "returned" | "total">): boolean {
  return page.offset + page.returned < page.total;
}

/** An offset past the end: an empty page and the same total, not an error. */
export function isPastEnd(page: PageWindow): boolean {
  return page.returned === 0 && page.total > 0 && page.offset >= page.total;
}

export function pageRangeLabel(page: PageWindow, noun: string): string {
  if (page.total === 0) return `0 ${noun}`;
  if (page.returned === 0) return `None of ${page.total} ${noun} are on this page`;
  const start = page.offset + 1;
  const end = page.offset + page.returned;
  return `${start}–${end} of ${page.total} ${noun}`;
}

export type StaffOrder = {
  readonly id: string;
  readonly reference: string | null;
  readonly leadReference: string | null;
  readonly buyerDisplayName: string | null;
  readonly amountCredits: number | null;
  readonly status: string | null;
  readonly failureReason: string | null;
  readonly createdAt: string | null;
  readonly completedAt: string | null;
  readonly cancelledAt: string | null;
  readonly cancelledBy: string | null;
  readonly accountId: string | null;
  readonly leadId: string | null;
  readonly lead: {
    readonly reference: string | null;
    readonly summary: string | null;
    readonly propertyType: string | null;
    readonly budgetBand: string | null;
    readonly locationName: string | null;
  } | null;
  readonly contact: {
    readonly fullName: string | null;
    readonly phone: string | null;
    readonly email: string | null;
  } | null;
};

export type IntakeCounts = {
  readonly batchRef: string;
  readonly source: string;
  readonly createdAt: string;
  readonly submitted: number;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly duplicateCount: number;
  readonly skippedCount: number;
};

export type IntakeProblem = {
  readonly code: string;
  readonly field: string | null;
  readonly reason: string;
};

export type IntakeAccepted = {
  readonly index: number;
  readonly id: string;
  readonly reference: string;
  readonly consentStatus: string;
};

export type IntakeDuplicate = {
  readonly index: number;
  readonly existingReference: string | null;
};

export type IntakeRejected = {
  readonly index: number;
  readonly problems: readonly IntakeProblem[];
};

export type IntakeSkipped = {
  readonly index: number;
  readonly reasonCode: string | null;
  readonly reason: string | null;
};

export type StaffOrderPage = PageWindow & {
  readonly orders: readonly StaffOrder[];
};

export type IntakeBatchPage = PageWindow & {
  readonly batches: readonly IntakeCounts[];
};

export type IntakeBatch = IntakeCounts & {
  readonly note: string | null;
  readonly accepted: readonly IntakeAccepted[];
  readonly duplicates: readonly IntakeDuplicate[];
  readonly rejected: readonly IntakeRejected[];
  readonly skipped: readonly IntakeSkipped[];
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function nonNegative(value: unknown): number | null {
  const parsed = integer(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

const INTAKE_SOURCES = ["manual", "web_form", "import", "partner", "voice"] as const;
const CONSENT = ["unknown", "granted", "refused", "withdrawn"] as const;

function oneOf(value: unknown, allowed: readonly string[]): string | null {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function readStaffOrder(value: unknown): StaffOrder | null {
  const row = record(value);
  const id = row ? text(row.id) : null;
  if (!row || !id) return null;
  const lead = record(row.lead);
  const contact = record(row.contact);
  return {
    id,
    reference: text(row.reference),
    leadReference: text(row.leadReference),
    buyerDisplayName: text(row.buyerDisplayName),
    amountCredits: integer(row.amountCredits),
    status: text(row.status),
    failureReason: text(row.failureReason),
    createdAt: text(row.createdAt),
    completedAt: text(row.completedAt),
    cancelledAt: text(row.cancelledAt),
    cancelledBy: text(row.cancelledBy),
    accountId: text(row.accountId),
    leadId: text(row.leadId),
    lead: lead
      ? {
        reference: text(lead.reference),
        summary: text(lead.summary),
        propertyType: text(lead.propertyType),
        budgetBand: text(lead.budgetBand),
        locationName: text(lead.locationName),
      }
      : null,
    contact: contact
      ? {
        fullName: text(contact.fullName),
        phone: text(contact.phone),
        email: text(contact.email),
      }
      : null,
  };
}

function readList(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

export function readStaffOrderPage(value: unknown): StaffOrderPage | null {
  const body = record(value);
  if (!body || !Array.isArray(body.orders)) return null;
  const total = nonNegative(body.total);
  const offset = nonNegative(body.offset);
  const limit = nonNegative(body.limit);
  if (total === null || offset === null || limit === null) return null;
  return {
    orders: body.orders.flatMap((order) => {
      const read = readStaffOrder(order);
      return read ? [read] : [];
    }),
    total,
    offset,
    limit,
    returned: body.orders.length,
  };
}

function counts(row: Record<string, unknown>, batchRef: string): IntakeCounts | null {
  const source = oneOf(row.source, INTAKE_SOURCES);
  const createdAt = text(row.createdAt);
  const submitted = nonNegative(row.submitted);
  const acceptedCount = nonNegative(row.acceptedCount);
  const rejectedCount = nonNegative(row.rejectedCount);
  const duplicateCount = nonNegative(row.duplicateCount);
  const skippedCount = nonNegative(row.skippedCount);
  if (
    source === null || createdAt === null || submitted === null || acceptedCount === null
    || rejectedCount === null || duplicateCount === null || skippedCount === null
  ) return null;
  return {
    batchRef,
    source,
    createdAt,
    submitted,
    acceptedCount,
    rejectedCount,
    duplicateCount,
    skippedCount,
  };
}

export function readIntakeBatchSummary(value: unknown): IntakeCounts | null {
  const row = record(value);
  const batchRef = row ? text(row.batchRef) : null;
  if (!row || !batchRef) return null;
  return counts(row, batchRef);
}

export function readIntakeBatchPage(value: unknown): IntakeBatchPage | null {
  const body = record(value);
  if (!body || !Array.isArray(body.batches)) return null;
  const total = nonNegative(body.total);
  const offset = nonNegative(body.offset);
  const limit = nonNegative(body.limit);
  if (total === null || offset === null || limit === null) return null;
  return {
    batches: body.batches.flatMap((batch) => {
      const read = readIntakeBatchSummary(batch);
      return read ? [read] : [];
    }),
    total,
    offset,
    limit,
    returned: body.batches.length,
  };
}

function problemsOf(value: unknown): readonly IntakeProblem[] | null {
  if (!Array.isArray(value)) return null;
  const problems: IntakeProblem[] = [];
  for (const item of value) {
    const row = record(item);
    const code = row ? text(row.code) : null;
    const reason = row ? text(row.reason) : null;
    if (!row || code === null || reason === null) return null;
    problems.push({ code, field: text(row.field), reason });
  }
  return problems;
}

export function readAcceptedItem(value: unknown): IntakeAccepted | null {
  const row = record(value);
  const index = row ? nonNegative(row.index) : null;
  const id = row ? text(row.id) : null;
  const reference = row ? text(row.reference) : null;
  const consentStatus = row ? oneOf(row.consentStatus, CONSENT) : null;
  if (index === null || id === null || reference === null || consentStatus === null) return null;
  return { index, id, reference, consentStatus };
}

export function readDuplicateItem(value: unknown): IntakeDuplicate | null {
  const row = record(value);
  const index = row ? nonNegative(row.index) : null;
  if (!row || index === null) return null;
  return { index, existingReference: text(row.existingReference) };
}

export function readRejectedItem(value: unknown): IntakeRejected | null {
  const row = record(value);
  const index = row ? nonNegative(row.index) : null;
  const problems = row ? problemsOf(row.problems) : null;
  if (index === null || problems === null) return null;
  return { index, problems };
}

export function readSkippedItem(value: unknown): IntakeSkipped | null {
  const row = record(value);
  const index = row ? nonNegative(row.index) : null;
  if (!row || index === null) return null;
  return { index, reasonCode: text(row.reasonCode), reason: text(row.reason) };
}

export function readIntakeBatch(value: unknown): IntakeBatch | null {
  const row = record(value);
  const batchRef = row ? text(row.batchRef) : null;
  if (!row || !batchRef) return null;
  const header = counts(row, batchRef);
  if (!header) return null;
  const list = <T>(raw: unknown, read: (item: unknown) => T | null): readonly T[] =>
    readList(raw).flatMap((item) => {
      const parsed = read(item);
      return parsed ? [parsed] : [];
    });
  return {
    ...header,
    note: text(row.note),
    accepted: list(row.accepted, readAcceptedItem),
    duplicates: list(row.duplicates, readDuplicateItem),
    rejected: list(row.rejected, readRejectedItem),
    skipped: list(row.skipped, readSkippedItem),
  };
}

export function formatCredits(amount: number): string {
  return `${amount.toLocaleString("en-IN")} credits`;
}

export function orderStatusLabel(status: string | null): string {
  if (status === "pending") return "Pending";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  return status ?? "Unknown";
}

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * A cancellation that the service refused. The sentence is the one the
 * service sent. The fallbacks cover an empty body.
 */
export function cancellationFailure(
  status: number,
  body: { error?: unknown; code?: unknown },
): string {
  const error = text(body.error);
  if (error) return error;
  const code = text(body.code);
  if (status === 409 && code === "order_already_completed") {
    return "That purchase has completed. Cancelling it would mean returning credits, and that path is not configured.";
  }
  if (status === 409 && code === "order_not_pending") {
    return "Only a pending order can be cancelled.";
  }
  if (status === 422) return "Record why this order was cancelled.";
  if (status === 403) return "This account cannot cancel that order.";
  if (status === 404) return "That order could not be found.";
  if (status === 409) return "That order could not be cancelled.";
  return "The cancellation could not be completed.";
}

export function staffRefusal(error: string | undefined): string {
  const sentence = error && error.trim() !== ""
    ? error
    : "This account cannot open that staff record.";
  return `${sentence} The signed-in session is the only identity this screen will use.`;
}
