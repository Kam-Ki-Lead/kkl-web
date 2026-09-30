import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Consent & suppression", robots: { index: false } };

/**
 * Read per request: with KKL_ADMIN_OPERATIONS=backend this page calls
 * kkl-backend as the staff account, which cannot be prerendered.
 */
export const dynamic = "force-dynamic";

/**
 * A-28 — who may be contacted, and on what basis.
 *
 * **Read-only for staff, by design rather than by omission.** A suppression is
 * created by the person who refused; removing one is not an operational
 * convenience, and the service interface this screen reads has no method that
 * could. There is no "remove" button here for a later screen to reach for, and
 * no field that accepts a number.
 *
 * The consent-basis table is the honest part: a partner feed is recorded as
 * *no basis established*, not as consent, because buying a list is not the same
 * as being allowed to ring it.
 */
export default async function AdminConsentPage() {
  const { suppression, effects, bases } = await getServices().admin.consent();

  return (
    <AdminShell title="Consent & suppression" subtitle="Who may be contacted, and on what basis">
      <div className="flex max-w-[860px] flex-col gap-[16px]">
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="t-card-title text-warning">Staff cannot change this list</h2>
          <p className="t-body mt-[6px] text-body">
            A suppression is created by the person who refused. Taking one off is not an
            operational decision, so there is no control here that could — the service this screen
            reads has no method for it, and there is no field that accepts a number.
          </p>
          <p className="t-caption mt-[8px] text-muted">
            {DECISIONS["D-14"].question} — <strong>D-14</strong> covers the retention and
            re-consent rules and is not decided. Nothing here expires an entry.
          </p>
        </Card>

        <Card className="overflow-hidden p-0">
          <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
            Suppression list
          </h2>
          <ul>
            {suppression.map((entry, index) => (
              <li
                key={entry.maskedNumber ?? `${entry.when}-${index}`}
                className="border-b border-[#EDEFF6] px-[18px] py-[14px] last:border-b-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
                  {/* No mask where there is nothing to mask. The stored value
                      is a digest, so dots here would imply a number is being
                      withheld from the screen rather than absent from the
                      system — which is a different, and untrue, claim. */}
                  {entry.addressAvailable && entry.maskedNumber !== null ? (
                    <span className="t-mono text-[14px] text-ink">{entry.maskedNumber}</span>
                  ) : (
                    <span className="text-[15px] text-muted">
                      The address is not stored — only a digest of it
                    </span>
                  )}
                  {/* The approved list sets dates and basis lines at 15px. */}
                  <span className="text-[15px] text-muted">{entry.when}</span>
                </div>
                <p className="mt-[3px] text-[15px] font-semibold text-ink">{entry.source}</p>
                <p className="t-body-sm mt-[2px] text-body">{entry.basis}</p>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid grid-cols-2 gap-[16px] max-[900px]:grid-cols-1">
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">What a suppression stops</h2>
            <ul className="t-body-sm mt-[8px] flex list-disc flex-col gap-[5px] pl-[20px] text-body">
              {effects.map((effect) => (
                <li key={effect}>{effect}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Basis for contact, by source</h2>
            <dl className="mt-[10px] flex flex-col gap-[10px]">
              {bases.map((basis) => (
                <div key={basis.source}>
                  <dt className="text-[15px] font-semibold text-ink">{basis.source}</dt>
                  <dd className="t-body text-body">{basis.basis}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <p className="t-caption text-muted">
          Numbers are masked in the record. The suppression list itself is a fixture — there is no
          contact pipeline in this build to enforce it against, and enforcement is kkl-backend&rsquo;s.
        </p>
      </div>
    </AdminShell>
  );
}
