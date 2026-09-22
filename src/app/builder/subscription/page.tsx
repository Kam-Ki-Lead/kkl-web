import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { SubscribeForm } from "@/components/builder/subscribe-form";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { PendingRule } from "@/components/ui/states";
import { newSubscriptionToken } from "@/app/actions/builder-subscription";
import { DECISIONS } from "@/lib/config/business-rules";
import { formatDate } from "@/lib/format";
import { getServices } from "@/lib/services";
import type { BuilderSubscriptionState } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Subscription" };

const PANEL: Record<
  BuilderSubscriptionState,
  { chip: string; tone: ChipTone; title: string; body: string }
> = {
  none: {
    chip: "No subscription",
    tone: "muted",
    title: "A subscription is needed to publish",
    body: "You can prepare listings, save drafts and use the lead marketplace without one. Publishing to the public portal needs an active subscription.",
  },
  active: {
    chip: "Active",
    tone: "success",
    title: "Your subscription is active",
    body: "Listings you publish stay visible on the public portal while this is active.",
  },
  due: {
    chip: "Renewal due",
    tone: "warning",
    title: "Your subscription is due for renewal",
    body: "Publishing and editing still work. How long before the term ends this warning should appear is not set.",
  },
  grace: {
    chip: "In grace",
    tone: "warning",
    title: "Your subscription has lapsed and is in a grace period",
    body: "Publishing is locked. Whether a grace period exists at all, and how long it runs, depends on the alternative the client chooses.",
  },
  expired: {
    chip: "Expired",
    tone: "danger",
    title: "Your subscription has expired",
    body: "Publishing and editing live listings are locked until it is reactivated. What happens to listings that are already live is undecided.",
  },
};

/** B-03 — subscription overview. */
export default async function BuilderSubscriptionPage() {
  const account = await getServices().builder.account.get();
  const subscription = account.subscription;
  const panel = PANEL[subscription.state];
  const token = await newSubscriptionToken();

  return (
    <BuilderShell title="Subscription" subtitle="Required to publish listings">
      <div className="grid max-w-[1000px] grid-cols-[minmax(0,1fr)_340px] gap-[18px] max-[1060px]:grid-cols-1">
        <div className="flex flex-col gap-[16px]">
          <Card className="p-[22px]">
            <Chip tone={panel.tone}>{panel.chip}</Chip>
            <h2 className="t-heading mt-[10px] text-ink">{panel.title}</h2>
            <p className="t-body mt-[6px] text-body">{panel.body}</p>

            <dl className="mt-[18px] grid grid-cols-2 gap-[14px] rounded-[10px] border border-line bg-tint p-[16px] max-[560px]:grid-cols-1">
              <Detail label="Status" value={panel.chip} />
              <Detail label="Started" value={formatDate(subscription.startedAt)} />
              <Detail label="Next charge" value={formatDate(subscription.renewsAt)} />
              <Detail
                label="Amount"
                value={
                  subscription.priceInr === null
                    ? "Not set by the client"
                    : `₹${subscription.priceInr.toLocaleString("en-IN")}`
                }
              />
            </dl>

            {/* D-01. No price, no plan names, no comparison table — none of it
                has been agreed, and a subscription screen that invented one
                would be asking someone to pay a number nobody set. */}
            <p className="t-caption mt-[14px] rounded-[8px] bg-chip-warning-bg px-[13px] py-[10px] text-warning">
              <PendingRule>{DECISIONS["D-01"].pendingCopy}</PendingRule> The price, the billing
              cycle and any included listing limit are not set (D-01). No plan can be presented as
              approved, and no figure on this screen is a price you would be charged.
            </p>

            <div className="mt-[16px]">
              <SubscribeForm
                idempotencyKey={token}
                state={subscription.state}
                blocked={
                  account.accountStatus === "suspended"
                    ? "This account is suspended, so a subscription cannot be started."
                    : account.kycStatus !== "approved"
                      ? "Your company documents are still being verified."
                      : null
                }
              />
            </div>
          </Card>

          <Card className="p-[22px]">
            <h2 className="t-card-title text-ink">What the subscription covers</h2>
            <ul className="mt-[10px] flex flex-col gap-[6px]">
              {[
                "Publish and edit your own projects",
                "Buyer enquiries on your listings",
                "Photograph and video galleries",
                "Requirement-match exposure to buyers",
              ].map((item) => (
                <li key={item} className="t-body flex gap-[8px] text-body">
                  <span aria-hidden="true" className="text-success">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="t-caption mt-[10px] text-muted">
              The lead marketplace, credits and support are separate and are available whether or
              not a subscription is active.
            </p>
          </Card>
        </div>

        <aside>
          <Card className="border-[#F2DFBC] bg-[#FFF9EE] p-[18px]">
            <h2 className="t-card-title text-ink">Renewal &amp; expiry</h2>
            <p className="t-body mt-[6px] text-body">
              What happens to listings that are already live when a subscription lapses is not
              decided. Three alternatives are drawn; the client chooses.
            </p>
            <ButtonLink href="/builder/subscription/renewal" variant="secondary" className="mt-[14px] w-full">
              Renewal &amp; expiry states
            </ButtonLink>
            <p className="t-caption mt-[10px] text-muted">{DECISIONS["D-02"].question} — D-02</p>
          </Card>
        </aside>
      </div>
    </BuilderShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="t-caption text-muted">{label}</dt>
      <dd className="mt-[1px] text-[15px] font-bold text-ink">{value}</dd>
    </div>
  );
}
