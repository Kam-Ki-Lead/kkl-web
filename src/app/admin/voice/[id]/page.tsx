import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import {
  QualificationRecoveryForm,
  QualificationReviewForm,
} from "@/components/admin/qualification-forms";
import {
  ContradictionPanel,
  RecommendationFreshnessPanel,
} from "@/components/admin/contradiction-resolution";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { ProposedScorePanel } from "@/components/admin/proposed-score-panel";
import type { ProposedScore } from "@/lib/domain/proposed-score";
import { correctionSummary, presentAnswers } from "@/lib/domain/answer-corrections";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import { qualificationStoreKind } from "@/lib/services/backend/config";
import { getRunContradictions, getVoiceCall } from "@/lib/services/backend/qualification";
import {
  intentDisplay,
  levelDisplay,
  providerStatusLabel,
} from "@/lib/services/backend/qualification-reading";

export const metadata: Metadata = { title: "Qualification run", robots: { index: false } };
export const dynamic = "force-dynamic";

const OUTCOME: Record<string, ChipTone> = {
  qualified: "success",
  declined: "danger",
  no_answer: "muted",
};

/**
 * A-25 — run detail: answers, summary, evidence, review and recovery.
 * Route id is a run UUID when KKL_QUALIFICATION=backend.
 */
