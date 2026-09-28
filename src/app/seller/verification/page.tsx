import type { Metadata } from "next";
import { SellerShell } from "@/components/seller/seller-shell";
import { OUTCOME } from "@/components/verification/outcome";
import {
  StartVerificationForm,
  SubmitVerificationForm,
} from "@/components/verification/verification-forms";
import { Card, InsetPanel, SectionHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { getServices } from "@/lib/services";
import { policyFor } from "@/lib/config/verification-policy";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Verification", robots: { index: false } };

/**
 * CR07 — what this account needs, action by action.
 *
 * The screen exists because the old model could not answer the question people
 * actually ask: not "am I verified?" but "do I need to be, for the thing I am
 * trying to do?". The confirmed policy is selective, so the answer differs per
 * action, and a single account-level badge could only be wrong.
 *
 * "Not required" is rendered as its own neutral state with a sentence saying
 * nothing was checked. It is never a green tick: that would award a verification
 * for a check nobody ran.
 */
export default async function SellerVerificationPage() {
  const verification = getServices().verification;
  const [requirements, cases] = await Promise.all([
    verification.requirements(),
    verification.listMine(),
  ]);

  return (
    <SellerShell
      title="Verification"
      subtitle="What needs checking, and what does not"
    >
      <div className="flex flex-col gap-[16px]">
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[16px]">
          <p className="t-body text-body">
            <strong className="text-ink">No verification provider has been selected.</strong> The
            checks below are run by a clearly labelled sample service so each outcome can be
            reviewed. No identity document is collected, nothing is sent anywhere, and no claim is
            made that any check meets a legal requirement — what is required, what may be collected
            and how long it is kept are decisions for the client and its compliance adviser.
          </p>
        </Card>

        <Card className="p-[20px]">
          <SectionHeader
            title="What this account needs"
            subtitle="Checked per action, not per person — the same account can need a check for one thing and not another"
          />
          <ul className="flex flex-col gap-[12px]">
            {requirements.map((r) => {
              const state = OUTCOME[r.outcome];
              const rule = policyFor(r.action);
              return (
                <li key={r.action}>
                  <InsetPanel>
                    <div className="flex flex-wrap items-start justify-between gap-[10px]">
                      <div className="min-w-0">
                        <p className="t-label text-ink">{r.actionLabel}</p>
                        <p className="t-caption mt-[2px] text-body">{r.explanation}</p>
                        <p className="t-caption mt-[4px] text-muted">{state.line}</p>
                        {/* Provenance is NOT rendered here.
                            Who decided a rule, when, and the distinction between
                            a product decision and a compliance determination all
                            matter to whoever audits this policy and not at all to
                            somebody working out whether they can file a request.
                            That record lives on the Admin case detail and in
                            docs/phase-2/decisions-received.md. `rule.internalNote`
                            must not appear on this screen.
                            The one exception is a rule nobody has decided: a
                            customer is entitled to know when a rule being applied
                            to them is provisional. */}
                        {!rule.confirmed ? (
                          <p className="t-caption mt-[4px] font-semibold text-warning">
                            This one is an assumption, not a confirmed rule — it is on the list of
                            decisions still to be made.
                          </p>
                        ) : null}
                        {r.caseReference !== null ? (
                          <p className="t-caption mt-[4px] text-muted">
                            Case <span className="t-mono text-ink">{r.caseReference}</span>
                          </p>
                        ) : null}
                      </div>
                      <Chip tone={state.tone}>{state.label}</Chip>
                    </div>
                    {r.outcome === "required" ? (
                      <StartVerificationForm action={r.action} label={r.actionLabel} />
                    ) : null}
                  </InsetPanel>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-[20px]">
          <SectionHeader
            title="Cases"
            subtitle="Only actions that actually required a check have one. Registering opens nothing."
          />
          {cases.length === 0 ? (
            <p className="t-body text-muted">
              No verification case on this account. Nothing needed one.
            </p>
          ) : (
            <ul className="flex flex-col gap-[14px]">
              {cases.map((c) => {
                const state = OUTCOME[c.outcome];
                return (
                  <li key={c.reference}>
                    <InsetPanel>
                      <div className="flex flex-wrap items-start justify-between gap-[10px]">
                        <div className="min-w-0">
                          <p className="t-mono text-[13px] text-muted">{c.reference}</p>
                          <p className="t-label mt-[2px] text-ink">{c.actionLabel}</p>
                          <p className="t-caption mt-[2px] text-body">{state.line}</p>
                          <p className="t-caption mt-[4px] text-muted">
                            {c.provider.label}
                            {c.provider.reference === null
                              ? " · not sent yet"
                              : ` · ${c.provider.reference}`}
                          </p>
                        </div>
                        <Chip tone={state.tone}>{state.label}</Chip>
                      </div>

                      <ol className="mt-[12px] flex flex-col gap-[8px] border-t border-line pt-[12px]">
                        {c.events.map((e, i) => (
                          <li key={`${e.at}-${i}`} className="border-l-[2px] border-line pl-[10px]">
                            <p className="t-caption font-semibold text-ink">
                              {OUTCOME[e.outcome].label}
                            </p>
                            <p className="t-caption text-muted">
                              {e.actorLabel} · {formatDateTime(e.at)}
                            </p>
                            {e.note ? <p className="t-caption text-body">{e.note}</p> : null}
                          </li>
                        ))}
                      </ol>

                      {c.outcome === "required" || c.outcome === "needs_review" ? (
                        <SubmitVerificationForm reference={c.reference} />
                      ) : null}
                    </InsetPanel>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <p className="t-caption max-w-[70ch] text-muted">
          Verification, account status and listing moderation are three separate things. Being
          verified does not make an account active, a suspension is not a verification decision, and
          a listing held for review is neither. The restriction on buying leads is unchanged: it
          still applies, and it will keep applying until a replacement is confirmed.
        </p>
      </div>
    </SellerShell>
  );
}
