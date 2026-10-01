import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { BillingDetailsForm } from "@/components/seller/billing-details-form";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import { profileStoreKind } from "@/lib/services/backend/config";
import { readSellerBilling } from "@/lib/services/backend/seller-profile";
import { ServiceError } from "@/lib/services/contracts";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Billing information" };

/** S-21 — the details that appear on invoices. */
export default async function BillingDetailsPage() {
  const fromProfile = profileStoreKind() === "backend";
  let details;
  if (fromProfile) {
    try {
      details = await readSellerBilling();
    } catch (error) {
      if (error instanceof ServiceError) {
        return (
          <SellerShell title="Billing information" subtitle="Used on your invoices">
            <StateMessage title="Billing details could not be read">
              {error.message} The sample billing record is not shown in its place.
            </StateMessage>
          </SellerShell>
        );
      }
      throw error;
    }
  } else {
    details = await getServices().sellerAccount.billingDetails();
  }

  return (
    <SellerShell title="Billing information" subtitle="Used on your invoices">
      <div className="max-w-[640px]">
        {fromProfile ? (
          <p className="t-body mb-[12px] text-body">
            These details are stored on the profile. Saving them does not issue an invoice and does
            not set a tax treatment.
          </p>
        ) : null}
        <BillingDetailsForm
          details={details}
          isSample={runtimeConfig.isSampleMode && !fromProfile}
          storedOnProfile={fromProfile}
        />
      </div>
    </SellerShell>
  );
}
