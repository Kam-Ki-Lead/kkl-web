import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { BillingDetailsForm } from "@/components/seller/billing-details-form";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";

export const metadata: Metadata = { title: "Billing information" };

/** S-21 — the details that appear on invoices. */
export default async function BillingDetailsPage() {
  const details = await getServices().sellerAccount.billingDetails();

  return (
    <SellerShell title="Billing information" subtitle="Used on your invoices">
      <div className="max-w-[640px]">
        <BillingDetailsForm details={details} isSample={runtimeConfig.isSampleMode} />
      </div>
    </SellerShell>
  );
}
