import type { BuilderAccount } from "@/lib/domain/types";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import { callAs } from "./session";
import { builderProfilePatch, readBuilderAlerts } from "./alert-preferences";
import { builderProfileView } from "./builder-profile-reading";

/**
 * The signed-in builder's profile, for B-24.
 *
 * Contact name writes the account display name. Company name writes
 * companyName. Email writes contactEmail. The profile full name, RERA
 * registration is not sent. Alert choices are the builder keys when the
 * form submitted them. Consent opt-ins are not sent.
 */

type BackendProfile = {
  accountId?: string;
  fullName: string | null;
  displayName?: string | null;
  companyName: string | null;
  signInPhone: string | null;
  contactEmail?: string | null;
  status?: string | null;
  alerts?: {
    newEnquiry?: boolean;
    siteVisitRequest?: boolean;
    subscriptionReminders?: boolean;
    delivery?: { available?: boolean } | null;
  } | null;
  error?: string;
  field?: string;
};

export type BuilderProfileReading = {
  readonly account: BuilderAccount;
  readonly profileFullName: string | null;
  readonly accountStatus: "active" | "suspended" | null;
  readonly alertsWritable: boolean;
  readonly deliveryAvailable: boolean;
};

function asReading(body: BackendProfile): BuilderProfileReading {
  const view = builderProfileView(body);
  const alerts = readBuilderAlerts(body.alerts);
  return {
    profileFullName: view.profileFullName,
    accountStatus: view.accountStatus,
    alertsWritable: alerts.writable,
    deliveryAvailable: alerts.deliveryAvailable,
    account: {
      id: view.id,
      contactName: view.contactName,
      companyName: view.companyName,
      mobile: view.mobile,
      email: view.email,
      reraId: null,
      kycStatus: "not_submitted",
      accountStatus: view.accountStatus ?? "active",
      subscription: { state: "none", startedAt: null, renewsAt: null, priceInr: null },
      alerts: alerts.choices,
    },
  };
}

export async function readBuilderProfile(): Promise<BuilderProfileReading> {
  const { status, body } = await callAs<BackendProfile>("builder", "/v1/me/profile");
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to read this profile.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The profile service returned ${status}.`);
  }
  return asReading(body);
}

export async function writeBuilderProfile(input: {
  contactName: string;
  companyName: string;
  email: string | null;
  alerts?: {
    newEnquiry: boolean;
    siteVisitRequest: boolean;
    subscriptionReminders: boolean;
  };
}): Promise<BuilderProfileReading> {
  const { status, body } = await callAs<BackendProfile>("builder", "/v1/me/profile", {
    method: "PATCH",
    body: builderProfilePatch(input),
  });
  if (status === 422) {
    const field =
      body.field === "companyName"
        ? "companyName"
        : body.field === "displayName"
          ? "contactName"
          : body.field === "contactEmail"
            ? "email"
            : "form";
    throw new ValidationError({ [field]: body.error ?? "This value was not accepted." });
  }
  if (status === 401) throw new ServiceError("unauthenticated", "Sign in to save this profile.");
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The profile service returned ${status}.`);
  }
  return asReading(body);
}
