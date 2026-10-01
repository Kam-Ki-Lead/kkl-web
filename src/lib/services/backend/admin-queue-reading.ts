/**
 * Readings of the admin KYC and live-property pages.
 *
 * Contract: kkl-backend `docs/api/v1.yaml` `1.0.0-phase3.n`.
 * These functions do not call a server. A fixture here is not a row in
 * `kkl_review`, and a takedown here is not a published listing.
 *
 * KYC applications are required-action verification cases. Property review
 * is listings whose status is published or unpublished. Owner submissions
 * stay on `/v1/listings/queue`.
 */

export const ADMIN_QUEUE_LIMIT = 50;

export const KYC_FILTERS = ["pending", "ageing", "resubmitted", "all"] as const;
export type KycFilter = (typeof KYC_FILTERS)[number];

export const PROPERTY_FILTERS = ["published", "unpublished", "reported", "all"] as const;
export type PropertyFilter = (typeof PROPERTY_FILTERS)[number];

export type Capability = {
  readonly available: boolean | null;
  readonly reachable: boolean | null;
  readonly code: string | null;
  readonly dependency: string | null;
  readonly message: string;
};

export type KycApplicationView = {
  readonly id: string;
  readonly source: "verification_case";
  readonly accountId: string;
  readonly applicantName: string | null;
  readonly role: string;
  readonly action: string;
  readonly outcome: string;
  readonly state: "pending" | "ageing";
  readonly submittedAt: string;
  readonly waitingSeconds: number;
  readonly decision: "rejected" | null;
  readonly documents: Capability;
  readonly checks: Capability;
  readonly approval: Capability;
  readonly events: readonly {
    readonly at: string;
    readonly outcome: string;
    readonly actorLabel: string;
    readonly note: string | null;
    readonly visibility: string;
  }[];
};

