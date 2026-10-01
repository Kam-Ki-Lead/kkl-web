import { runtimeConfig } from "@/lib/config/runtime";
import { authStoreKind } from "@/lib/services/backend/config";
import { Card } from "@/components/ui/card";

/**
 * The Builder console's sample disclosure.
 *
 * Says the specific things these screens could otherwise imply: that a company
 * is verified, that a subscription was paid for, that publishing was reviewed,
 * and that a buyer's contact details reached someone entitled to them.
 */
export function BuilderSampleNotice() {
  if (!runtimeConfig.isSampleMode) return null;

  return (
    <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
      <h2 className="t-card-title text-warning">
        {authStoreKind() === "backend"
          ? "Part of this console is still sample data"
          : "Nothing on these screens is a real account"}
      </h2>
      <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
        <li>
          {authStoreKind() === "backend"
            ? "Sign-in is this browser’s session. A session that is not a builder does not open these screens, and they do not open the sample builder."
            : "There is no sign-in. One sample Builder is shared by everyone using this build, and its records are separate from the sample Seller’s."}
        </li>
        <li>
          No company was verified. KYC status is a value that can be switched for review; no
          document is checked, stored or seen by an administrator.
        </li>
        <li>
          {authStoreKind() === "backend"
            ? "Company name, the account name and the contact email on Profile are saved for this account. Add a RERA registration number on the property listing — this profile does not store it. Alert choices on this page are not saved. No subscription is stored, and the sample plan is not shown. No price has been set (D-01)."
            : "No subscription was paid for. No gateway is contacted and no price is charged — the price and billing cycle are not set (D-01)."}
        </li>
        <li>
          {authStoreKind() === "backend"
            ? "Enquiries on this account are stored. A recipient is not given the enquirer’s name, number, or message, because contact access is undecided (Q-2a, Q-2b). Property projects on the sample builder are not this account’s list."
            : "Publishing writes to the sample portal only. Whether listings are reviewed before or after publishing is undecided (D-10), so nothing here is moderated."}
        </li>
        <li>
          {authStoreKind() === "backend"
            ? "Stored enquiries stay after this frontend restarts. Nothing was sent to the builder."
            : "Listings, enquiries and tickets are lost when the server restarts."}
        </li>
      </ul>
      <p className="t-caption mt-[10px] text-muted">
        {authStoreKind() === "backend" ? (
          <>
            Authentication, verification, publishing permission, contact disclosure and payment
            capture are kkl-backend&rsquo;s. A session that is not a builder does not open this
            console.
          </>
        ) : (
          <>
            Authentication, verification, publishing permission, contact disclosure and payment
            capture are kkl-backend&rsquo;s. None of the controls on these screens enforces anything.
          </>
        )}
      </p>
    </Card>
  );
}
