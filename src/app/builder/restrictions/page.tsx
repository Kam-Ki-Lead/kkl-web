import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";
import { profileStoreKind } from "@/lib/services/backend/config";
import { readBuilderProfile } from "@/lib/services/backend/builder-profile";
import { ServiceError } from "@/lib/services/contracts";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Access restrictions" };

/**
 * B-19 — what each account state allows, and how to recover from it.
 *
 * Five states across three independent axes: verification, subscription and
 * administrative status. Keeping them independent is the point — a suspended
 * account is still verified, and an expired subscription changes neither.
 *
 * The table is a reference, not an enforcement point. kkl-backend decides what
 * a request may do; this screen explains what a Builder should expect and what
 * gets them out of it. C-09's rule applies throughout: being blocked is not an
 * error, and nothing already entered or owned is taken away.
 */

type Restriction = {
  readonly key: string;
  readonly label: string;
  readonly sublabel: string;
  readonly tone: ChipTone;
  readonly allowed: readonly string[];
  readonly blocked: readonly string[];
  readonly undecided?: readonly string[];
  readonly recovery: string;
  readonly note?: string;
};

const RESTRICTIONS: readonly Restriction[] = [
  {
    key: "not_verified",
    label: "Not verified",
    sublabel: "Before KYC submission",
    tone: "muted",
    allowed: ["Prepare listings and save drafts", "Browse Buy Leads"],
    blocked: ["Publish listings", "Buy leads or subscribe"],
    recovery: "Submit PAN, Aadhaar and company documents.",
  },
  {
    key: "pending",
    label: "Verification pending",
    sublabel: "Awaiting administrator review",
    tone: "warning",
    allowed: ["Everything from the previous state"],
    blocked: ["Publish or subscribe", "Receive enquiries — nothing is live"],
    recovery: "Wait for the administrator. No turnaround is promised in the interface (D-11).",
  },
  {
    key: "no_subscription",
    label: "Verified, no subscription",
    sublabel: "Approved but not subscribed",
    tone: "neutral",
    allowed: ["Buy leads with credits", "Prepare and preview listings"],
    blocked: ["Publish listings"],
    recovery: "Activate a subscription.",
  },
  {
    key: "expired",
    label: "Subscription expired",
    sublabel: "Lapsed subscription",
    tone: "danger",
    allowed: ["View existing enquiries", "Marketplace and billing"],
    blocked: ["Publish or edit live listings"],
    undecided: ["What happens to listings that are already live"],
    recovery: "Reactivate the subscription.",
    note: "The listing outcome depends on the alternative the client picks (D-02).",
  },
  {
    key: "suspended",
    label: "Account suspended",
    sublabel: "Suspended by an administrator",
    tone: "danger",
    allowed: ["View existing listings and enquiries", "Invoices and billing history"],
    blocked: ["Publish, edit or delete listings", "Buy leads or recharge"],
    recovery: "Contact support for the recorded reason.",
    note: "Verification status is unchanged by suspension. Grounds for suspension and the appeal route are an open client decision.",
  },
];

