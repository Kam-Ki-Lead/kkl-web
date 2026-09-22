import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { StateMessage } from "@/components/ui/states";
import { getServices } from "@/lib/services";
import type { AuditCategory } from "@/lib/domain/admin";

export const metadata: Metadata = { title: "Audit log", robots: { index: false } };

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Accounts", value: "accounts" },
  { label: "Money", value: "money" },
  { label: "Listings", value: "listings" },
  { label: "Support", value: "support" },
];

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * A-30 — every staff action, with its reason.
 *
 * **Append-only, and it looks it.** Nothing in this console removes or rewrites
 * an entry; a mistake is corrected by a new entry. There is no delete control
 * here for a later screen to reach for.
 *
 * Each row opens in place — a `<details>` element, so the expansion works
 * before any JavaScript arrives — and shows the whole record: the actor and
 * their staff id, the exact timestamp, the entity, the reason, and the
 * before/after of every field. Some of those pairs are deliberately *unchanged*:
 * a suspension records `kyc_status` as it was, so the log can prove the two axes
 * stayed separate.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = one((await searchParams).filter) || "all";
  const category = FILTERS.some((f) => f.value === raw && raw !== "all")
    ? (raw as AuditCategory)
    : undefined;

  const entries = await getServices().admin.listAudit(category);

  return (
    <AdminShell title="Audit log" subtitle="Every staff action, with its reason">
      <div className="flex max-w-[900px] flex-col gap-[12px]">
        <div className="flex flex-wrap gap-[8px]">
          {FILTERS.map((option) => {
            const active = option.value === raw;
            return (
              <Link
                key={option.value}
                href={`/admin/audit?filter=${option.value}`}
                aria-current={active ? "true" : undefined}
                className={`min-h-[40px] rounded-full border-[1.5px] px-[14px] py-[9px] text-[14px] font-semibold transition-[background-color,border-color,color] duration-150 ${
                  active
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-white text-body hover:border-[#C3C9DA]"
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        {entries.length === 0 ? (
          <StateMessage title="No entries in this category">
            Nothing has been recorded under this heading yet.
          </StateMessage>
        ) : (
          <Card className="overflow-hidden p-0">
            {entries.map((entry) => (
              <details
                key={entry.id}
                className="border-b border-[#EDEFF6] last:border-b-0 [&[open]>summary]:bg-[#F6F8FD]"
              >
                <summary className="cursor-pointer list-none px-[18px] py-[14px] transition-[background-color] duration-150 hover:bg-[#F6F8FD]">
                  <span className="flex flex-wrap items-baseline justify-between gap-[10px]">
                    <span className="min-w-0">
                      <span className="block text-[15px] font-semibold text-ink">
                        {entry.action}
                      </span>
                      <span className="t-caption block text-muted">
                        {entry.actor.name} · {entry.actor.team} ·{" "}
                        <span className="t-mono">{entry.subject}</span>
                      </span>
                    </span>
                    <span className="t-caption flex-none text-muted">{entry.at}</span>
                  </span>
                  <span className="t-body mt-[4px] block truncate text-body">
                    &ldquo;{entry.reason}&rdquo;
                  </span>
                </summary>

                <div className="border-t border-[#EDEFF6] bg-[#FAFBFE] px-[18px] py-[16px]">
                  <dl className="grid grid-cols-2 gap-x-[18px] gap-y-[9px] max-[700px]:grid-cols-1">
                    <Row label="Actor">
                      {entry.actor.name} · staff ID {entry.actor.staffId} · {entry.actor.team}
                    </Row>
                    <Row label="Timestamp" mono>
                      {entry.at}
                    </Row>
                    <Row label="Entity" mono>
                      {entry.subjectLabel}
                    </Row>
                    <Row label="Action">{entry.action}</Row>
                    {entry.reasonCategory ? (
                      <Row label="Reason category">{entry.reasonCategory}</Row>
                    ) : null}
                    <Row label="Entry" mono>
                      {entry.id}
                    </Row>
                  </dl>

                  <p className="t-caption mt-[14px] text-muted">Field changes</p>
                  <table className="mt-[4px] w-full">
                    <thead>
                      <tr>
                        <th scope="col" className="t-caption py-[6px] text-left text-muted">
                          Field
                        </th>
                        <th scope="col" className="t-caption py-[6px] text-left text-muted">
                          Before
                        </th>
                        <th scope="col" className="t-caption py-[6px] text-left text-muted">
                          After
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.changes.map((change) => {
                        const unchanged = change.before === change.after;
                        return (
                          <tr key={change.field} className="border-t border-line">
                            <th
                              scope="row"
                              className="t-mono py-[7px] text-left text-[13px] font-normal text-ink"
                            >
                              {change.field}
                            </th>
                            <td className="t-mono py-[7px] text-[13px] text-muted">
                              {change.before}
                            </td>
                            <td
                              className={`t-mono py-[7px] text-[13px] ${unchanged ? "text-muted" : "font-semibold text-ink"}`}
                            >
                              {change.after}
                              {unchanged ? (
                                <span className="t-caption ml-[8px] font-normal text-muted">
                                  unchanged
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </Card>
        )}

        <p className="t-caption text-muted">
          Append-only. Entries cannot be edited or deleted — a mistake is corrected by a new entry,
          and there is no control in this console that could remove one. Some before/after pairs
          are recorded <em>unchanged</em> on purpose: a suspension shows verification as it was, so
          the log proves the two were kept separate.
        </p>
      </div>
    </AdminShell>
  );
}

function Row({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="t-caption text-muted">{label}</dt>
      <dd className={mono ? "t-mono text-[13px] text-ink" : "text-[15px] text-ink"}>{children}</dd>
    </div>
  );
}
