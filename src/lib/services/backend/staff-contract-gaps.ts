/**
 * Fields the approved Admin screens need and the published contract does not
 * name. `docs/api/v1.yaml` `1.0.0-phase3.i`.
 *
 * While these are outstanding, `KKL_STAFF_ORDERS=backend` and
 * `KKL_INTAKE=backend` show the gap and do not paint sample rows in their
 * place. A handoff that names the missing fields is what closes them —
 * not a guess at `purchaserName` or a rejection's `row`.
 */

export const STAFF_ORDER_GAPS = [
  "GET /v1/orders lists the caller's own orders. No staff-wide list is published.",
  "Order publishes amountCredits and status pending, completed, failed or cancelled. It does not publish a purchaser name, an organisation, an INR amount, or a delivery-event list.",
  "POST /v1/orders/{orderId}/cancellation is published and needs an order id. This screen cannot choose one without the staff-wide list.",
] as const;

export const INTAKE_GAPS = [
  "POST /v1/leads/intake returns batchRef, submitted, and accepted, duplicates and rejected arrays. The items in those arrays have no published fields.",
  "GET /v1/leads/intake/rejections returns rejections as objects with no published fields, plus byReason. It does not name a row, a masked number, a field or a reason.",
  "No published path lists past runs with when they happened and their accepted, rejected and duplicate counts.",
] as const;
