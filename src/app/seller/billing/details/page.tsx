import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { BillingDetailsForm } from "@/components/seller/billing-details-form";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import { profileStoreKind } from "@/lib/services/backend/config";
import { BILLING_NOT_ON_PROFILE } from "@/lib/services/backend/seller-profile-reading";

export const metadata: Metadata = { title: "Billing information" };

/** S-21 — the details that appear on invoices. */
export default async function BillingDetailsPage() {
  const fromProfile = profileStoreKind() === "backend";
  const details = fromProfile
    ? { billingName: "", gstin: null, addressLines: [], invoiceEmail: null, contactName: null }
    : await getServices().sellerAccount.billingDetails();

  return (
    <SellerShell title="Billing information" subtitle="Used on your invoices">
      <div className="max-w-[640px]">
        {fromProfile ? <p className="t-body mb-[12px] text-body">{BILLING_NOT_ON_PROFILE}</p> : null}
        <BillingDetailsForm details={details} isSample={runtimeConfig.isSampleMode && !fromProfile} />
      </div>
    </SellerShell>
  );
}
