import { ServiceError } from "@/lib/services/contracts";
import { isFrameworkSignal, callAs, bearerMode } from "./session";
import {
  ORDER_LIST_LIMIT,
  cancellationFailure,
  readStaffOrder,
  readStaffOrders,
  staffRefusal,
  type OrderStatus,
  type StaffOrder,
} from "./staff-views";

/**
 * Staff order queue against `GET /v1/orders?scope=all` and
 * `GET /v1/orders/{orderId}`.
 *
 * `scope=all` is refused for a non-staff session. That refusal is shown.
 * The development staff identity is not issued in its place when
 * `KKL_AUTH=backend`.
 */

export type StaffLoad<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string };

function refused(status: number, error: string | undefined, fallback: string): StaffLoad<never> {
  if (status === 403 && bearerMode() === "browser-session") {
    return { ok: false, message: staffRefusal(error) };
  }
  if (status === 403) return { ok: false, message: error ?? "This account cannot open that staff record." };
  return { ok: false, message: error ?? fallback };
}

function fail(error: unknown): StaffLoad<never> {
  if (isFrameworkSignal(error)) throw error;
  if (error instanceof ServiceError) return { ok: false, message: error.message };
  if (error instanceof Error && error.message) return { ok: false, message: error.message };
  return { ok: false, message: "Orders could not be loaded." };
}

export async function listStaffOrders(
  status: OrderStatus | null,
): Promise<StaffLoad<readonly StaffOrder[]>> {
  const query = new URLSearchParams({ scope: "all", limit: String(ORDER_LIST_LIMIT) });
  if (status) query.set("status", status);
  try {
    const { status: http, body } = await callAs<{ orders?: unknown; error?: string }>(
      "staff",
      `/v1/orders?${query.toString()}`,
    );
    if (http !== 200) {
      return refused(http, body.error, "Orders could not be loaded.");
    }
    return { ok: true, value: readStaffOrders(body) };
  } catch (error) {
    return fail(error);
  }
}

export async function getStaffOrder(id: string): Promise<StaffLoad<StaffOrder | null>> {
  try {
    const { status, body } = await callAs<{ error?: string }>(
      "staff",
      `/v1/orders/${encodeURIComponent(id)}`,
    );
    if (status === 404) return { ok: true, value: null };
    if (status !== 200) return refused(status, body.error, "That order could not be loaded.");
    return { ok: true, value: readStaffOrder(body) };
  } catch (error) {
    return fail(error);
  }
}

export async function cancelStaffOrder(
  id: string,
  reason: string,
): Promise<StaffLoad<StaffOrder>> {
  const trimmed = reason.trim();
  if (trimmed === "") {
    return { ok: false, message: "Record why this order was cancelled." };
  }
  try {
    const { status, body } = await callAs<{ error?: string; code?: string }>(
      "staff",
      `/v1/orders/${encodeURIComponent(id)}/cancellation`,
      { method: "POST", body: { reason: trimmed } },
    );
    if (status === 403 && bearerMode() === "browser-session") {
      return { ok: false, message: staffRefusal(body.error) };
    }
    if (status !== 200) return { ok: false, message: cancellationFailure(status, body) };
    const order = readStaffOrder(body);
    if (!order) return { ok: false, message: "The cancellation completed without an order to show." };
    return { ok: true, value: order };
  } catch (error) {
    return fail(error);
  }
}
