import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

export const metadata: Metadata = { title: "Platform settings", robots: { index: false } };

const TAXONOMY = [
  { label: "Apartment", note: "In every synthetic listing", on: true },
  { label: "Builder floor", note: "Proposed", on: true },
  { label: "Villa / row house", note: "Proposed", on: true },
  { label: "Plot", note: "Proposed — may be out of scope for launch", on: false },
];

const TEMPLATES = [
  { name: "Qualification call opening", channel: "Voice", status: "Active · Hindi, Bengali, English" },
  { name: "Consent question", channel: "Voice", status: "Active · wording fixed by compliance" },
  { name: "New enquiry to builder", channel: "SMS", status: "Active" },
  {
    name: "WhatsApp qualification journey",
    channel: "WhatsApp",
    status: "One template rejected — see notifications",
  },
];

/**
 * A-15 — taxonomy, calling hours and templates.
 *
 * Read-only, like A-14 and for the same reason: the property-type list is a
 * design proposal awaiting client confirmation (D-09), calling hours are a
 * compliance matter nobody has signed off, and the consent question's wording
 * is explicitly not ours to edit. A toggle that appeared to change any of them
 * would be the wrong kind of convincing.
 */
export default function AdminSettingsPage() {
  return (
    <AdminShell title="Platform settings" subtitle="Taxonomy, calling hours and templates">
      <div className="flex max-w-[820px] flex-col gap-[16px]">
        <Card className="border-[#F2DFBC] bg-[#FFF9EE] p-[18px]">
          <h2 className="t-card-title text-warning">Read-only</h2>
          <p className="t-body mt-[6px] text-body">
            Nothing on this screen can be changed. The property-type list is a design proposal
            awaiting confirmation (<strong>D-09</strong>), calling hours are a compliance matter
            that is not settled, and the consent question&rsquo;s wording is fixed by compliance
            rather than by operations. Controls that looked editable would suggest these are
            decided.
          </p>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Property types</h2>
          <p className="t-caption mt-[2px] text-muted">
            The taxonomy the listing editor and the portal&rsquo;s filters use. Proposed — D-09.
          </p>
          <ul className="mt-[12px] flex flex-col gap-[8px]">
            {TAXONOMY.map((item) => (
              <li
                key={item.label}
                className={`flex items-center justify-between gap-[12px] rounded-[8px] border px-[14px] py-[11px] ${
                  item.on ? "border-[#D4DBF3] bg-tint" : "border-line bg-white"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">{item.label}</span>
                  <span className="t-caption block text-muted">{item.note}</span>
                </span>
                <Chip tone={item.on ? "success" : "muted"}>{item.on ? "In use" : "Off"}</Chip>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Calling hours</h2>
          <p className="t-body mt-[6px] text-body">
            Qualification calls are placed only inside a configured window, and calls held outside
            it are queued rather than dropped — seven are held right now, per{" "}
            <Link href="/admin/voice" className="text-brand underline underline-offset-2">
              voice qualification
            </Link>
            .
          </p>
          <p className="t-caption mt-[8px] text-muted">
            The window itself is not shown as a value, because none has been agreed. Calling hours
            are a regulatory question, not a preference, and the number belongs in kkl-backend&rsquo;s
            configuration rather than in a text box here.
          </p>
        </Card>

        <Card className="overflow-hidden p-0">
          <h2 className="t-card-title border-b border-line px-[18px] py-[15px] text-ink">
            Message templates
          </h2>
          {TEMPLATES.map((template) => (
            <div
              key={template.name}
              className="flex flex-wrap items-center justify-between gap-[12px] border-b border-[#EDEFF6] px-[18px] py-[13px] last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-ink">{template.name}</span>
                <span className="t-caption block text-muted">{template.channel}</span>
              </span>
              <span className="t-caption text-right text-muted">{template.status}</span>
            </div>
          ))}
        </Card>

        <p className="t-caption text-muted">
          No credential, key or token appears anywhere in this console. Integration credentials
          live in the deployment environment — see{" "}
          <Link href="/admin/system" className="text-brand underline underline-offset-2">
            jobs &amp; integrations
          </Link>
          .
        </p>
      </div>
    </AdminShell>
  );
}
