import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AccessPanel, PendingRule } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";
import { profileStoreKind } from "@/lib/services/backend/config";
import { readSellerProfile } from "@/lib/services/backend/seller-profile";
import { ServiceError } from "@/lib/services/contracts";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Account restricted" };

/**
 * S-05 — restricted or suspended account.
 *
 * C-09's rule applies: being blocked is not an error. The panel names what is
 * blocked, what still works, and the route out of it, and it does not suggest
 * the person did something wrong.
 *
 * Suspension and verification are separate axes. A suspended account keeps its
 * approval, and lifting a suspension does not re-run verification — the two
 * statuses are reported independently rather than collapsed into one.
 *
 * **This screen does not restrict anything.** It explains a restriction that
 * kkl-backend enforces. Rendering it, or not rendering it, changes nothing about
 * what a request is permitted to do.
 */
export default async function RestrictedPage() {
  const contractBound = profileStoreKind() === "backend";
  let suspended = false;
  let unverified = false;
  let statusNote: string | null = null;
  let verificationWord = "not submitted yet";
  if (contractBound) {
    try {
      const loaded = await readSellerProfile();
      suspended = loaded.accountStatus === "suspended";
      statusNote = suspended
        ? null
        : "Verification is not a field on this profile, so this screen does not report the account as verified.";
    } catch (error) {
      if (error instanceof ServiceError) {
        return (
          <SellerShell title="Account restricted" subtitle="Access is limited until this is resolved">
            <StateMessage title="This account could not be read">
              {error.message} The sample seller is not shown in its place.
            </StateMessage>
          </SellerShell>
        );
      }
      throw error;
    }
  } else {
    const account = await getServices().sellerAccount.get();
    suspended = account.accountStatus === "suspended";
    unverified = account.kycStatus !== "approved";
    verificationWord =
      account.kycStatus === "pending"
        ? "in review"
        : account.kycStatus === "rejected"
          ? "not approved — the status screen says why"
          : "not submitted yet";
  }

  return (
    <SellerShell title="Account restricted" subtitle="Access is limited until this is resolved">
      <div className="flex max-w-[760px] flex-col gap-[16px]">
        {statusNote ? (
          <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
            <p className="t-body text-body">{statusNote}</p>
          </Card>
        ) : null}

        {!suspended && !unverified && !contractBound ? (
          <AccessPanel
            tone="neutral"
            chipLabel="No restriction"
            title="Nothing is restricted on this account"
            actions={<ButtonLink href="/seller">Back to dashboard</ButtonLink>}
          >
            <p>
              This account is verified and active. This screen is where a suspension or a
              verification block would be explained.
            </p>
          </AccessPanel>
        ) : null}

        {suspended ? (
          <AccessPanel
            tone="suspended"
            chipLabel="Account suspended"
            title="Buying leads is paused on this account"
            actions={
              <>
                <ButtonLink href="/seller/support/new">Contact support</ButtonLink>
                <ButtonLink href="/seller/purchased" variant="secondary">
                  My leads
                </ButtonLink>
              </>
            }
            footnote="Your verification is unchanged by the suspension, and lifting it does not require re-verifying."
          >
            <p>
              <strong className="text-ink">What is blocked:</strong> buying leads and recharging
              credits.
            </p>
            <p className="mt-[6px]">
              <strong className="text-ink">What still works:</strong> every lead you have already
              bought, with its contact details and downloads; your invoices and transaction
              history; and support.
            </p>
            <p className="mt-[6px]">
              Support can tell you what is needed to lift it. Nothing has been removed from the
              account.
            </p>
          </AccessPanel>
        ) : null}

        {unverified ? (
          <AccessPanel
            tone="restricted"
            chipLabel="Verification needed"
            title="Leads can be bought once your documents are approved"
            actions={
              <>
                <ButtonLink href="/seller/kyc/status">View verification status</ButtonLink>
                <ButtonLink href="/seller/leads" variant="secondary">
                  Browse Buy Leads
                </ButtonLink>
              </>
            }
          >
            <p>
              PAN and Aadhaar are reviewed by an administrator before any purchase. Your
              submission is {verificationWord}. <PendingRule>{DECISIONS["D-11"].pendingCopy}</PendingRule>
            </p>
          </AccessPanel>
        ) : null}

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">What an unverified account may see</h2>
          <p className="t-body mt-[6px] text-body">
            Whether an unverified seller may browse the marketplace at all, or only see that it
            exists, is not decided. This implementation lets browsing continue and blocks the
            purchase, which is the least surprising reading — but it is a choice, not a rule.
          </p>
          <p className="t-caption mt-[8px] text-muted">
            {DECISIONS["D-07"].question} — D-07, changes the flow.
          </p>
        </Card>
      </div>
    </SellerShell>
  );
}
