import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  ApplyToUnsoldLeads,
  ProvisionalPricePreview,
  ProvisionalPricingEditor,
} from "@/components/admin/provisional-pricing-editor";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { StateMessage } from "@/components/ui/states";
import { formatDateTime } from "@/lib/format";
import { ServiceError } from "@/lib/services/contracts";
import { redirectForAuth } from "@/lib/auth/recover";
import {
  listPricingVersions,
  readPricingConfiguration,
  readPricingImpact,
  readPricingOverview,
} from "@/lib/services/backend/provisional-pricing";
import {
  PROVISIONAL_BANNER,
  blankPricingDraft,
  draftFromConfiguration,
  formatProvisionalInr,
  versionListCaption,
  type PricingApplicationView,
  type PricingConfigurationView,
  type PricingVersionSummary,
} from "@/lib/services/backend/provisional-pricing-reading";

const VERSION = /^[0-9a-f-]{36}$/i;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function PricingReadFailure({ message }: { message: string }) {
  return (
    <AdminShell title="Pricing & aging" subtitle="Provisional lead-price matrix">
      <div className="max-w-[820px]">
        <StateMessage tone="error" title="Provisional pricing could not be read">
          {message} The sample price table is not shown in its place.
        </StateMessage>
      </div>
    </AdminShell>
  );
}

export async function ProvisionalPricingScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const requested = one(params.version).trim();

  let overview;
  let versions: PricingVersionSummary[];
  try {
    [overview, versions] = await Promise.all([readPricingOverview(), listPricingVersions()]);
  } catch (error) {
    redirectForAuth(error, "/admin/settings/pricing");
    if (error instanceof ServiceError) return <PricingReadFailure message={error.message} />;
    throw error;
  }

  let viewed = overview.configuration;
  let versionProblem: string | null = null;
  if (requested && !VERSION.test(requested)) {
    versionProblem = "That version link was not recognised.";
  } else if (requested && viewed?.id !== requested) {
    try {
      viewed = await readPricingConfiguration(requested);
    } catch (error) {
      redirectForAuth(error, "/admin/settings/pricing");
      if (error instanceof ServiceError) {
        versionProblem = error.message;
        viewed = overview.configuration;
      } else {
        throw error;
      }
    }
  }

  const seed = viewed ? draftFromConfiguration(viewed) : blankPricingDraft();
  const viewingOlder = Boolean(viewed && overview.configuration && viewed.id !== overview.configuration.id);
  let impact: PricingApplicationView | null = null;
  let impactProblem: string | null = null;
  if (viewed) {
    try {
      impact = await readPricingImpact(viewed.id);
    } catch (error) {
      redirectForAuth(error, "/admin/settings/pricing");
      if (error instanceof ServiceError) impactProblem = error.message;
      else throw error;
    }
  }

  return (
    <AdminShell title="Pricing & aging" subtitle="Provisional lead-price matrix">
      <div className="flex max-w-[980px] flex-col gap-[16px]">
        <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
          <h2 className="text-[20px] font-bold leading-snug text-warning">{PROVISIONAL_BANNER}</h2>
          <p className="t-body mt-[8px] text-body">{overview.purchaseMessage}</p>
          <p className="t-caption mt-[8px] text-muted">
            Saving stores a new provisional version and does not change a lead. A preview calculates one amount and does not change a lead.
            Applying a saved version is a separate action. This screen does not activate a purchase price.
          </p>
        </Card>

        <VersionList
          versions={versions}
          storedCount={overview.versions}
          viewedId={viewed?.id ?? null}
          problem={versionProblem}
        />

        {viewed ? <RecordedConfiguration configuration={viewed} older={viewingOlder} /> : (
          <Card className="p-[18px]">
            <h2 className="t-card-title text-ink">No provisional version is stored</h2>
            <p className="t-body mt-[6px] text-body">
              Save a matrix to keep the first provisional version.
            </p>
          </Card>
        )}

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Edit a provisional version</h2>
          <div className="mt-[12px]">
            <ProvisionalPricingEditor
              key={viewed?.id ?? "new"}
              initial={seed}
              versionNote={viewed
                ? `Version ${viewed.version} is shown. Saving stores a new provisional version and leaves version ${viewed.version} unchanged.`
                : "Nothing is stored yet. Saving stores the first provisional version."}
            />
          </div>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Apply to unsold leads</h2>
          <div className="mt-[12px]">
            <ApplyToUnsoldLeads
              configurationId={viewed?.id ?? null}
              version={viewed?.version ?? null}
              bands={viewed?.bands.length ?? 0}
              levels={viewed?.levels.length ?? 0}
              older={viewingOlder}
              impact={impact}
              impactProblem={impactProblem}
            />
          </div>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Preview a price</h2>
          <div className="mt-[12px]">
            <ProvisionalPricePreview
              key={viewed?.id ?? "new"}
              configurationId={viewed?.id ?? null}
              version={viewed?.version ?? null}
              levels={viewed?.levels ?? []}
            />
          </div>
        </Card>
      </div>
    </AdminShell>
  );
}

