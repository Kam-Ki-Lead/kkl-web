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
      <h2 className="t-card-title text-warning">Nothing on these screens is a real account</h2>
      <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
        <li>
          {authStoreKind() === "backend"
            ? "Sign-in is this browser’s session. It does not open another account’s Builder screens."
            : "There is no sign-in. One sample Builder is shared by everyone using this build, and its records are separate from the sample Seller’s."}
        </li>
        <li>
          No company was verified. KYC status is a value that can be switched for review; no
          document is checked, stored or seen by an administrator.
        </li>
        <li>
          No subscription was paid for. No gateway is contacted and no price is charged — the
          price and billing cycle are not set (D-01).
        </li>
        <li>
          Publishing writes to the sample portal only. Whether listings are reviewed before or
          after publishing is undecided (D-10), so nothing here is moderated.
        </li>
        <li>Listings, enquiries and tickets are lost when the server restarts.</li>
      </ul>
      <p className="t-caption mt-[10px] text-muted">
        Authentication, verification, publishing permission, contact disclosure and payment
        capture are kkl-backend&rsquo;s. None of the controls on these screens enforces anything.
      </p>
    </Card>
  );
}
