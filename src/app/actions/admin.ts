"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SAMPLE_STAFF } from "@/lib/domain/identity";
import { getServices, listingStore, verificationStore } from "@/lib/services";
import { NOTIFICATION_RECORDED } from "@/lib/services/backend/admin-queue-reading";
import { decideKycApplication, moderateLiveProperty } from "@/lib/services/backend/admin-queues";

/**
 * Staff actions (A-04, A-06, A-09, A-19, A-20, A-23).
 *
 * Three things hold across every action in this file.
 *
 * **The actor is taken from the server, never from the request.** Each action
 * passes `SAMPLE_STAFF` — a constant this process owns — rather than reading a
 * staff id out of the form. That is the shape a real implementation needs (the
 * actor comes from the authenticated session), and it means no form field here
 * can name who acted. What the form *can* say is which record to act on, and
 * that is validated against the store before anything changes.
 *
 * **Refusals come back as values.** Every one of these can fail because the
 * person did not give a reason, and a reason is not something to throw about.
 * The store returns a result, the action returns it as form state, the screen
 * renders it beside the field.
 *
 * **Every mutation revalidates everything it can reach.** A verification
 * decision changes the KYC queue, the account, the dashboard tiles, the audit
 * log *and* the Seller or Builder console that account belongs to. Missing one
 * makes the join look broken when it is not.
 */

export type AdminFormState = {
  readonly error?: string;
  readonly done?: string;
};

function refreshAccountSurfaces(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/kyc");
  revalidatePath("/admin/audit");
  revalidatePath("/admin/wallets");
  revalidatePath("/admin/support");
  // The other consoles read the same account state. A decision that did not
  // refresh them would show a stale restriction banner to the person it was
  // taken about.
  revalidatePath("/seller", "layout");
  revalidatePath("/builder", "layout");
}

// --------------------------------------------------------- A-04 suspension --

export async function setSuspension(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const accountId = String(formData.get("accountId") ?? "");
  const suspended = formData.get("suspended") === "true";
  const reason = String(formData.get("reason") ?? "");
  const reasonCategory = String(formData.get("reasonCategory") ?? "") || undefined;

  const result = await getServices().admin.setSuspension({
    actor: SAMPLE_STAFF,
    accountId,
    suspended,
    reason,
    reasonCategory,
  });
  if (!result.ok) return { error: result.error };

  refreshAccountSurfaces();
  revalidatePath(`/admin/users/${accountId}`);
  return {
    done: suspended
      ? "Account suspended. Purchasing, downloads and publishing stop immediately; existing purchased leads and invoices stay available. Verification is recorded separately and was not changed."
      : "Account reinstated. Access is restored and the verification state is unchanged by either action — the suspension and this reinstatement both stay in the account history.",
  };
}

// ---------------------------------------------------- A-06 / A-07 decision --

export async function reviewDocument(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const documentKey = String(formData.get("documentKey") ?? "");
  const raw = String(formData.get("verdict") ?? "");
  if (raw !== "ok" && raw !== "problem") return;

  if (verificationStore() === "backend") return;

  await getServices().admin.setDocumentVerdict({ applicationId, documentKey, verdict: raw });
  revalidatePath(`/admin/kyc/${applicationId}`);
}

export async function toggleKycCheck(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const checkKey = String(formData.get("checkKey") ?? "");
  if (verificationStore() === "backend") return;
  await getServices().admin.toggleCheck({ applicationId, checkKey });
  revalidatePath(`/admin/kyc/${applicationId}`);
}

export async function decideApplication(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const raw = String(formData.get("decision") ?? "");
  if (raw !== "approved" && raw !== "rejected" && raw !== "resubmit") {
    return { error: "That decision was not recognised." };
  }

  const reason = String(formData.get("reason") ?? "");
  if (verificationStore() === "backend") {
    const result = await decideKycApplication({ reference: applicationId, decision: raw, reason });
    if (!result.ok) return { error: result.message };
    if (raw === "approved") {
      return { error: "Approval is not authorised. The case was not recorded as passed." };
    }
    refreshAccountSurfaces();
    revalidatePath(`/admin/kyc/${applicationId}`);
    revalidatePath("/admin/verification");
    return {
      done:
        raw === "rejected"
          ? "The case was recorded as failed and leaves the open queue. The reason is kept with the decision."
          : "The case stays open as needing more information. No document was collected.",
    };
  }

  const result = await getServices().admin.decideApplication({
    actor: SAMPLE_STAFF,
    applicationId,
    decision: raw,
    reason,
  });
  if (!result.ok) return { error: result.error };

  refreshAccountSurfaces();
  revalidatePath(`/admin/kyc/${applicationId}`);
  return {
    done:
      raw === "approved"
        ? "Verification approved. The account moves to approved — for a Builder that unlocks subscribing, and it does not publish anything on its own."
        : raw === "rejected"
          ? "Verification rejected. The account moves to rejected and the applicant sees your reason on their own verification screen."
          : "Resubmission requested. The account returns to pending with your message attached, and the applicant can upload again.",
  };
}