export type KycPageView = {
  readonly filter: KycFilter;
  readonly applications: readonly KycApplicationView[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly documents: Capability;
  readonly checks: Capability;
  readonly approval: Capability;
  readonly resubmission: Capability;
};

export type ModeratedPropertyView = {
  readonly id: string;
  readonly reference: string;
  readonly name: string | null;
  readonly postedAs: string;
  readonly accountName: string | null;
  readonly locality: string | null;
  readonly state: "published" | "unpublished";
  readonly outcome: "unpublished" | null;
  readonly note: string;
  readonly history: readonly {
    readonly from: string | null;
    readonly to: string;
    readonly reason: string;
    readonly actorLabel: string;
    readonly at: string;
  }[];
};

export type PropertyPageView = {
  readonly filter: PropertyFilter;
  readonly listings: readonly ModeratedPropertyView[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly publication: Capability;
  readonly reports: Capability;
};

const UNDESCRIBED = "This capability was not described. It is not treated as ready.";

export function readCapability(value: unknown): Capability {
  if (!value || typeof value !== "object") {
    return { available: null, reachable: null, code: null, dependency: null, message: UNDESCRIBED };
  }
  const row = value as Record<string, unknown>;
  const message = typeof row.message === "string" && row.message.trim() ? row.message : UNDESCRIBED;
  return {
    available: row.available === true ? true : row.available === false ? false : null,
    reachable: row.reachable === true ? true : row.reachable === false ? false : null,
    code: typeof row.code === "string" ? row.code : null,
    dependency: typeof row.dependency === "string" ? row.dependency : null,
    message,
  };
}

/** A capability is blocked unless the payload says it is available or reachable. */
export function capabilityBlocked(state: Capability): boolean {
  if (state.available === false || state.reachable === false) return true;
  return state.available !== true && state.reachable !== true;
}

export function isKycFilter(value: string): value is KycFilter {
  return (KYC_FILTERS as readonly string[]).includes(value);
}

export function isPropertyFilter(value: string): value is PropertyFilter {
  return (PROPERTY_FILTERS as readonly string[]).includes(value);
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function readApplication(value: unknown): KycApplicationView | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const accountId = text(row.accountId);
  const role = text(row.role);
  const action = text(row.action);
  const outcome = text(row.outcome);
  const submittedAt = text(row.submittedAt);
  const waitingSeconds = integer(row.waitingSeconds);
  if (!id || !accountId || !role || !action || !outcome || !submittedAt || waitingSeconds === null) {
    return null;
  }
  if (row.source !== "verification_case") return null;
  if (row.state !== "pending" && row.state !== "ageing") return null;
  if (row.decision !== null && row.decision !== "rejected") return null;
  const decision = row.decision === "rejected" ? "rejected" : null;
  const events = Array.isArray(row.events) ? row.events : null;
  if (!events) return null;
  const parsedEvents = [];
  for (const event of events) {
    if (!event || typeof event !== "object") return null;
    const item = event as Record<string, unknown>;
    const at = text(item.at);
    const eventOutcome = text(item.outcome);
    const actorLabel = text(item.actorLabel);
    if (!at || !eventOutcome || !actorLabel) return null;
    parsedEvents.push({
      at,
      outcome: eventOutcome,
      actorLabel,
      note: item.note === null || item.note === undefined ? null : text(item.note),
      visibility: text(item.visibility) ?? "unspecified",
    });
  }
  return {
    id,
    source: "verification_case",
    accountId,
    applicantName: row.applicantName === null ? null : text(row.applicantName),
    role,
    action,
    outcome,
    state: row.state,
    submittedAt,
    waitingSeconds,
    decision,
    documents: readCapability(row.documents),
    checks: readCapability(row.checks),
    approval: readCapability(row.approval),
    events: parsedEvents,
  };
}

export function readKycPage(body: unknown): KycPageView | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (typeof row.filter !== "string" || !isKycFilter(row.filter)) return null;
  const total = integer(row.total);
  const limit = integer(row.limit);
  const offset = integer(row.offset);
  if (total === null || limit === null || offset === null || !Array.isArray(row.applications)) return null;
  if (row.source !== "verification_cases") return null;
  const applications: KycApplicationView[] = [];
  for (const item of row.applications) {
    const application = readApplication(item);
    if (!application) return null;
    applications.push(application);
  }
  return {
    filter: row.filter,
    applications,
    total,
    limit,
    offset,
    documents: readCapability(row.documents),
    checks: readCapability(row.checks),
    approval: readCapability(row.approval),
    resubmission: readCapability(row.resubmission),
  };
}

function readListing(value: unknown): ModeratedPropertyView | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = text(row.id);
  const reference = text(row.reference);
  const postedAs = text(row.postedAs);
  const note = typeof row.note === "string" ? row.note : null;
  if (!id || !reference || !postedAs || note === null) return null;
  if (row.source !== "listing" || row.submissionQueue !== false) return null;
  if (row.state !== "published" && row.state !== "unpublished") return null;
  if (row.outcome !== null && row.outcome !== "unpublished") return null;
  const history = Array.isArray(row.history) ? row.history : null;
  if (!history) return null;
  const entries = [];
  for (const item of history) {
    if (!item || typeof item !== "object") return null;
    const entry = item as Record<string, unknown>;
    const to = text(entry.to);
    const reason = typeof entry.reason === "string" ? entry.reason : null;
    const actorLabel = text(entry.actorLabel);
    const at = text(entry.at);
    if (!to || reason === null || !actorLabel || !at) return null;
    entries.push({
      from: entry.from === null ? null : text(entry.from),
      to,
      reason,
      actorLabel,
      at,
    });
  }
  return {
    id,
    reference,
    name: row.name === null ? null : text(row.name),
    postedAs,
    accountName: row.accountName === null ? null : text(row.accountName),
    locality: row.locality === null ? null : text(row.locality),
    state: row.state,
    outcome: row.outcome,
    note,
    history: entries,
  };
}

export function readPropertyPage(body: unknown): PropertyPageView | null {
  if (!body || typeof body !== "object") return null;
  const row = body as Record<string, unknown>;
  if (typeof row.filter !== "string" || !isPropertyFilter(row.filter)) return null;
  const total = integer(row.total);
  const limit = integer(row.limit);
  const offset = integer(row.offset);
  if (total === null || limit === null || offset === null || !Array.isArray(row.listings)) return null;
  if (row.source !== "listings" || row.excludes !== "owner_submissions") return null;
  const listings: ModeratedPropertyView[] = [];
  for (const item of row.listings) {
    const listing = readListing(item);
    if (!listing) return null;
    listings.push(listing);
  }
  return {
    filter: row.filter,
    listings,
    total,
    limit,
    offset,
    publication: readCapability(row.publication),
    reports: readCapability(row.reports),
  };
}

export function readModeratedProperty(body: unknown): ModeratedPropertyView | null {
  return readListing(body);
}

export function readKycApplication(body: unknown): KycApplicationView | null {
  return readApplication(body);
}

export type KycListKind =
  | { readonly kind: "resubmission-unavailable"; readonly message: string }
  | { readonly kind: "past-end" }
  | { readonly kind: "empty-open"; readonly title: string; readonly body: string }
  | { readonly kind: "rows" };

/**
 * `resubmission.available === false` is the capability, including when the
 * page is empty. It is not a count of resubmitted applications.
 */
