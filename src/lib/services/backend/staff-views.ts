/**
 * Pure readings of the phase 3.j order and intake payloads.
 *
 * Contract: kkl-backend `docs/api/v1.yaml` `1.0.0-phase3.j`
 * (commit 6f4bd9163a74f99cdef2341167edcf05651b0c19).
 * Item objects on an intake batch are published as objects. The keys read
 * here are the ones the implementation writes (b3bafd9 `shapeResult`):
 * index, id, reference, consentStatus, existingReference, reasonCode,
 * reason, and problems of code, field and reason. A phone number is not
 * among them, and one present on a payload is dropped.
 */

export const ORDER_LIST_LIMIT = 500;
export const INTAKE_BATCH_LIMIT = 200;

export const ORDER_STATUSES = ["pending", "completed", "failed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Approved-screen facts the order payload does not carry. */
export const ORDER_SCREEN_OMISSIONS = [
  "An order has no organisation.",
  "amountCredits is a credit count. It is not converted into an INR amount.",
  "An order has no delivery-event list.",
  "buyerDisplayName is present on the list. The detail read supplies lead.reference, contact when the policy returns it, and the cancellation fields.",
] as const;

/** Approved-screen facts the intake payload does not carry. */
export const INTAKE_SCREEN_OMISSIONS = [
  "A rejected item carries a row index and problem codes, fields and reasons. It carries no phone number, so none is shown.",
  "GET /v1/leads/intake/batches takes limit, default 50 and maximum 200. It publishes no offset and no cursor.",
  "GET /v1/orders takes limit, default 100 and maximum 500. It publishes no offset and no cursor.",
] as const;

export function pageCapNote(returned: number, limit: number): string | null {
  if (returned < limit) return null;
  return `The service returned ${limit} rows, which is its maximum page. It publishes no offset, so this screen cannot tell whether older rows exist.`;
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
  readonly source: string | null;
  readonly createdAt: string | null;
  readonly submitted: number | null;
  readonly acceptedCount: number | null;
  readonly rejectedCount: number | null;
  readonly duplicateCount: number | null;
  readonly skippedCount: number | null;
};

export type IntakeProblem = {
  readonly code: string | null;
  readonly field: string | null;
  readonly reason: string | null;
};

export type IntakeAccepted = {
  readonly index: number | null;
  readonly id: string | null;
  readonly reference: string | null;
  readonly consentStatus: string | null;
};

export type IntakeDuplicate = {
  readonly index: number | null;
  readonly existingReference: string | null;
};

export type IntakeRejected = {
  readonly index: number | null;
  readonly problems: readonly IntakeProblem[];
};

export type IntakeSkipped = {
  readonly index: number | null;
  readonly reasonCode: string | null;
  readonly reason: string | null;
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

function indexOf(value: unknown): number | null {
  return integer(value);
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

export function readStaffOrders(value: unknown): readonly StaffOrder[] {
  const body = record(value);
  const orders = body && Array.isArray(body.orders) ? body.orders : [];
  return orders.flatMap((order) => {
    const read = readStaffOrder(order);
    return read ? [read] : [];
  });
}

function counts(row: Record<string, unknown>, batchRef: string): IntakeCounts {
  return {
    batchRef,
    source: text(row.source),
    createdAt: text(row.createdAt),
    submitted: integer(row.submitted),
    acceptedCount: integer(row.acceptedCount),
    rejectedCount: integer(row.rejectedCount),
    duplicateCount: integer(row.duplicateCount),
    skippedCount: integer(row.skippedCount),
  };
}

export function readIntakeBatchSummary(value: unknown): IntakeCounts | null {
  const row = record(value);
  const batchRef = row ? text(row.batchRef) : null;
  if (!row || !batchRef) return null;
  return counts(row, batchRef);
}

export function readIntakeBatchList(value: unknown): readonly IntakeCounts[] {
  const body = record(value);
  const batches = body && Array.isArray(body.batches) ? body.batches : [];
  return batches.flatMap((batch) => {
    const read = readIntakeBatchSummary(batch);
    return read ? [read] : [];
  });
}

function problemsOf(value: unknown): readonly IntakeProblem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = record(item);
    if (!row) return [];
    return [{
      code: text(row.code),
      field: text(row.field),
      reason: text(row.reason),
    }];
  });
}

export function readAcceptedItem(value: unknown): IntakeAccepted | null {
  const row = record(value);
  if (!row) return null;
  return {
    index: indexOf(row.index),
    id: text(row.id),
    reference: text(row.reference),
    consentStatus: text(row.consentStatus),
  };
}

export function readDuplicateItem(value: unknown): IntakeDuplicate | null {
  const row = record(value);
  if (!row) return null;
  return {
    index: indexOf(row.index),
    existingReference: text(row.existingReference),
  };
}

export function readRejectedItem(value: unknown): IntakeRejected | null {
  const row = record(value);
  if (!row) return null;
  return {
    index: indexOf(row.index),
    problems: problemsOf(row.problems),
  };
}

export function readSkippedItem(value: unknown): IntakeSkipped | null {
  const row = record(value);
  if (!row) return null;
  return {
    index: indexOf(row.index),
    reasonCode: text(row.reasonCode),
    reason: text(row.reason),
  };
}

export function readIntakeBatch(value: unknown): IntakeBatch | null {
  const row = record(value);
  const batchRef = row ? text(row.batchRef) : null;
  if (!row || !batchRef) return null;
  const list = <T>(raw: unknown, read: (item: unknown) => T | null): readonly T[] =>
    Array.isArray(raw) ? raw.flatMap((item) => {
      const parsed = read(item);
      return parsed ? [parsed] : [];
    }) : [];
  return {
    ...counts(row, batchRef),
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
