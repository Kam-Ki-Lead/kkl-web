"use server";

import { revalidatePath } from "next/cache";
import { getServices } from "@/lib/services";

/** P-16 — mark a single notification read. */
export async function markNotificationRead(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await getServices().notifications.markRead(id);
  revalidatePath("/account/notifications");
}

/** P-16 — mark everything read. */
export async function markAllNotificationsRead(): Promise<void> {
  await getServices().notifications.markAllRead();
  revalidatePath("/account/notifications");
}