export default async function BuilderRestrictionsPage() {
  const contractBound = profileStoreKind() === "backend";
  let current: string | null = null;
  let statusNote: string | null = null;
  if (contractBound) {
    try {
      const loaded = await readBuilderProfile();
      current = loaded.accountStatus === "suspended" ? "suspended" : null;
      statusNote =
        loaded.accountStatus === "suspended"
          ? "This account is suspended. Verification and subscription are not fields on the profile, so those rows are not marked as this account."
          : loaded.accountStatus === "active"
            ? "This account is active. Verification and subscription are not fields on the profile, so those rows are not marked as this account."
            : "Account status was not on the profile. Verification and subscription are not marked from a sample account.";
    } catch (error) {
      if (error instanceof ServiceError) {
        return (
          <BuilderShell title="Access restrictions" subtitle="What each state allows and how to recover">
            <StateMessage title="This account could not be read">
              {error.message} The sample builder is not shown in its place.
            </StateMessage>
          </BuilderShell>
        );
      }
      throw error;
    }
  } else {
    const account = await getServices().builder.account.get();
    // Which row describes this account right now, so the reference is anchored to
    // something real rather than being an abstract table.
    current =
      account.accountStatus === "suspended"
        ? "suspended"
        : account.kycStatus === "not_submitted"
          ? "not_verified"
          : account.kycStatus === "pending"
            ? "pending"
            : account.subscription.state === "expired"
              ? "expired"
              : account.subscription.state === "none"
                ? "no_subscription"
                : null;
  }

  return (
    <BuilderShell title="Access restrictions" subtitle="What each state allows and how to recover">
      <div className="flex max-w-[1000px] flex-col gap-[16px]">
        {statusNote ? (
          <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
            <p className="text-[15px] font-semibold text-ink">This account</p>
            <p className="t-body mt-[2px] text-body">{statusNote}</p>
          </Card>
        ) : null}

        {current === null && !contractBound ? (
          <Card className="border-[#BFE0CE] bg-chip-success-bg p-[18px]">
            <p className="text-[15px] font-semibold text-success">
              Nothing is restricted on this account right now.
            </p>
            <p className="t-body mt-[2px] text-body">
              It is verified, active and subscribed. The states below are what you would see if
              that changed.
            </p>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-[14px] max-[1060px]:grid-cols-1">
          {RESTRICTIONS.map((r) => (
            <Card
              key={r.key}
              className={`flex flex-col p-[20px] ${r.key === current ? "border-brand border-[2px]" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-[10px]">
                <Chip tone={r.tone}>{r.label}</Chip>
                {r.key === current ? <Chip tone="neutral">This account</Chip> : null}
              </div>
              {/* The approved card sets the state sublabel as a 17px/700
                  Archivo heading, not a caption. */}
              <p className="t-card-title mt-[4px] text-ink">{r.sublabel}</p>

              <ul className="mt-[12px] flex flex-col gap-[4px]">
                {r.allowed.map((item) => (
                  <li key={item} className="t-body flex gap-[8px] text-body">
                    <span aria-hidden="true" className="text-success">
                      ✓
                    </span>
                    <span>
                      <span className="sr-only">Allowed: </span>
                      {item}
                    </span>
                  </li>
                ))}
                {r.blocked.map((item) => (
                  <li key={item} className="t-body flex gap-[8px] text-body">
                    <span aria-hidden="true" className="text-danger">
                      ✕
                    </span>
                    <span>
                      <span className="sr-only">Blocked: </span>
                      {item}
                    </span>
                  </li>
                ))}
                {(r.undecided ?? []).map((item) => (
                  <li key={item} className="t-body flex gap-[8px] text-body">
                    <span aria-hidden="true" className="text-warning">
                      ?
                    </span>
                    <span>
                      <span className="sr-only">Undecided: </span>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="t-caption mt-[12px] rounded-[8px] bg-tint px-[12px] py-[9px] text-muted">
                <strong className="text-ink">Recovery:</strong> {r.recovery}
              </p>
              {r.note ? <p className="t-caption mt-[8px] text-muted">{r.note}</p> : null}
            </Card>
          ))}
        </div>

        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="t-card-title text-ink">Three independent axes</h2>
          <p className="t-body mt-[6px] text-body">
            Verification, subscription and administrative status move independently. Suspending an
            account does not un-verify it, and letting a subscription lapse does neither — which
            is why recovering from one does not require repeating the others.
          </p>
          <p className="t-caption mt-[8px] text-muted">
            {DECISIONS["D-07"].question} — D-07. {DECISIONS["D-02"].question} — D-02.
          </p>
        </Card>

        <p className="t-caption text-muted">
          This screen explains restrictions; it does not impose them. What a request may do is
          decided by kkl-backend, and nothing rendered or hidden here changes that.
        </p>

        <div>
          <ButtonLink href="/builder" variant="secondary">
            Back to dashboard
          </ButtonLink>
        </div>
      </div>
    </BuilderShell>
  );
}
