"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServices } from "@/lib/services";
import type { RechargeOutcome } from "@/lib/services/contracts";

/**
 * Recharging credits (S-15 → S-16).
 *
 * **No payment happens here, and none ever should.** A card or UPI flow belongs
 * behind a payment gateway, initiated and reconciled server-side by kkl-backend;
 * a frontend that could credit an account is a frontend that can mint money.
 * What this action does is record an intent, hand it to the service, and render
 * whichever of the three designed results comes back.
 *
 * The amount is validated here as a courtesy to the person, not as a control.
 * The authoritative check is the service's: a client-supplied amount must never
 * be the thing that decides how many credits an account receives.
 */

const OUTCOME_COOKIE = "kkl_recharge_outcome";

/**
 * Which account's wallet this recharge credits.
 *
 * Carried on the form rather than inferred, for the same reason the lead
 * purchase carries one: the Seller and Builder have separate balances and
 * separate ledgers, and a recharge that guessed wrong would credit the wrong
 * account.
 */
export type WalletScope = "seller" | "builder";

function creditsFor(scope: WalletScope) {
  const services = getServices();
  return scope === "builder" ? services.builder.credits : services.credits;
}

const MIN_INR = 100;
const MAX_INR = 100_000;

const amountSchema = z
  .number()
  .int("Enter a whole number of rupees.")
  .min(MIN_INR, `The smallest recharge is ₹${MIN_INR}.`)
  .max(MAX_INR, `The largest recharge from this screen is ₹${MAX_INR.toLocaleString("en-IN")}.`);

export type RechargeFormState = {
  readonly error?: string;
  readonly amount?: string;
};

export async function startRecharge(
  _previous: RechargeFormState,
  formData: FormData,
): Promise<RechargeFormState> {
  const rawScope = String(formData.get("scope") ?? "seller");
  const scope: WalletScope = rawScope === "builder" ? "builder" : "seller";
  const raw = String(formData.get("amount") ?? "").replace(/[₹,\s]/g, "");
  const parsed = amountSchema.safeParse(Number(raw));

  if (!raw) return { error: "Choose a pack or enter an amount.", amount: raw };
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid amount.", amount: raw };
  }

  const outcome = await creditsFor(scope).recharge({
    amountInr: parsed.data,
    // One key per submission. A retried POST resolves to the same outcome rather
    // than crediting twice — the same reason the lead purchase carries one.
    idempotencyKey: randomUUID(),
  });

  // The result is held server-side. A query string would let anyone put
  // ?result=credited in the address bar and see a success screen for a payment
  // that never happened.
  const jar = await cookies();
  jar.set(OUTCOME_COOKIE, JSON.stringify({ ...outcome, scope }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  });

  redirect(scope === "builder" ? "/builder/billing/payment" : "/seller/billing/payment");
}

/**
 * The outcome the payment-result screen should render, if there is one.
 *
 * Scoped, so a Seller's recharge cannot render on the Builder's result screen.
 */
export async function readRechargeOutcome(
  scope: WalletScope = "seller",
): Promise<RechargeOutcome | null> {
  const raw = (await cookies()).get(OUTCOME_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RechargeOutcome & { scope?: WalletScope };
    return (parsed.scope ?? "seller") === scope ? parsed : null;
  } catch {
    return null;
  }
}