function VersionList({
  versions,
  storedCount,
  viewedId,
  problem,
}: {
  versions: readonly PricingVersionSummary[];
  storedCount: number;
  viewedId: string | null;
  problem: string | null;
}) {
  return (
    <Card className="p-[18px]">
      <h2 className="t-card-title text-ink">Configuration versions</h2>
      <p className="t-body mt-[8px] text-body">{versionListCaption(storedCount, versions.length)}</p>
      {problem ? <p role="alert" className="t-body mt-[8px] text-danger">{problem}</p> : null}
      {versions.length > 0 ? (
        <ul className="mt-[10px] flex flex-col gap-[8px]">
          {versions.map((version) => {
            const current = version.id === viewedId;
            const latest = version.id === versions[0]?.id;
            return (
              <li key={version.id} className="flex flex-wrap items-center gap-[8px]">
                <Link
                  href={latest ? "/admin/settings/pricing" : `/admin/settings/pricing?version=${version.id}`}
                  className={`text-[14px] font-semibold underline ${current ? "text-ink" : "text-brand"}`}
                  aria-current={current ? "page" : undefined}
                >
                  Version {version.version}
                </Link>
                <Chip tone="warning" size="sm">Provisional</Chip>
                <span className="t-caption text-muted">
                  {version.bands} bands · {version.levels} levels · {version.questions} questions
                  {version.createdAt ? ` · ${formatDateTime(version.createdAt)}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}

function RecordedConfiguration({
  configuration,
  older,
}: {
  configuration: PricingConfigurationView;
  older: boolean;
}) {
  return (
    <Card className="p-[18px]">
      <div className="flex flex-wrap items-center gap-[8px]">
        <h2 className="t-card-title text-ink">Version {configuration.version}</h2>
        <Chip tone="warning" size="sm">Provisional</Chip>
      </div>
      <p className="t-body mt-[8px] text-body">
        {older
          ? `This is an earlier version. The latest saved version is unchanged until you save a new one.`
          : "This is the latest saved version."}
        {configuration.createdAt ? ` Saved ${formatDateTime(configuration.createdAt)}.` : ""}
      </p>
      {configuration.note ? <p className="t-body mt-[6px] text-body">Note: {configuration.note}</p> : null}
      <p className="t-caption mt-[8px] text-muted">
        Band boundaries use a minimum-inclusive, maximum-exclusive edge for this preview. That convention is not confirmed.
        Questions stored here are definitions only. No question-to-level mapping is configured.
      </p>
      <ul className="mt-[10px] flex list-disc flex-col gap-[4px] pl-[20px] text-[14px] text-body">
        {configuration.bands.map((band) => (
          <li key={band.id}>
            {band.label}: {formatProvisionalInr(band.minInr)} inclusive
            {band.maxInr ? ` to ${formatProvisionalInr(band.maxInr)} exclusive` : ", with no upper bound"}
            . Base price {formatProvisionalInr(band.basePriceInr)}.
          </li>
        ))}
      </ul>
      <ul className="mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-[14px] text-body">
        {configuration.levels.map((level) => (
          <li key={level.level}>Level {level.level}, multiplier {level.multiplierText}.</li>
        ))}
      </ul>
      {configuration.questions.length > 0 ? (
        <ul className="mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-[14px] text-body">
          {configuration.questions.map((question) => (
            <li key={question.id}>{question.prompt}</li>
          ))}
        </ul>
      ) : null}
      {configuration.gaps.length > 0 ? (
        <div className="mt-[10px]">
          <h3 className="text-[14px] font-semibold text-ink">Gaps with no price</h3>
          <ul className="mt-[4px] flex list-disc flex-col gap-[4px] pl-[20px] text-[14px] text-body">
            {configuration.gaps.map((gap) => (
              <li key={`${gap.afterInr}-${gap.beforeInr}`}>
                No price is stored from {formatProvisionalInr(gap.afterInr)} up to {formatProvisionalInr(gap.beforeInr)}. A gap is not filled.
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {configuration.unconfirmed.length > 0 ? (
        <div className="mt-[12px]">
          <h3 className="text-[14px] font-semibold text-ink">Unresolved assumptions</h3>
          <ul className="mt-[4px] flex list-disc flex-col gap-[4px] pl-[20px] text-[14px] text-body">
            {configuration.unconfirmed.map((item) => (
              <li key={item.id}>{item.summary}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
