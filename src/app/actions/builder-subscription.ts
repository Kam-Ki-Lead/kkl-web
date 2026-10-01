"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServices } from "@/lib/services";
import { profileStoreKind } from "@/lib/services/backend/config";
import type { SubscriptionOutcome } from "@/lib/services/contracts";

/**
 * Starting a subscription (B-03 → B-04).
 *
 * **No price is passed and none is charged.** D-01 leaves the subscription price
 * and billing cycle unset, so there is nothing to charge; a real implementation
 * takes the plan from kkl-backend and the money from a gateway, never from a
 * form field on this screen.
 *
 * The idempotency key is per-visit, for the same reason the Seller's lead
 * purchase carries one: a retried POST or a double-click must not start a second
 * subscription.
 */

const OUTCOME_COOKIE = "kkl_subscription_outcome";

export type SubscribeFormState = { readonly error?: string };

export async function startSubscription(
  _previous: SubscribeFormState,
  formData: FormData,
): Promise<SubscribeFormState> {
  if (profileStoreKind() === "backend") {
    return {
      error:
        "No subscription is stored for this account. Nothing was started, and no charge was made.",
    };
  }

  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(idempotencyKey)) {
    return {
      error: "This request could not be verified as a single attempt. Reload and try again.",
    };
  }

  const outcome = await getServices().builder.account.startSubscription({ idempotencyKey });

  // Held server-side. A query string would let anyone put ?result=active in the
  // address bar and see a success screen for a subscription that never started.
  const jar = await cookies();
  jar.set(OUTCOME_COOKIE, JSON.stringify(outcome), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  });

  revalidatePath("/builder");
  revalidatePath("/builder/subscription");
  redirect("/builder/subscription/payment");
}

export async function readSubscriptionOutcome(): Promise<SubscriptionOutcome | null> {
  const raw = (await cookies()).get(OUTCOME_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SubscriptionOutcome;
  } catch {
    return null;
  }
}

export async function newSubscriptionToken(): Promise<string> {
  return randomUUID();
}
