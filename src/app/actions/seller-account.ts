"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServices } from "@/lib/services";
import { profileStoreKind } from "@/lib/services/backend/config";
import { writeSellerBilling, writeSellerProfile } from "@/lib/services/backend/seller-profile";
import { BUSINESS_NOT_ON_PROFILE } from "@/lib/services/backend/seller-profile-reading";
import { ValidationError } from "@/lib/services/contracts";
import type { BillingDetails, SellerAccount } from "@/lib/domain/types";

/**
 * Seller account writes: business details (S-02), billing (S-21), profile (S-25).
 *
 * Validation runs on the server, so it holds whether or not the browser ran any
 * of it. None of these actions changes what the account may do — verification
 * and suspension are administrator decisions, taken in kkl-backend, and there is
 * deliberately no action here that could set either.
 */

export type AccountFormState = {
  readonly status: "idle" | "saved";
  readonly errors?: Readonly<Record<string, string>>;
  readonly values?: Readonly<Record<string, string>>;
};

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const gstinField = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => v === "" || GSTIN.test(v), {
    // The format is checkable, so it is checked. Whether GST invoicing is
    // mandatory is a separate, open question (D-13) and is not enforced here.
    message: "That is not a valid 15-character GSTIN. Leave it blank if you do not have one.",
  });

const businessSchema = z.object({
  agencyName: z.string().trim().min(2, "Enter the name that should appear on invoices."),
  businessType: z.enum(["individual_broker", "proprietorship", "partnership", "private_limited"]),
  areas: z.array(z.string().trim().min(1)).min(1, "Choose at least one area you work in."),
  gstin: gstinField,
});

const billingSchema = z.object({
  billingName: z.string().trim().min(2, "Enter the name to bill."),
  gstin: gstinField,
  address: z.string().trim().min(6, "Enter the billing address."),
  invoiceEmail: z
    .string()
    .trim()
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email address, or leave it blank.",
    }),
  contactName: z.string().trim(),
});

const profileSchema = z.object({
  contactName: z.string().trim().min(2, "Enter the name support should use."),
  agencyName: z.string().trim().min(2, "Enter your agency or trading name."),
});

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function saveBusinessDetails(
  _previous: AccountFormState,
  _formData: FormData,
): Promise<AccountFormState> {
  if (profileStoreKind() === "backend") {
    return { status: "idle", errors: { form: BUSINESS_NOT_ON_PROFILE } };
  }
  const formData = _formData;
  const raw = {
    agencyName: String(formData.get("agencyName") ?? ""),
    businessType: String(formData.get("businessType") ?? "proprietorship"),
    areas: formData.getAll("areas").map(String),
    gstin: String(formData.get("gstin") ?? ""),
  };

  const parsed = businessSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      status: "idle",
      errors: fieldErrors(parsed.error),
      values: { agencyName: raw.agencyName, businessType: raw.businessType, gstin: raw.gstin },
    };
  }

  await getServices().sellerAccount.saveBusiness({
    agencyName: parsed.data.agencyName,
    businessType: parsed.data.businessType,
    areas: parsed.data.areas,
    gstin: parsed.data.gstin === "" ? null : parsed.data.gstin,
  });
  revalidatePath("/seller/onboarding");
  return { status: "saved" };
}

export type BillingFormState = AccountFormState & { readonly saved?: BillingDetails };

export async function saveBilling(
  _previous: BillingFormState,
  formData: FormData,
): Promise<BillingFormState> {
  const raw = {
    billingName: String(formData.get("billingName") ?? ""),
    gstin: String(formData.get("gstin") ?? ""),
    address: String(formData.get("address") ?? ""),
    invoiceEmail: String(formData.get("invoiceEmail") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
  };

  const parsed = billingSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "idle", errors: fieldErrors(parsed.error), values: raw };
  }

  const details = {
    billingName: parsed.data.billingName,
    gstin: parsed.data.gstin === "" ? null : parsed.data.gstin,
    // One textarea, split on newlines, so an address keeps the shape it was
    // typed in rather than being flattened onto one invoice line.
    addressLines: parsed.data.address
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    invoiceEmail: parsed.data.invoiceEmail === "" ? null : parsed.data.invoiceEmail,
    contactName: parsed.data.contactName === "" ? null : parsed.data.contactName,
  };
  if (profileStoreKind() === "backend") {
    try {
      const saved = await writeSellerBilling(details);
      revalidatePath("/seller/billing/details");
      return { status: "saved", saved };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: "idle", errors: error.fields, values: raw };
      }
      throw error;
    }
  }
  const saved = await getServices().sellerAccount.saveBillingDetails(details);

  revalidatePath("/seller/billing/details");
  return { status: "saved", saved };
}

export type ProfileFormState = AccountFormState & { readonly saved?: SellerAccount };

export async function saveSellerProfile(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const raw = {
    contactName: String(formData.get("contactName") ?? ""),
    agencyName: String(formData.get("agencyName") ?? ""),
  };

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "idle", errors: fieldErrors(parsed.error), values: raw };
  }

  if (profileStoreKind() === "backend") {
    try {
      const saved = await writeSellerProfile(parsed.data);
      revalidatePath("/seller/profile");
      return { status: "saved", saved };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { status: "idle", errors: error.fields, values: raw };
      }
      throw error;
    }
  }

  const saved = await getServices().sellerAccount.saveProfile({
    contactName: parsed.data.contactName,
    agencyName: parsed.data.agencyName,
    alerts: {
      newLeadsInMyAreas: formData.get("newLeadsInMyAreas") === "on",
      viewedLeadOnSale: formData.get("viewedLeadOnSale") === "on",
      lowBalance: formData.get("lowBalance") === "on",
    },
  });

  revalidatePath("/seller/profile");
  return { status: "saved", saved };
}
