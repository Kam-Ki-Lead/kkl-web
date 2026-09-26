import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { LeadRequestForm } from "@/components/seller/lead-request-form";
import { newLeadRequestToken } from "@/app/actions/lead-requests";
import { PendingRule } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Request leads" };

/**
 * CR03 — Request Leads.
 *
 * The Seller describes the area and kind of leads they need; the team picks it
 * up and the request gets a reference the Seller can track. This is separate
 * from buying an available lead on purpose: nothing here spends credits,
 * releases a contact, or places an order. Whether an accepted request becomes
 * a quote or an order is change-confirmation decision 3 — open.
 *
 * The field set is the confirmation document's proposal and is labelled as
 * such (D-17).
 */
export default async function NewLeadRequestPage() {
  const services = getServices();
  const [areas, idempotencyKey] = await Promise.all([
    // The launch city's area records (CR05), through the location service.
    services.locations.areaOptions({ cityId: "in-wb-kol" }),
    newLeadRequestToken(),
  ]);

  return (
    <SellerShell
      title="Request leads"
      subtitle="Tell us the leads you need — the team picks it up from here"
    >
      <div className="flex max-w-[660px] flex-col gap-[16px]">
        <p className="t-caption text-muted">
          <PendingRule>{DECISIONS["D-17"].pendingCopy}</PendingRule>
        </p>
        <LeadRequestForm areas={areas} idempotencyKey={idempotencyKey} />
      </div>
    </SellerShell>
  );
}
