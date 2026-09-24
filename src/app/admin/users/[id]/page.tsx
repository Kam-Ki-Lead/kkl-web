import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { ReasonForm } from "@/components/admin/reason-form";
import { setSuspension } from "@/app/actions/admin";
import { Card } from "@/components/ui/card";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { SUSPENSION_REASONS } from "@/lib/services/sample/admin-store";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "User", robots: { index: false } };

const KYC_CHIP: Record<string, { label: string; tone: ChipTone }> = {
  approved: { label: "Verification approved", tone: "success" },
  pending: { label: "Verification pending", tone: "warning" },
  rejected: { label: "Verification rejected", tone: "danger" },
  not_submitted: { label: "Not submitted", tone: "muted" },
};

/**
 * A-04 — account detail and status actions.
 *
 * The screen's whole job is the separation the brief insists on: **suspension
 * and verification are two independent axes**, shown as two chips, changed by
 * two different actions, and never derived from each other. A suspended
 * account keeps the verification it holds; an approved account can be
 * suspended. The panel below says that in the sentence the person reads before
 * they confirm.
 */
export default async function AdminUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const action = (await searchParams).action;

  const account = await getServices().admin.getAccount(id);
  if (!account) notFound();

  const suspended = account.status === "suspended";
  const kyc = KYC_CHIP[account.kycStatus] ?? KYC_CHIP.not_submitted!;
  const asking = action === "suspend" || action === "reinstate";

  return (
    <AdminShell title={account.name} subtitle="Account detail and status actions">
      <div className="flex max-w-[900px] flex-col gap-[16px]">
        <Link href="/admin/users" className="t-caption text-brand underline underline-offset-2">
          ← All users
        </Link>

        <Card className="p-[20px]">
          <div className="flex flex-wrap items-start justify-between gap-[14px]">
            <div className="min-w-0">
              <p className="t-mono text-[12px] text-muted">{account.accountId}</p>
              <h2 className="t-heading mt-[2px] text-ink">{account.name}</h2>
              <p className="t-body text-body">
                {account.organisation} · {account.mobile}
              </p>
            </div>
            {/* Two chips, always both, in this order. A single "state" chip is
                how the two axes get conflated in the first place. */}
            <div className="flex flex-wrap gap-[8px]">
              <Chip tone={suspended ? "danger" : "success"}>
                {suspended ? "Account suspended" : "Account active"}
              </Chip>
              {account.role === "buyer" ? null : <Chip tone={kyc.tone}>{kyc.label}</Chip>}
            </div>
          </div>

          <dl className="mt-[16px] grid grid-cols-2 gap-x-[18px] gap-y-[10px] border-t border-line pt-[16px] max-[700px]:grid-cols-1">
            {account.facts.map((fact) => (
              <div key={fact.label}>
                <dt className="t-caption text-muted">{fact.label}</dt>
                <dd className="text-[15px] font-semibold text-ink">{fact.value}</dd>
              </div>
            ))}
            <div>
              <dt className="t-caption text-muted">Joined</dt>
              <dd className="text-[15px] font-semibold text-ink">{account.joinedAt}</dd>
            </div>
          </dl>

          <p className="t-caption mt-[14px] border-t border-line pt-[12px] text-muted">
            {account.liveConsole
              ? `Live account. Status and verification are read from the ${account.liveConsole === "seller" ? "Seller" : "Builder"} console's own store, so a decision here shows there.`
              : "Static sample record. This account has no console in this build, so a decision here is recorded in the audit log and nowhere else."}
          </p>
        </Card>

        {asking ? (
          <ReasonForm
            action={setSuspension}
            title={suspended ? "Reinstate this account" : "Suspend this account"}
            body={
              suspended
                ? "Access is restored. The verification state is unchanged by either action — the suspension and this reinstatement both stay in the account history."
                : "Purchasing, downloads and publishing stop immediately. Existing purchased leads and invoices stay available to the user. Verification is recorded separately and is not changed by suspension."
            }
            confirmLabel={suspended ? "Reinstate account" : "Suspend account"}
            destructive={!suspended}
            categories={SUSPENSION_REASONS}
            hidden={{ accountId: account.accountId, suspended: String(!suspended) }}
            cancel={
              <Link
                href={`/admin/users/${account.accountId}`}
                className="t-caption text-brand underline underline-offset-2"
              >
                Cancel
              </Link>
            }
          />
        ) : (
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">Actions</h2>
            <p className="t-caption mt-[4px] text-muted">
              Each one asks for a reason before it changes anything, and each writes an audit
              entry.
            </p>
            <div className="mt-[14px] flex flex-wrap gap-[10px]">
              <ButtonLink
                href={`/admin/users/${account.accountId}?action=${suspended ? "reinstate" : "suspend"}`}
                variant={suspended ? "secondary" : "destructive"}
                size="action"
              >
                {suspended ? "Reinstate this account" : "Suspend this account"}
              </ButtonLink>
              <ButtonLink
                href={`/admin/wallets/${account.accountId}/adjust`}
                variant="secondary"
                size="action"
              >
                Adjust credit balance
              </ButtonLink>
              <ButtonLink href="/admin/kyc" variant="secondary" size="action">
                Open the KYC queue
              </ButtonLink>
            </div>
            <p className="t-caption mt-[12px] text-muted">
              Verification is changed from the KYC queue, not from here. Suspending an account
              does not move it, and approving a document does not un-suspend one.
            </p>
          </Card>
        )}

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Account history</h2>
          <ul className="mt-[10px] flex flex-col">
            {account.history.map((entry) => (
              <li
                key={`${entry.what}-${entry.when}`}
                className="flex flex-wrap items-baseline justify-between gap-[10px] border-b border-line py-[10px] last:border-b-0"
              >
                <span className="text-[15px] text-ink">{entry.what}</span>
                <span className="t-caption text-muted">
                  {entry.who} · {entry.when}
                </span>
              </li>
            ))}
          </ul>
          <p className="t-caption mt-[10px] text-muted">
            Every staff action on this account is also in the{" "}
            <Link href="/admin/audit" className="text-brand underline underline-offset-2">
              audit log
            </Link>
            , with its reason and the fields it changed.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
