import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { OUTCOME } from "@/components/verification/outcome";
import { Card, SectionHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { getServices, verificationStore } from "@/lib/services";
import { formatDateTime } from "@/lib/format";
import type { VerificationCase } from "@/lib/domain/types";

/**
 * Read per-account at request time: with a backend store selected this page
 * calls kkl-backend as the signed-in account, which cannot be prerendered.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Verification cases", robots: { index: false } };

/**
 * CR07 — the verification queue, in two parts.
 *
 * The split is the point. "Needs a person" holds cases waiting on staff: an
 * unreadable result, a failed check to follow up, an expired one. "With the
 * service" holds routine processing. One list would let routine work bury the
 * cases that need someone, which is how a queue stops being a queue.
 *
 * Note what is *not* here: ordinary users. An account that needs no check has no
 * case, so nobody lands in this queue by registering.
 */
export default async function AdminVerificationPage() {
  const { attention, routine } = await getServices().admin.verificationQueues();

  return (
    <AdminShell
      title="Verification cases"
      subtitle="Cases that need a person, and cases the service is still working on"
    >
      <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[16px]">
        <p className="t-body text-body">
          <strong className="text-ink">No provider has been selected.</strong> Nothing here is a
          compliance control and no identity document has been collected. A case that the service
          could not answer is <strong className="text-ink">not</strong> an approval.
          {verificationStore() === "backend" ? (
            <>
              {" "}
              This list is the staff workflow from kkl-backend. Required open cases are on the KYC
              queue, and this screen does not approve an account.
            </>
          ) : (
            <> These rows were produced by a labelled sample service.</>
          )}
        </p>
      </Card>

      <div className="mt-[16px] flex flex-col gap-[20px]">
        <section>
          <SectionHeader
            title={`Needs a person (${attention.length})`}
            subtitle="Unclear results, failed checks to follow up, expired verifications"
          />
          {attention.length === 0 ? (
            <StateMessage title="Nothing waiting">
              No verification case needs staff attention. Routine processing is listed below.
            </StateMessage>
          ) : (
            <Queue cases={attention} />
          )}
        </section>

        <section>
          <SectionHeader
            title={`With the service (${routine.length})`}
            subtitle="Routine processing — listed so nothing looks lost, not queued for staff"
          />
          {routine.length === 0 ? (
            <p className="t-body text-muted">No case is with the service right now.</p>
          ) : (
            <Queue cases={routine} />
          )}
        </section>
      </div>

      <p className="t-caption mt-[20px] max-w-[70ch] text-muted">
        Verification is not account status and not listing moderation. Deciding a case here does not
        suspend or restore an account and does not publish or hold a listing — those are separate
        decisions, on separate screens, with their own reasons and their own history.
      </p>
    </AdminShell>
  );
}

function Queue({ cases }: { cases: readonly VerificationCase[] }) {
  return (
    <ul className="flex flex-col gap-[12px]">
      {cases.map((c) => {
        const state = OUTCOME[c.outcome];
        return (
          <li key={c.reference}>
            <Card className="p-[18px] transition-[border-color] duration-150 hover:border-brand-mist">
              <div className="flex flex-wrap items-start justify-between gap-[12px]">
                <div className="min-w-0">
                  <p className="t-mono text-[13px] text-muted">{c.reference}</p>
                  <h3 className="t-card-title mt-[2px] text-ink">
                    <Link
                      href={`/admin/verification/${c.reference}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {c.actionLabel}
                    </Link>
                  </h3>
                  <p className="t-caption mt-[2px] text-body">{state.line}</p>
                  <p className="t-caption mt-[2px] text-muted">
                    {c.provider.label} · updated {formatDateTime(c.updatedAt)}
                  </p>
                </div>
                <Chip tone={state.tone}>{state.label}</Chip>
              </div>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
