import { runtimeConfig } from "@/lib/config/runtime";
import { authStoreKind, marketplaceStoreKind, profileStoreKind, supportStoreKind } from "@/lib/services/backend/config";
import { Card } from "@/components/ui/card";

/**
 * The Seller console's sample disclosure.
 *
 * The page-top banner already says the data is synthetic. This says the specific
 * thing a Seller screen could otherwise imply: that a verified account, a credit
 * balance and a completed purchase are real. They are not, and the difference
 * matters more here than anywhere else in the application — these are the screens
 * where money and lead ownership appear.
 *
 * Renders nothing outside sample mode.
 */
export function SellerSampleNotice({ children }: { children?: React.ReactNode }) {
  if (!runtimeConfig.isSampleMode) return null;

  return (
    <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
      <h2 className="t-card-title text-warning">
        {profileStoreKind() === "backend"
          ? "Contact name and agency name on the profile are this account’s"
          : "Nothing on these screens is a real account"}
      </h2>
      <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
        <li>
          {authStoreKind() === "backend"
            ? "Sign-in is this browser’s session. It does not open another account’s Seller screens."
            : "There is no sign-in. One sample Seller is shared by everyone using this build, so a purchase made in one browser is visible in another."}
        </li>
        <li>
          {profileStoreKind() === "backend"
            ? "Contact name and agency name are read from the profile. Alert preferences, business type, service areas, GSTIN, billing and identity documents are not fields on that profile, so those forms do not save them."
            : "Verification is not verification. KYC status is a value that can be switched for review; no document is checked and no administrator has approved anything."}
        </li>
        <li>
          {marketplaceStoreKind() === "backend"
            ? "The balance is this account’s wallet. Buying a lead and adding credits still refuse, because no price and no payment provider are configured."
            : "No money moves. The balance is a number held in the server’s memory. No payment is taken, no gateway is contacted, and no invoice is issued to anyone."}
        </li>
        <li>
          {marketplaceStoreKind() === "backend" || supportStoreKind() === "backend"
            ? "Records the service accepts stay after a restart. A purchase the service refuses is not stored as a completed order."
            : "Purchases, ledger entries and tickets are lost when the server restarts."}
        </li>
      </ul>
      <p className="t-caption mt-[10px] text-muted">
        Authentication, KYC, lead ownership, credit deduction and payment capture are kkl-backend&rsquo;s
        and are not implemented here. None of the controls on these screens should be read as
        enforcing anything.
      </p>
      {children}
    </Card>
  );
}