export function kycListKind(page: KycPageView): KycListKind {
  if (page.filter === "resubmitted" && capabilityBlocked(page.resubmission)) {
    return { kind: "resubmission-unavailable", message: page.resubmission.message };
  }
  if (page.applications.length === 0 && page.total > 0 && page.offset >= page.total) {
    return { kind: "past-end" };
  }
  if (page.applications.length === 0 && page.total === 0) {
    if (page.filter === "ageing") {
      return {
        kind: "empty-open",
        title: "None of the open cases are over 24 hours old",
        body: "Ageing classifies an open case by when it was opened. It does not approve the case and it does not promise a response time.",
      };
    }
    return {
      kind: "empty-open",
      title: "No open application is waiting",
      body: page.filter === "all"
        ? "This list is open cases only. A failed or expired case is not listed here."
        : "Open required cases appear here. A failed case leaves this list.",
    };
  }
  return { kind: "rows" };
}

export function kycFilterCaption(filter: KycFilter): string | null {
  if (filter === "all") {
    return "Open cases only. A failed or expired case is not listed here.";
  }
  if (filter === "ageing") {
    return "Opened more than 24 hours ago. That classification does not approve a case and does not promise a response time.";
  }
  if (filter === "pending") {
    return "Open required cases. Verification cases that the policy does not require are not in this queue.";
  }
  return null;
}

export type PropertyListKind =
  | { readonly kind: "reports-unavailable"; readonly message: string }
  | { readonly kind: "past-end" }
  | { readonly kind: "empty"; readonly title: string; readonly body: string }
  | { readonly kind: "rows" };

export function propertyListKind(page: PropertyPageView): PropertyListKind {
  if (page.filter === "reported" && capabilityBlocked(page.reports)) {
    return { kind: "reports-unavailable", message: page.reports.message };
  }
  if (page.listings.length === 0 && page.total > 0 && page.offset >= page.total) {
    return { kind: "past-end" };
  }
  if (page.listings.length === 0 && page.total === 0) {
    if (page.filter === "unpublished") {
      return {
        kind: "empty",
        title: "No listing has been taken down",
        body: "Unpublished here means staff took a published listing off the public path. Drafts and owner submissions are a different queue.",
      };
    }
    if (page.filter === "all") {
      return {
        kind: "empty",
        title: "No live or taken-down listing is stored",
        body: "This list is published and unpublished listings. It does not include drafts or owner submissions.",
      };
    }
    return {
      kind: "empty",
      title: "No listing is published",
      body: "A published row would appear here. Nothing in this queue creates one, and drafts stay on owner submissions.",
    };
  }
  return { kind: "rows" };
}

export const REPORTS_NOT_IN_COUNT =
  "Reports are not part of this count. Reporting is a separate capability.";

export const NOTIFICATION_RECORDED =
  "Taking a listing down records a notification for the account. This screen does not say that message was delivered.";

export function kycCountTile(input: { ok: false } | { ok: true; open: number; ageing: number | null }): {
  readonly value: number | null;
  readonly label: string;
  readonly note: string;
  readonly flag: string | null;
  readonly tone: "warning" | "neutral";
  readonly href: "/admin/kyc";
} {
  if (!input.ok) {
    return {
      value: null,
      label: "KYC applications",
      note: "The open-case count could not be read. The sample count is not shown.",
      flag: null,
      tone: "neutral",
      href: "/admin/kyc",
    };
  }
  const label = input.open === 1 ? "KYC application" : "KYC applications";
  if (input.ageing === null) {
    return {
      value: input.open,
      label,
      note: "Open required cases. The age split could not be read, so it is not shown as zero.",
      flag: null,
      tone: "neutral",
      href: "/admin/kyc",
    };
  }
  return {
    value: input.open,
    label,
    note: input.ageing > 0
      ? `${input.ageing} opened more than 24 hours ago`
      : "None opened more than 24 hours ago",
    flag: input.ageing > 0 ? `${input.ageing} over 24h` : null,
    tone: input.ageing > 0 ? "warning" : "neutral",
    href: "/admin/kyc",
  };
}

export function propertyCountTile(input: { ok: false } | { ok: true; total: number }): {
  readonly value: number | null;
  readonly label: string;
  readonly note: string;
  readonly flag: string | null;
  readonly tone: "neutral";
  readonly href: "/admin/properties";
} {
  if (!input.ok) {
    return {
      value: null,
      label: "Listings to review",
      note: "The live-property count could not be read. The sample count is not shown.",
      flag: null,
      tone: "neutral",
      href: "/admin/properties",
    };
  }
  return {
    value: input.total,
    label: "Listings to review",
    note: input.total === 0
      ? `No listing is published or unpublished. ${REPORTS_NOT_IN_COUNT}`
      : `Published and taken-down listings. ${REPORTS_NOT_IN_COUNT}`,
    flag: null,
    tone: "neutral",
    href: "/admin/properties",
  };
}

export function approvalIsAction(approval: Capability): boolean {
  return !capabilityBlocked(approval);
}

export function documentsArePackets(documents: Capability): boolean {
  return !capabilityBlocked(documents);
}
