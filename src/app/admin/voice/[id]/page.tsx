import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { FixtureNotice } from "@/components/admin/sample-notice";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Call", robots: { index: false } };

const OUTCOME: Record<string, ChipTone> = {
  qualified: "success",
  declined: "danger",
  no_answer: "muted",
};

/**
 * A-25 — transcript, summary and captured answers.
 *
 * There is no audio player, because there is no recording and no retention
 * rule for one. A transcript is shown as text with timestamps, which is what
 * the approved design shows, and the consent moment is the line that matters —
 * it is what the lead's eligibility rests on.
 */
export default async function AdminCallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const call = await getServices().admin.getCall(id);
  if (!call) notFound();

  return (
    <AdminShell title={`Call ${call.id}`} subtitle="Transcript, summary and captured answers">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Link href="/admin/voice" className="t-caption text-brand underline underline-offset-2">
          ← Voice qualification
        </Link>

        <FixtureNotice>
          This call did not happen. The transcript below is fixture text written to show the
          layout and the consent moment.
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
          <p className="t-caption mt-[14px] border-t border-line pt-[12px] text-muted">
            No audio is offered. Whether calls are recorded at all, for how long, and who may
            listen are decisions nobody has taken, so there is no player here to imply one.
          </p>
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
                  <span className="t-mono w-[44px] flex-none text-[13px] text-muted">
                    {line.at}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] font-bold ${line.automated ? "text-brand" : "text-success"}`}
                    >
                      {line.who}
                    </span>
                    {/* The approved transcript runs at 15px, under the 16px
                        body step. */}
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
            <p className="t-caption mt-[10px] text-muted">
              Each answer carries the point in the call it came from, so a captured value can be
              checked against what was actually said.
            </p>
          </Card>
        ) : null}
      </div>
    </AdminShell>
  );
}
