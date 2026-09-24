import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminTable, Mono, Primary } from "@/components/admin/admin-table";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { getServices } from "@/lib/services";
import type { AdminAccount } from "@/lib/domain/admin";

export const metadata: Metadata = { title: "Users", robots: { index: false } };

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Buyer", value: "buyer" },
  { label: "Broker", value: "seller" },
  { label: "Builder", value: "builder" },
  { label: "Suspended", value: "suspended" },
];

const ROLE_LABEL = { buyer: "Buyer", seller: "Broker", builder: "Builder", staff: "Staff" } as const;

const NOT_SUBMITTED = { label: "Not submitted", tone: "muted" as ChipTone };

const KYC_CHIP: Record<string, { label: string; tone: ChipTone }> = {
  approved: { label: "Approved", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  rejected: { label: "Rejected", tone: "danger" },
  not_submitted: NOT_SUBMITTED,
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-03 — users.
 *
 * Two of these rows are live: their status and verification are read from the
 * console that owns them, so this list cannot say "Active" about an account its
 * own console shows as suspended. The rest are static records for accounts with
 * no console in this build, and the row says which is which.
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = one(params.filter) || "all";
  const query = one(params.q).trim().toLowerCase();

  const all = await getServices().admin.listAccounts();
  const rows = all.filter((account) => matches(account, filter, query));

  return (
    <AdminShell title="Users" subtitle="Every account on the platform">
      <AdminTable
        basePath="/admin/users"
        filters={FILTERS}
        activeFilter={filter}
        query={one(params.q)}
        countLabel={`${rows.length} of ${all.length} ${all.length === 1 ? "account" : "accounts"}`}
        emptyTitle="No accounts match"
        emptyBody="Try a different filter, or search by name, mobile number or account ID."
        footnote="Staff cannot see a user's password or OTP — there is no field here that could carry one. Two accounts are live: their status and verification are read from their own console, not stored again here."
        columns={[
          { header: "ID", width: "0.8fr" },
          { header: "NAME", width: "1.4fr" },
          { header: "ROLE", width: "0.9fr" },
          { header: "STATUS", width: "0.9fr" },
          { header: "VERIFICATION", width: "1fr" },
        ]}
        rows={rows.map((account) => {
          const kyc = KYC_CHIP[account.kycStatus] ?? NOT_SUBMITTED;
          return {
            key: account.accountId,
            href: `/admin/users/${account.accountId}`,
            cells: [
              <Mono key="id">{account.accountId}</Mono>,
              <Primary
                key="name"
                sub={
                  account.liveConsole
                    ? `${account.organisation} · live console`
                    : account.organisation
                }
              >
                {account.name}
              </Primary>,
              ROLE_LABEL[account.role],
              <Chip key="status" tone={account.status === "suspended" ? "danger" : "success"} size="sm">
                {account.status === "suspended" ? "Suspended" : "Active"}
              </Chip>,
              account.role === "buyer" ? (
                <span key="kyc" className="t-caption text-muted">
                  Not applicable
                </span>
              ) : (
                <Chip key="kyc" tone={kyc.tone} size="sm">
                  {kyc.label}
                </Chip>
              ),
            ],
          };
        })}
      />
    </AdminShell>
  );
}

function matches(account: AdminAccount, filter: string, query: string): boolean {
  const byFilter =
    filter === "all" ||
    (filter === "suspended" ? account.status === "suspended" : account.role === filter);
  if (!byFilter) return false;
  if (!query) return true;
  return `${account.accountId} ${account.name} ${account.organisation} ${account.mobile}`
    .toLowerCase()
    .includes(query);
}
