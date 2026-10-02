"use server";

import { revalidatePath } from "next/cache";
import { redirectForAuth } from "@/lib/auth/recover";
import { ServiceError } from "@/lib/services/contracts";
import { applyPricingToUnsold, previewPricing, savePricingConfiguration } from "@/lib/services/backend/provisional-pricing";
import {
  draftFromForm,
  explicitTrue,
  localSaveError,
  previewFromForm,
  pricingConfigurationBody,
  type PricingApplicationView,
  type PricingDraft,
  type PricingPreviewView,
} from "@/lib/services/backend/provisional-pricing-reading";

const PRICING_PATH = "/admin/settings/pricing";

export type PricingSaveState = {
  error?: string;
  field?: string;
  savedVersion?: number;
  draft?: PricingDraft;
};

export type PricingPreviewState = {
  error?: string;
  field?: string;
  budgetInr?: string;
  qualificationLevel?: string;
  demonstrate?: boolean;
  preview?: PricingPreviewView;
};

export type PricingApplicationState = {
  error?: string;
  application?: PricingApplicationView;
};

export async function saveProvisionalPricing(
  _previous: PricingSaveState,
  formData: FormData,
): Promise<PricingSaveState> {
  const draft = draftFromForm(formData);
  const local = localSaveError(draft);
  if (local) return { ...local, draft };
  try {
    const saved = await savePricingConfiguration(pricingConfigurationBody(draft));
    revalidatePath(PRICING_PATH);
    return { savedVersion: saved.version, draft };
  } catch (error) {
    redirectForAuth(error, PRICING_PATH);
    if (error instanceof ServiceError) return { error: error.message, draft };
    throw error;
  }
}

export async function previewProvisionalPrice(
  _previous: PricingPreviewState,
  formData: FormData,
): Promise<PricingPreviewState> {
  const echo = {
    budgetInr: typeof formData.get("budgetInr") === "string" ? String(formData.get("budgetInr")) : "",
    qualificationLevel: typeof formData.get("qualificationLevel") === "string"
      ? String(formData.get("qualificationLevel"))
      : "",
    demonstrate: explicitTrue(formData, "demonstrateRounding"),
  };
  const parsed = previewFromForm(formData);
  if ("error" in parsed) return { ...echo, ...parsed };
  try {
    const preview = await previewPricing(parsed.body);
    return { ...echo, preview };
  } catch (error) {
    redirectForAuth(error, PRICING_PATH);
    if (error instanceof ServiceError) return { ...echo, error: error.message };
    throw error;
  }
}

export async function applyProvisionalPricing(
  _previous: PricingApplicationState,
  formData: FormData,
): Promise<PricingApplicationState> {
  const configurationId = String(formData.get("configurationId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(configurationId)) {
    return { error: "Save a provisional version before applying it. Nothing was changed." };
  }
  try {
    const outcome = await applyPricingToUnsold(configurationId);
    if (!outcome.applied) return { error: outcome.message };
    return { application: outcome.result };
  } catch (error) {
    redirectForAuth(error, PRICING_PATH);
    if (error instanceof ServiceError) return { error: `${error.message} No unsold lead was updated, and nothing was charged.` };
    throw error;
  }
}