export default async function AdminCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (qualificationStoreKind() === "backend") {
    const loaded = await getVoiceCall(id);
    if (!loaded.ok) {
      return (
        <AdminShell title={`Run ${id}`} subtitle="Answers, evidence and review">
          <div className="flex max-w-[860px] flex-col gap-[16px]">
            <IdentityBanner />
            <Link href="/admin/voice" className="t-caption text-brand underline underline-offset-2">
              ← Voice qualification
            </Link>
            <StateMessage tone="error" title="This run could not be loaded">
              {loaded.message}
            </StateMessage>
          </div>
        </AdminShell>
      );
    }
    if (!loaded.value) notFound();
    const run = loaded.value;
    const call = run.calls[0];
    const listHref = run.channel === "whatsapp" ? "/admin/whatsapp" : "/admin/voice";
    const listLabel =
      run.channel === "whatsapp" ? "← WhatsApp qualification" : "← Voice qualification";
    const dispatch = run.providerDispatch;
    const effect = run.effect;
    // Published by the backend only once a proposed score has been computed
    // for this run. Absent is the normal case and renders as "not scored yet";
    // it is deliberately not defaulted to a level.
    const proposedScore = (run as { proposedScore?: ProposedScore | null }).proposedScore ?? null;

    // A separate read, because a conflict carries the question and both
    // sides' evidence and the run payload carries neither. A failure here
    // shows as a failure in its own panel rather than taking the page down.
    const conflicts = await getRunContradictions(run.id);

    return (
      <AdminShell title={run.reference} subtitle="Answers, evidence and review">
        <div className="flex max-w-[860px] flex-col gap-[16px]">
          <IdentityBanner />
          <Link href={listHref} className="t-caption text-brand underline underline-offset-2">
            {listLabel}
          </Link>
          <ProposedScorePanel score={proposedScore} />
          <Link
            href={`/admin/leads/${encodeURIComponent(run.leadId)}`}
            className="t-caption text-brand underline underline-offset-2"
          >
            Open staff lead
          </Link>

          <p className="t-caption rounded-[8px] bg-tint px-[13px] py-[10px] text-body">
            This is a <strong className="text-ink">qualification run</strong>, not a lead record.
            Lead id <span className="t-mono">{run.leadId || "—"}</span> is a reference only.
            {run.questionSet.synthetic
              ? " Question set is SYNTHETIC — not the client questionnaire."
              : null}
            {effect
              ? ` Start effect: ${effect}.`
              : null}
            {dispatch
              ? ` providerDispatch.dispatched=${dispatch.dispatched}`
                + (dispatch.reason ? ` (${dispatch.reason})` : "")
                + "."
              : null}
            {run.suppressed ? " Run is suppressed — recovery stays restricted." : null}
          </p>

          <Card className="p-[20px]">
            <div className="flex flex-wrap items-start justify-between gap-[12px]">
              <div>
                <p className="t-mono text-[13px] text-muted">{run.id}</p>
                <h2 className="t-heading mt-[2px] text-ink">
                  {run.phoneMasked ?? "Masked number unavailable"}
                </h2>
                <p className="t-body text-body">
                  {run.channel} · {run.state.replace(/_/g, " ")} · review{" "}
                  {run.reviewStatus.replace(/_/g, " ")}
                </p>
              </div>
              <div className="flex flex-none flex-col items-end gap-[6px]">
                <Chip tone={run.state === "completed" ? "success" : "muted"}>
                  {run.state.replace(/_/g, " ")}
                </Chip>
                {call ? (
                  <span className="t-caption text-muted">
                    {providerStatusLabel(call.status, false)}
                  </span>
                ) : null}
              </div>
            </div>
            <dl className="mt-[14px] grid grid-cols-1 gap-[8px] border-t border-line pt-[12px]">
              <div className="flex flex-wrap justify-between gap-[10px]">
                <dt className="t-caption text-muted">Qualification level</dt>
                <dd className="text-[15px] font-semibold text-ink">
                  {levelDisplay(run.qualification)}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-[10px]">
                <dt className="t-caption text-muted">Model-reported intent</dt>
                <dd className="text-[15px] text-body">{intentDisplay(run.qualification)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-[10px]">
                <dt className="t-caption text-muted">Marketplace consent</dt>
                <dd className="text-[15px] font-semibold text-ink">
                  {run.qualification.marketplaceConsent}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-[10px]">
                <dt className="t-caption text-muted">Question set</dt>
                <dd className="text-[15px] text-body">
                  {run.questionSet.versionLabel}
                  {run.questionSet.synthetic ? " · SYNTHETIC" : ""}
                </dd>
              </div>
            </dl>
            {run.failureReason ? (
              <p className="t-caption mt-[10px] text-danger">Failure: {run.failureReason}</p>
            ) : null}
          </Card>

          {run.modelSummary ? (
            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Model summary</h2>
              <p className="t-body mt-[8px] text-body">{run.modelSummary}</p>
              <p className="t-caption mt-[10px] text-muted">
                Generated model output — not verified fact, and not a qualification level.
              </p>
            </Card>
          ) : null}

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Transcript</h2>
            <p className="t-caption mt-[2px] text-muted">
              Stored text only. There is no audio download on this contract.
            </p>
            {run.transcript.length === 0 ? (
              <p className="t-body mt-[10px] text-body">No transcript segments on this run yet.</p>
            ) : (
              <ol className="mt-[10px] flex flex-col gap-[10px]">
                {run.transcript.map((line) => (
                  <li key={`${line.sequence}-${line.speaker}`} className="text-[15px] text-body">
                    <span className="font-semibold text-ink">{line.speaker || "speaker"}</span>
                    {line.at ? <span className="t-mono ml-[8px] text-[12px] text-muted">{line.at}</span> : null}
                    <span className="mt-[2px] block">{line.text}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Recorded answers</h2>
            <p className="t-caption mt-[2px] text-muted">
              Question-set version {run.questionSet.versionLabel}. Answer counts do not assign a
              level.
            </p>
            {correctionSummary(run.answers) ? (
              <p className="t-body mt-[10px] rounded-[8px] bg-[#F6F8FD] px-[12px] py-[10px] text-body">
                {correctionSummary(run.answers)}
              </p>
            ) : null}
            {run.answers.length === 0 ? (
              <p className="t-body mt-[10px] text-body">No answers recorded on this run yet.</p>
            ) : (
              <dl className="mt-[10px] flex flex-col">
                {presentAnswers(run.answers).map((answer) => (
                  <div
                    key={answer.id}
                    className="border-b border-line py-[9px] last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
                      <dt className="t-caption text-muted">{answer.questionKey}</dt>
                      <dd className="text-[15px] font-semibold text-ink">
                        <span className={answer.state === "current" ? "" : "line-through opacity-70"}>
                          {answer.value}
                        </span>
                        <span className="ml-[8px]">
                          <Chip tone={answer.tone}>{answer.state}</Chip>
                        </span>
                        {answer.recordedAt ? (
                          <span className="t-mono ml-[8px] text-[12px] font-normal text-muted">
                            {answer.recordedAt}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    {answer.note ? (
                      <p
                        className="t-caption mt-[3px] text-muted"
                        {...(answer.needsHumanReview ? { role: "alert" } : {})}
                      >
                        {answer.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </dl>
            )}
          </Card>

          <ContradictionPanel
            runId={run.id}
            view={conflicts.ok ? conflicts.value : null}
            loadError={conflicts.ok ? null : conflicts.message}
          />

          <RecommendationFreshnessPanel runId={run.id} state={run.recommendations} />

          {run.pendingAction ? (
            <p className="t-body rounded-[8px] bg-tint px-[13px] py-[10px] text-body" role="status">
              A <strong className="text-ink">{run.pendingAction.kind.replace(/_/g, " ")}</strong>{" "}
              is in progress with this person
              {run.pendingAction.step ? ` (step: ${run.pendingAction.step})` : ""}. Their next
              reply belongs to it, so the conversation is not waiting on the next question.
            </p>
          ) : null}

          {run.consentEvidence.length > 0 ? (
            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Consent evidence</h2>
              <ul className="mt-[10px] flex flex-col gap-[8px]">
                {run.consentEvidence.map((item) => (
                  <li key={item.id} className="text-[15px] text-body">
                    <span className="font-semibold text-ink">{item.kind}</span>
                    {item.disposition ? ` · ${item.disposition}` : ""}
                    {item.note ? ` — ${item.note}` : ""}
                  </li>
                ))}
              </ul>
              <p className="t-caption mt-[10px] text-muted">
                Evidence on a run does not by itself change marketplaceConsent.
              </p>
            </Card>
          ) : null}

          {run.messages.length > 0 ? (
            <Card className="p-[18px]">
              <h2 className="t-card-title text-ink">Messages on this run</h2>
              <ul className="mt-[10px] flex flex-col gap-[8px]">
                {run.messages.map((message) => (
                  <li key={message.id} className="text-[15px] text-body">
                    {message.direction} · {providerStatusLabel(message.status, false)}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Human review</h2>
            {run.reviews.length > 0 ? (
              <ul className="mt-[10px] flex flex-col gap-[8px]">
                {run.reviews.map((review) => (
                  <li key={review.id} className="text-[15px] text-body">
                    <span className="font-semibold text-ink">
                      {review.decision.replace(/_/g, " ")}
                    </span>
                    {" — "}
                    {review.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-body mt-[8px] text-body">No review recorded yet.</p>
            )}
            {run.reviewStatus === "pending" ? <QualificationReviewForm runId={run.id} /> : null}
          </Card>

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Recovery</h2>
            <p className="t-body mt-[6px] text-body">
              Actions follow returned capabilities. Resume never dispatches. Retry is offered
              only when allowed without provider dispatch. Suppression blocks recovery.
            </p>
            <QualificationRecoveryForm
              runId={run.id}
              resume={run.capabilities?.resume ?? null}
              retry={run.capabilities?.retry ?? null}
            />
          </Card>
        </div>
      </AdminShell>
    );
  }

  const call = await getServices().admin.getCall(id);
  if (!call) notFound();

  return (
    <AdminShell title={`Call ${call.id}`} subtitle="Transcript, summary and captured answers">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Link href="/admin/voice" className="t-caption text-brand underline underline-offset-2">
          ← Voice qualification
        </Link>
        <FixtureNotice>
          This call did not happen. Fixture transcript only. A fixture summary is not verified fact.
        </FixtureNotice>
        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[12px]">
            <div>
              <p className="t-mono text-[13px] text-muted">{call.id}</p>
              <h2 className="t-heading mt-[2px] text-ink">{call.maskedNumber}</h2>
              <p className="t-body text-body">
                {call.language} · {call.length}
              </p>
            </div>
            <div className="flex flex-none flex-col items-end gap-[6px]">
              <Chip tone={OUTCOME[call.outcome] ?? "muted"}>{call.outcomeLabel}</Chip>
              <span className="t-caption text-muted">Consent {call.consentLabel.toLowerCase()}</span>
            </div>
          </div>
        </Card>
        {call.transcript.length === 0 ? (
          <StateMessage title="No transcript">
            This call produced no transcript — it was not answered, or it ended before the first
            question.
          </StateMessage>
        ) : (
          <Card className="p-[20px]">
            <h2 className="t-card-title text-ink">Transcript</h2>
            <ol className="mt-[12px] flex flex-col gap-[12px]">
              {call.transcript.map((line) => (
                <li key={`${line.at}-${line.who}`} className="flex gap-[12px]">
                  <span className="t-mono w-[44px] flex-none text-[13px] text-muted">{line.at}</span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] font-bold ${line.automated ? "text-brand" : "text-success"}`}
                    >
                      {line.who}
                    </span>
                    <span className="t-body-sm block text-body">{line.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        )}
        {call.captured.length > 0 ? (
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Captured answers</h2>
            <dl className="mt-[10px] flex flex-col">
              {call.captured.map((answer) => (
                <div
                  key={answer.label}
                  className="flex flex-wrap items-baseline justify-between gap-[10px] border-b border-line py-[9px] last:border-b-0"
                >
                  <dt className="t-caption text-muted">{answer.label}</dt>
                  <dd className="text-[15px] font-semibold text-ink">
                    {answer.value}
                    <span className="t-mono ml-[8px] text-[12px] font-normal text-muted">
                      at {answer.at}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ) : null}
      </div>
    </AdminShell>
  );
}
