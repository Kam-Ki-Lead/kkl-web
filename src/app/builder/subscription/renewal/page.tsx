import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DECISIONS } from "@/lib/config/business-rules";

export const metadata: Metadata = { title: "Renewal & expiry" };

/**
 * B-05 — the renewal and expiry alternatives.
 *
 * This screen exists because D-02 is open. Neither source document says whether
 * published listings stay visible, are hidden, or are deleted when a
 * subscription lapses.
 *
 * The three alternatives are presented as proposals for the client to choose
 * between, with what a Buyer would see under each, because that is the part
 * that actually decides the answer. None is marked recommended and none is
 * implemented as the default — the implementation currently does nothing to
 * live listings on expiry, which is alternative A by omission and is stated as
 * such rather than presented as a decision taken.
 */

const ALTERNATIVES = [
  {
    key: "A",
    title: "Listings stay visible",
    body: "Published listings remain on the portal; the builder loses editing and new publishing until they renew.",
    buyer: "No change — the listing looks normal.",
    cost: "Simplest to build and least disruptive to buyers, but a lapsed builder keeps the benefit they stopped paying for.",
  },
  {
    key: "B",
    title: "Listings are hidden",
    body: "Published listings drop out of search immediately and return on renewal. Nothing is deleted.",
    buyer: "The listing disappears from results.",
    cost: "Strongest incentive to renew. A buyer mid-enquiry loses the page they were looking at.",
  },
  {
    key: "C",
    title: "Grace period, then hidden",
    body: "Listings stay visible for a grace window after expiry, then hide. The grace length would need setting.",
    buyer: "No change during the grace window, then the listing disappears.",
    cost: "A middle option, and the only one that needs a second decision — how long the window is.",
  },
] as const;

const CONSOLE_STATES = [
  {
    label: "Renewal due",
    body: "A banner appears in the console ahead of the term end, with a renew action. How far ahead is not set.",
  },
  {
    label: "Grace",
    body: "Listings behave normally; publishing is locked and the banner becomes urgent. Only applies if alternative C is chosen.",
  },
  {
    label: "Expired",
    body: "Publishing and editing are locked, with a reactivation action and an explanation. What happens to live listings depends on the alternative chosen.",
  },
] as const;

export default function RenewalPage() {
  return (
    <BuilderShell title="Renewal & expiry" subtitle="Proposed alternatives — decision needed">
      <div className="flex max-w-[1000px] flex-col gap-[18px]">
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[22px]">
          <h2 className="t-card-title text-ink">
            Unresolved: what happens to live listings on expiry
          </h2>
          <p className="t-body mt-[6px] max-w-[80ch] text-body">
            Neither source document says whether published listings stay visible, are hidden, or
            are deleted when a subscription lapses. The three alternatives below are design
            proposals for the client to choose between — the design does not assume one.
          </p>
          <p className="t-caption mt-[10px] text-muted">
            {DECISIONS["D-02"].question} — D-02, blocks launch.
          </p>
        </Card>

        <div className="grid grid-cols-3 gap-[14px] max-[1060px]:grid-cols-1">
          {ALTERNATIVES.map((alt) => (
            <Card key={alt.key} className="flex flex-col p-[20px]">
              <p className="t-eyebrow text-muted">Alternative {alt.key}</p>
              <h3 className="t-panel-title mt-[4px] text-ink">{alt.title}</h3>
              <p className="t-body mt-[6px] text-body">{alt.body}</p>
              <p className="t-caption mt-[12px] rounded-[8px] bg-tint px-[12px] py-[9px] text-muted">
                <strong className="text-ink">Buyer sees:</strong> {alt.buyer}
              </p>
              <p className="t-caption mt-[10px] text-muted">{alt.cost}</p>
            </Card>
          ))}
        </div>

        <Card className="p-[22px]">
          <h2 className="t-card-title text-ink">Renewal states in the console</h2>
          <ul className="mt-[12px] flex flex-col gap-[12px]">
            {CONSOLE_STATES.map((s) => (
              <li key={s.label} className="border-b border-line pb-[12px] last:border-b-0 last:pb-0">
                <Chip tone={s.label === "Expired" ? "danger" : "warning"}>{s.label}</Chip>
                <p className="t-body mt-[6px] text-body">{s.body}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">What this build currently does</h2>
          <p className="t-body mt-[6px] text-body">
            Nothing. An expired subscription locks publishing and editing in this console, and
            does not touch listings that are already live — which is alternative A by omission,
            not by decision. It is stated here so the absence is not mistaken for a choice.
          </p>
        </Card>

        <div>
          <ButtonLink href="/builder/subscription" variant="secondary">
            Back to subscription
          </ButtonLink>
        </div>
      </div>
    </BuilderShell>
  );
}
