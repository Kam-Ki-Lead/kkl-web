import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { IdentityBanner } from "@/components/admin/identity-banner";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import {
  MAPPING_NOT_CONFIGURED_DETAIL,
  MAPPING_NOT_CONFIGURED_LABEL,
} from "@/lib/domain/commerce-display";
import { adminOperationsStoreKind } from "@/lib/services/backend/config";
import { loadQuestionConfiguration } from "@/lib/services/backend/qualification";

export const metadata: Metadata = { title: "Platform settings", robots: { index: false } };
export const dynamic = "force-dynamic";

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
 *
 * Question prompts reuse the published pricing configuration schema when
 * KKL_ADMIN_OPERATIONS=backend. They stay definitions; mapping is not configured.
 */
export default async function AdminSettingsPage() {
  const questionsFromBackend = adminOperationsStoreKind() === "backend";
  const questions = questionsFromBackend ? await loadQuestionConfiguration() : null;

  return (
    <AdminShell title="Platform settings" subtitle="Taxonomy, calling hours and templates">
      <div className="flex max-w-[820px] flex-col gap-[16px]">
        {questionsFromBackend ? <IdentityBanner /> : null}

        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
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
                  item.on ? "border-brand-mist bg-tint" : "border-line bg-white"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-[15px] text-ink">{item.label}</span>
                  <span className="t-caption block text-muted">{item.note}</span>
                </span>
                <Chip tone={item.on ? "success" : "muted"}>{item.on ? "In use" : "Off"}</Chip>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Qualification questions</h2>
          <p className="t-caption mt-[2px] text-muted">
            Definitions from the backend schema where published. Mapping status:{" "}
            <strong className="text-ink">{MAPPING_NOT_CONFIGURED_LABEL}</strong>.
          </p>
          {questions && !questions.ok ? (
            <StateMessage tone="error" title="Question configuration could not be loaded">
              {questions.message}
            </StateMessage>
          ) : null}
          {questions?.ok && questions.value === null ? (
            <StateMessage title="No question configuration is stored">
              No pricing version with prompts is stored yet. Prompts are definitions only once they
              exist — {MAPPING_NOT_CONFIGURED_LABEL}.
            </StateMessage>
          ) : null}
          {questions?.ok && questions.value ? (
            <>
              <p className="t-body mt-[10px] text-body">{questions.value.note}</p>
              <p className="t-caption mt-[6px] text-muted">
                Pricing version {questions.value.version} ·{" "}
                <span className="t-mono">{questions.value.configurationId}</span>
              </p>
              {questions.value.questions.length === 0 ? (
                <p className="t-body mt-[10px] text-body">
                  This version stores no prompts yet. Levels are not inferred from an empty list.
                </p>
              ) : (
                <ol className="mt-[12px] flex list-decimal flex-col gap-[8px] pl-[20px]">
                  {questions.value.questions.map((question) => (
                    <li key={question.id} className="text-[15px] text-ink">
                      {question.prompt}
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : null}
          {!questionsFromBackend ? (
            <p className="t-body mt-[10px] text-body">
              With admin operations on sample data, prompts are not loaded from kkl-backend. Turn
              on <span className="t-mono">KKL_ADMIN_OPERATIONS=backend</span> to read the published
              pricing question schema. {MAPPING_NOT_CONFIGURED_DETAIL}
            </p>
          ) : null}
          <p className="t-caption mt-[10px] text-muted">{MAPPING_NOT_CONFIGURED_DETAIL}</p>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Calling hours</h2>
          <p className="t-body mt-[6px] text-body">
            Qualification calls are placed only inside a configured window, and calls held outside
            it are queued rather than dropped. The live hold count belongs to kkl-voice once
            connected — see{" "}
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
              className="flex flex-wrap items-center justify-between gap-[12px] border-b border-line px-[18px] py-[13px] last:border-b-0"
            >
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold text-ink">{template.name}</span>
                <span className="t-caption block text-muted">{template.channel}</span>
              </span>
              <span className="t-caption text-right text-muted">{template.status}</span>
            </div>
          ))}
          <p className="t-caption border-t border-line px-[18px] py-[12px] text-muted">
            Template rows above remain review fixtures until a template catalogue is published.
            A rejected template is a provider failure, not delivery.
          </p>
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