// ------------------------------------------------------------ A-09 listing --

export async function moderateListing(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const listingId = String(formData.get("listingId") ?? "");
  const raw = String(formData.get("action") ?? "");
  if (raw !== "unpublish" && raw !== "dismiss_report") {
    return { error: "That action was not recognised." };
  }

  const reason = String(formData.get("reason") ?? "");
  if (listingStore() === "backend") {
    const result = await moderateLiveProperty({ listingId, action: raw, reason });
    if (!result.ok) return { error: result.message };
    revalidatePath("/admin");
    revalidatePath("/admin/properties");
    revalidatePath(`/admin/properties/${listingId}`);
    return {
      done:
        raw === "unpublish"
          ? `The listing is unpublished. The reason is stored. ${NOTIFICATION_RECORDED}`
          : "Dismiss report is not a decided record. The listing was not changed by a successful takedown.",
    };
  }

  const result = await getServices().admin.moderateListing({
    actor: SAMPLE_STAFF,
    listingId,
    action: raw,
    reason,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${listingId}`);
  revalidatePath("/admin/audit");
  return {
    done:
      raw === "unpublish"
        ? "Listing unpublished. It is hidden from buyers, the builder is told why, and the action is in the audit log with your reason."
        : "Report dismissed. The listing stays exactly as published as it already was — dismissing a report is not an approval — the reporter is not told who reviewed it, and the decision is in the audit log.",
  };
}

// ------------------------------------------------------- A-19 adjustment --

export async function adjustCredits(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const accountId = String(formData.get("accountId") ?? "");
  const direction = formData.get("direction") === "debit" ? "debit" : "credit";
  const amount = Number(String(formData.get("amount") ?? "").replace(/[^0-9]/g, ""));

  const result = await getServices().admin.adjustCredits({
    actor: SAMPLE_STAFF,
    accountId,
    direction,
    amountInr: Number.isFinite(amount) ? amount : 0,
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/wallets");
  revalidatePath("/admin/audit");
  revalidatePath("/seller/billing", "layout");
  revalidatePath("/builder/billing", "layout");
  redirect(`/admin/wallets?adjusted=${encodeURIComponent(result.auditId)}`);
}

// ----------------------------------------------------------- A-20 refunds --

export async function decideRefund(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const refundId = String(formData.get("refundId") ?? "");
  const raw = String(formData.get("decision") ?? "");
  if (raw !== "approved" && raw !== "declined") {
    return { error: "That decision was not recognised." };
  }

  const result = await getServices().admin.decideRefund({
    actor: SAMPLE_STAFF,
    refundId,
    decision: raw,
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/audit");
  return {
    done:
      raw === "approved"
        ? "Approved, with your reason recorded in the audit log. Nothing has moved: whether a delivered lead qualifies at all, and whether a refund returns credits or reverses a payment, are both undecided (D-06). The decision is held until that rule exists."
        : "Declined. The requester is told the outcome and your reason. Nothing was moved and no ledger entry was written.",
  };
}

// ------------------------------------------------------------ A-23 support --

export async function replyToTicket(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const reference = String(formData.get("reference") ?? "");
  // The one form field here that changes where text ends up. Anything that is
  // not exactly "internal" is treated as a public reply — the safer default is
  // the one the user can see, because a staff note shown to a user is a leak
  // while a reply shown to staff is not.
  const internal = formData.get("mode") === "internal";

  const result = await getServices().admin.replyToTicket({
    actor: SAMPLE_STAFF,
    reference,
    body: String(formData.get("body") ?? ""),
    internal,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/admin/support/${reference}`);
  revalidatePath("/admin/support");
  revalidatePath("/seller/support", "layout");
  revalidatePath("/builder/support", "layout");
  return {
    done: internal
      ? "Internal note added. It stays in this console — the requester's own support thread has no field that could carry it."
      : "Reply sent. It is now in the requester's own support thread in their console.",
  };
}

export async function resolveTicket(
  _previous: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const reference = String(formData.get("reference") ?? "");
  const result = await getServices().admin.resolveTicket({
    actor: SAMPLE_STAFF,
    reference,
    reason: String(formData.get("reason") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/admin/support/${reference}`);
  revalidatePath("/admin/support");
  revalidatePath("/admin");
  revalidatePath("/admin/audit");
  revalidatePath("/seller/support", "layout");
  revalidatePath("/builder/support", "layout");
  return { done: "Ticket resolved, with your reason in the audit log." };
}
