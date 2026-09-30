"use server";

import { redirect } from "next/navigation";
import { cancelStaffOrder } from "@/lib/services/backend/staff-orders";

/** Pending-order cancellation. The reason is required by the contract. */
export async function cancelPendingOrder(formData: FormData): Promise<void> {
  const id = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const back = `/admin/orders/${encodeURIComponent(id)}/delivery`;
  const result = await cancelStaffOrder(id, reason);
  if (!result.ok) {
    redirect(`${back}?cancelError=${encodeURIComponent(result.message)}`);
  }
  redirect(`${back}?cancelled=1`);
}
