import type { PropertySummary } from "@/lib/domain/types";
import {
  ServiceError,
  type EnquiryService,
  type CreditService,
  type LeadMarketService,
  type NotificationService,
  type ProfileService,
  type BuilderAccountService,
  type BuilderEnquiryService,
  type ListingService,
  type LeadRequestService,
  type OwnerListingService,
  type VerificationService,
  type SellerAccountService,
  type SupportService,
  type HomepageContent,
  type Paged,
  type PropertyService,
  type Services,
  AdminService,
} from "@/lib/services/contracts";
import * as accountStore from "./account-store";
import * as enquiryStore from "./enquiry-store";
import * as adminStore from "./admin-store";
import * as sellerStore from "./seller-store";
import * as builderStore from "./builder-store";
import * as leadRequestStore from "./lead-request-store";
import * as ownerListingStore from "./owner-listing-store";
import * as verificationStore from "./verification-store";
import {
  builderCredits,
  builderLeadMarket,
  builderSupport,
  reconcileBuilder,
  resetBuilderModules,
  setBuilderBalanceForReview,
  setBuilderPaymentOutcomeForReview,
} from "./builder-modules";
import { buyerEnquiriesForBuilder, livePortalProperties } from "./portal-bridge";
import {
  SAMPLE_ENQUIRIES,
  SAMPLE_LOCALITIES,
  sampleDetailFor,
} from "./fixtures";
import {
  LAUNCH_CITY_ID,
  areaLabel,
  childrenOf,
  displayPath,
  getLocation,
  isWithin,
  searchAreas,
} from "./locations";
import type { LocationService } from "@/lib/services/contracts";
import {
  PURCHASED_EXPORT_CONTENT_TYPE, purchasedLeadsFilename,
} from "@/lib/domain/purchased-export";

/**
 * Sample implementation of the service contracts.
 *
 * Read paths return fixtures. Write paths record nothing and reach nothing — they
 * return a synthetic reference so the journey continues, and every screen that
 * calls one states that the action was simulated. No OTP is sent, no notification
 * is delivered, no payment is taken.
 *
 * This module is the only place sample behaviour lives. Components never branch
 * on it beyond rendering the "simulated" labelling.
 */

const PAGE_SIZE = 9;

function matches(property: PropertySummary, filters: Parameters<PropertyService["search"]>[0]["filters"]): boolean {
  if (filters.locationId) {
    // Id-based, hierarchical (CR05): a locality covers its sub-localities.
    // An unknown id matches nothing rather than everything.
    if (!isWithin(property.locationId, filters.locationId)) return false;
  }
  if (filters.configurations && filters.configurations.length > 0) {
    const wanted = new Set(filters.configurations.map((c) => c.replace(/\D/g, "")));
    if (!property.configurations.some((c) => wanted.has(c))) return false;
  }
  if (filters.transaction && property.transaction !== filters.transaction) return false;
  if (filters.construction && property.construction !== filters.construction) return false;
  if (filters.newLaunchOnly && !property.newLaunch) return false;
  if (filters.reraOnly && !property.reraRegistered) return false;
  if (filters.maxBudgetInr !== undefined) {
    const low = property.price.minInr;
    if (low !== null && low > filters.maxBudgetInr) return false;
  }
  if (filters.minBudgetInr !== undefined) {
    const high = property.price.maxInr;
    if (high !== null && high < filters.minBudgetInr) return false;
  }
  return true;
}

function sorted(items: readonly PropertySummary[], sort: string): readonly PropertySummary[] {
  const copy = [...items];
  switch (sort) {
    case "price_asc":
      return copy.sort((a, b) => (a.price.minInr ?? 0) - (b.price.minInr ?? 0));
    case "price_desc":
      return copy.sort((a, b) => (b.price.maxInr ?? 0) - (a.price.maxInr ?? 0));
    case "newest":
      return copy.reverse();
    default:
      return copy;
  }
}

/**
 * What the portal currently shows.
 *
 * Not `SAMPLE_PROPERTIES` directly: three of those belong to the sample Builder,
 * and unpublishing one in the Builder console has to remove it from the portal.
 * See portal-bridge.ts — this is the listing-to-portal continuity the approved
 * prototype leaves disconnected.
 */
function live() {
  return livePortalProperties();
}

/**
 * The location service (CR05) over the central records in locations.ts.
 *
 * Read-only here: maintaining state, city and locality records is a
 * kkl-backend capability (change-confirmation decision 8 is open), so the
 * sample exposes lookups and search but no writes.
 */
const locationService: LocationService = {
  async launchChain() {
    return [getLocation("in"), getLocation("in-wb"), getLocation(LAUNCH_CITY_ID)].filter(
      (n): n is NonNullable<typeof n> => n !== null,
    );
  },
  async children(parentId) {
    return childrenOf(parentId);
  },
  async areaOptions({ cityId, query }) {
    return searchAreas(cityId, query ?? "").map((a) => ({ id: a.id, label: areaLabel(a.id) }));
  },
  async displayPath(locationId) {
    return displayPath(locationId);
  },
  async getMany(ids) {
    return ids.map((id) => getLocation(id)).filter((n): n is NonNullable<typeof n> => n !== null);
  },
};

/** Every area in the launch city — the list the search pickers offer. */
const propertyService: PropertyService = {
  async getHomepage(): Promise<HomepageContent> {
    const bySlug = (slug: string) => live().find((p) => p.slug === slug) ?? null;
    const hero = bySlug("ivy-court-action-area-i");

    return {
      featuredHero: hero,
      // The three cards under "Featured properties", in the approved order.
      featuredProperties: ["greenview-residency", "lakeshore-heights", "sundew-enclave"]
        .map(bySlug)
        .filter((p): p is NonNullable<typeof p> => p !== null),
      // The two wide cards under "Featured projects".
      featuredProjects: ["orchid-grove", "riverside-commons"]
        .map(bySlug)
        .filter((p): p is NonNullable<typeof p> => p !== null),
      localities: SAMPLE_LOCALITIES,
      totalPublishedListings: live().length,
    };
  },

  async search({ filters, sort, page }): Promise<Paged<PropertySummary>> {
    const all = sorted(live().filter((p) => matches(p, filters)), sort);
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: all.slice(start, start + PAGE_SIZE),
      total: all.length,
      page,
      pageSize: PAGE_SIZE,
    };
  },

  async getBySlug(slug) {
    const summary = live().find((p) => p.slug === slug);
    if (!summary) {
      throw new ServiceError("not_found", `No published listing with slug "${slug}".`);
    }
    return sampleDetailFor(summary);
  },

  async countMatching(filters) {
    return live().filter((p) => matches(p, filters)).length;
  },

  /**
   * Locality and configuration are hard requirements; budget and timing move a
   * project up or down. The score is computed here, in the service, because the
   * real one will be computed by kkl-backend — never in the browser.
   */
  async match(requirement) {
    const scored = live().filter((p) => {
      const localityOk =
        !requirement.locationId || isWithin(p.locationId, requirement.locationId);
      const configOk =
        requirement.configurations.length === 0 ||
        p.configurations.some((c) => requirement.configurations.includes(c));
      return localityOk && configOk;
    }).map((property) => {
      // Budget carries the most weight of the soft signals: a project well over
      // what someone can spend should not read as a strong match just because the
      // locality and configuration line up.
      let score = 45;

      const low = property.price.minInr ?? 0;
      const high = property.price.maxInr ?? Number.MAX_SAFE_INTEGER;
      const wantMax = requirement.maxBudgetInr;
      const wantMin = requirement.minBudgetInr;
      const budgetOverlaps =
        (wantMax === null || low <= wantMax) && (wantMin === null || high >= wantMin);
      if (budgetOverlaps) score += 30;

      const ready = property.construction === "ready_to_move";
      if (requirement.handoverTiming === "Ready to move" && ready) score += 15;
      else if (requirement.handoverTiming === "1–2 years, no rush" && !ready) score += 10;
      else if (requirement.handoverTiming) score += 5;

      if (requirement.intent === "investment" && property.newLaunch) score += 8;
      if (requirement.intent === "end_use" && ready) score += 8;

      return { property, matchScore: Math.min(score, 99) };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore);
  },
};

/**
 * Enquiry writes are simulated: nothing is sent to a builder and no notification
 * is delivered. They are, however, genuinely idempotent — see enquiry-store.ts,
 * which also documents the limits of an in-process store.
 */
const enquiryService: EnquiryService = {
  async submitEnquiry(input) {
    return enquiryStore.submit(input);
  },

  async listMine() {
    // Fixtures for the populated state, plus anything submitted this session so
    // the journey stays coherent from confirmation through to tracking.
    return [...enquiryStore.submittedEnquiries(), ...SAMPLE_ENQUIRIES];
  },

  async getMine(id) {
    const found =
      enquiryStore.findByReference(id) ?? SAMPLE_ENQUIRIES.find((e) => e.id === id);
    if (!found) throw new ServiceError("not_found", `No enquiry ${id} on this account.`);
    return found;
  },

  async getByReceipt(receipt) {
    return enquiryStore.findByReceipt(receipt);
  },
};

/**
 * Profile (P-15) and notifications (P-16).
 *
 * Saving changes a value in this process. It does not update a real account, and
 * it does not change any preference at WhatsApp or an email provider — the
 * screens say so rather than implying the change took effect anywhere.
 */
const profileService: ProfileService = {
  async get() {
    return accountStore.getProfile();
  },
  async save(input) {
    return accountStore.saveProfile(input);
  },
};

const notificationService: NotificationService = {
  async list() {
    return accountStore.listNotifications();
  },
  async markRead(id) {
    accountStore.markRead(id);
  },
  async markAllRead() {
    accountStore.markAllRead();
  },
  async unreadCount() {
    return accountStore.unreadCount();
  },
};

/**
 * Seller area (S-01 to S-25).
 *
 * Everything below is a thin pass-through to seller-store.ts, which documents
 * what it is: process memory with one Seller, no sign-in and no money. These
 * methods are not authentication, KYC, ownership or wallet operations, and the
 * screens that call them say so.
 */
const sellerAccountService: SellerAccountService = {
  async get() {
    return sellerStore.getAccount();
  },
  async saveBusiness(input) {
    return sellerStore.saveBusiness(input);
  },
  async submitKyc(input) {
    return sellerStore.submitKyc(input);
  },
  async kycTimeline() {
    return sellerStore.kycTimeline();
  },
  async saveProfile(input) {
    return sellerStore.saveProfile(input);
  },
  async billingDetails() {
    return sellerStore.getBilling();
  },
  async saveBillingDetails(input) {
    return sellerStore.saveBilling(input);
  },
};

const leadMarketService: LeadMarketService = {
  async list(query) {
    return sellerStore.listLeads(query);
  },
  async get(id) {
    return sellerStore.getLead(id);
  },
  async purchase(input) {
    return sellerStore.purchaseLead(input);
  },
  async listPurchased() {
    return sellerStore.listPurchased();
  },
  async getPurchased(id) {
    return sellerStore.getPurchased(id);
  },

  // CR04 — order history. No account parameter: the store answers for the
  // caller's own identity, so there is nothing here that could ask for
  // somebody else's orders.
  async listOrders() {
    return sellerStore.listOrders();
  },
  async getOrder(reference) {
    return sellerStore.getOrder(reference);
  },
  async exportPurchased({ ids }) {
    // Filename and content type come from the shared module too. This one
    // re-typed both, which is how the three export paths drift apart.
    return {
      filename: purchasedLeadsFilename(),
      contentType: PURCHASED_EXPORT_CONTENT_TYPE,
      body: sellerStore.exportPurchasedCsv(ids),
    };
  },
};

/**
 * CR03 — Request Leads, over the sample store.
 *
 * The journey is real end to end: a request created here is listed here and
 * appears in the Admin queue, and public replies and status moves travel back.
 * The storage is process memory and says so — see lead-request-store.ts for
 * what that does and does not satisfy.
 */
const leadRequestService: LeadRequestService = {
  async create(input) {
    return leadRequestStore.createRequest(input);
  },
  async listMine() {
    return leadRequestStore.listMine();
  },
  async getMine(id) {
    const found = leadRequestStore.getMine(id);
    if (!found) throw new ServiceError("not_found", `No lead request ${id} on this account.`);
    return found;
  },
};

const creditService: CreditService = {
  async availability() {
    // Sample mode simulates the money, so every action is available —
    // and every screen using it is labelled sample. The real service
    // reports the four blockers separately.
    const open = { available: true, reason: null, code: null };
    return {
      purchase: open, recharge: open, refund: open, invoice: open,
      creditExpiry: { configured: false, reason: null, code: null },
    };
  },
  async wallet() {
    return sellerStore.wallet();
  },
  async usageByMonth() {
    return sellerStore.usageByMonth();
  },
  async ledger(filter) {
    return sellerStore.getLedger(filter);
  },
  async recharge(input) {
    return sellerStore.recharge(input);
  },
  async invoices() {
    return sellerStore.listInvoices();
  },
  async invoice(id) {
    return sellerStore.getInvoice(id);
  },
};

const supportService: SupportService = {
  async listTickets() {
    return sellerStore.listTickets();
  },
  async getThread(reference) {
    return sellerStore.getThread(reference);
  },
  async createTicket(input) {
    return sellerStore.createTicket(input);
  },
  async reply(input) {
    const thread = sellerStore.replyToTicket(input);
    if (!thread) throw new ServiceError("not_found", `No ticket ${input.reference}.`);
    return thread;
  },
  async resolve(reference) {
    const thread = sellerStore.resolveTicket(reference);
    if (!thread) throw new ServiceError("not_found", `No ticket ${reference}.`);
    return thread;
  },
};

/**
 * Sample-only review controls, exported from here rather than reached by
 * importing seller-store directly.
 *
 * Route handlers and pages are bundled separately, so two import paths to the
 * same module can end up as two module instances with two copies of the state.
 * That is exactly what happened: the review route set a balance and the pages
 * kept showing the old one. Everything that mutates sample state now travels
 * the one path the pages already use — @/lib/services — so there is a single
 * instance by construction.
 */
/**
 * The staff console, over the Admin store.
 *
 * Every method is a thin pass-through. The rules that matter — a reason on
 * every decision, the checklist before an approval, which console a reply is
 * delivered to — live in the store, not here, so a second caller cannot skip
 * them by going round this object.
 */
const adminService: AdminService = {
  async dashboard() {
    return {
      queues: adminStore.queueTiles(),
      volumes: adminStore.dashboardVolumes(),
      alerts: adminStore.dashboardAlerts(),
    };
  },

  async listAccounts() {
    return adminStore.listAccounts();
  },
  async getAccount(accountId) {
    return adminStore.getAccount(accountId);
  },
  async setSuspension(input) {
    return adminStore.setAccountSuspension(input);
  },

  async listApplications(filter) {
    return adminStore.listApplications(filter);
  },
  async getApplication(id) {
    return adminStore.getApplication(id);
  },
  async setDocumentVerdict(input) {
    adminStore.setDocumentVerdict(input);
  },
  async toggleCheck(input) {
    adminStore.toggleCheck(input);
  },
  async decideApplication(input) {
    return adminStore.decideApplication(input);
  },

  async listListings(filter) {
    return adminStore.listModeratedListings(filter);
  },
  async getListing(id) {
    return adminStore.getModeratedListing(id);
  },
  async moderateListing(input) {
    return adminStore.moderateListing(input);
  },

  async intake() {
    return { sources: adminStore.intakeSources(), runs: adminStore.intakeRuns() };
  },
  async getIntakeRun(id) {
    const run = adminStore.intakeRun(id);
    return run ? { run, rejections: adminStore.intakeRejections() } : null;
  },
  async listLeads(state) {
    return adminStore.listLeads(state);
  },
  async getLead(id) {
    return adminStore.getLead(id);
  },
  async priceBands() {
    return adminStore.priceBands();
  },

  // CR03 — the lead-requests queue, over the same store the Seller writes to.
  async listLeadRequests(filter) {
    return leadRequestStore.listRequests(filter);
  },
  async getLeadRequest(id) {
    return leadRequestStore.getRequest(id);
  },
  async respondToLeadRequest(input) {
    const result = leadRequestStore.respondToRequest(input);
    if (!result.ok) return result;
    // Same rule as ticket replies: the message on the record is the record,
    // so there is no separate audit entry.
    return { ok: true, auditId: "—" };
  },
  async setLeadRequestStatus(input) {
    // Capture the status BEFORE the mutation: the store returns its live
    // record, not a copy, so reading it afterwards would always compare equal.
    const previousStatus = leadRequestStore.getRequest(input.requestId)?.status;
    const reference = leadRequestStore.getRequest(input.requestId)?.reference;
    const result = leadRequestStore.setRequestStatus(input);
    if (!result.ok) return result;
    if (previousStatus !== undefined && previousStatus !== input.status) {
      const auditId = adminStore.recordAudit({
        actor: input.actor,
        category: "support",
        action: "Lead request status changed",
        subject: input.requestId,
        subjectLabel: `Lead request ${reference ?? input.requestId}`,
        reason: input.note?.trim() || "Status updated from the lead-requests queue",
        changes: [{ field: "status", before: previousStatus, after: input.status }],
      });
      return { ok: true, auditId };
    }
    return { ok: true, auditId: "—" };
  },

  // CR02 — the owner-submission queue, over the same store the owner writes to.
  async listOwnerListings(filter) {
    return ownerListingStore.listForStaff(filter);
  },
  async getOwnerListing(id) {
    return ownerListingStore.getForStaff(id);
  },
  async respondToOwnerListing(input) {
    const result = ownerListingStore.staffRespond(input);
    if (!result.ok) return result;
    // Same rule as ticket replies and CR03: the message on the record is the
    // record, so there is no separate audit entry.
    return { ok: true, auditId: "—" };
  },
  async decideOwnerListing(input) {
    const result = ownerListingStore.staffDecide(input);
    if (!result.ok) return result;
    const auditId = adminStore.recordAudit({
      actor: input.actor,
      category: "listings",
      action: "Owner listing reviewed",
      subject: input.listingId,
      subjectLabel: `Owner listing ${result.reference}`,
      reason: input.reason.trim(),
      changes: [{ field: "status", before: result.from, after: result.to }],
    });
    return { ok: true, auditId };
  },

  // CR07 — the split queue. Two lists, not one with a filter: a routine case
  // still with the provider must not sit in the same pile as one waiting on a
  // person, and must not disappear either.
  async verificationQueues() {
    return verificationStore.staffQueues();
  },
  async getVerificationCase(reference) {
    return verificationStore.getCase(reference);
  },
  async decideVerificationCase(input) {
    const result = verificationStore.decideCase(input);
    if (!result.ok) return result;
    const auditId = adminStore.recordAudit({
      actor: input.actor,
      category: "accounts",
      action: "Verification case decided",
      subject: input.reference,
      subjectLabel: `Verification case ${input.reference}`,
      reason: input.reason.trim(),
      changes: [{ field: "outcome", before: result.from, after: result.to }],
    });
    return { ok: true, auditId };
  },

  async listOrders(filter) {
    return adminStore.listOrders(filter);
  },
  async getOrder(id) {
    return adminStore.getOrder(id);
  },
  async listWallets() {
    return adminStore.listWallets();
  },
  async walletLedger(accountId) {
    return adminStore.walletLedger(accountId);
  },
  async adjustCredits(input) {
    return adminStore.adjustCredits(input);
  },
  async listRefunds() {
    return adminStore.listRefunds();
  },
  async decideRefund(input) {
    return adminStore.decideRefund(input);
  },
  async listSubscriptions(filter) {
    return adminStore.listSubscriptions(filter);
  },

  async listTickets(filter) {
    return adminStore.listTickets(filter);
  },
  async getThread(reference) {
    return adminStore.getThread(reference);
  },
  async replyToTicket(input) {
    return adminStore.replyToTicket(input);
  },
  async resolveTicket(input) {
    return adminStore.resolveTicket(input);
  },

  async voice() {
    return { stats: adminStore.voiceStats(), calls: adminStore.listCalls() };
  },
  async getCall(id) {
    return adminStore.getCall(id);
  },
  async whatsapp() {
    return {
      funnel: adminStore.whatsappFunnel(),
      conversations: adminStore.whatsappConversations(),
    };
  },
  async consent() {
    return {
      suppression: adminStore.suppressionList(),
      effects: adminStore.suppressionEffects(),
      bases: adminStore.consentBases(),
    };
  },
  async listNotifications(filter) {
    return adminStore.listNotifications(filter);
  },

  async funnelReport() {
    return adminStore.funnel();
  },
  async listAudit(category) {
    return adminStore.listAudit(category);
  },
  async getAudit(id) {
    return adminStore.getAudit(id);
  },
  async system() {
    return { integrations: adminStore.integrations(), failures: adminStore.jobFailures() };
  },
};

export const sampleReviewControls = {
  setKycStatus: sellerStore.setKycStatusForReview,
  setAccountStatus: sellerStore.setAccountStatusForReview,
  setPaymentOutcome: sellerStore.setPaymentOutcomeForReview,
  setBalance: sellerStore.setBalanceForReview,
  // CR07: stands in for the verification provider's answer. Not a policy knob —
  // the policy is in verification-policy.ts and is not review-settable.
  setVerificationProviderResult: verificationStore.setProviderResultForReview,
  reset: () => {
    sellerStore.resetForReview();
    // The Admin console reads the Seller's verification, status and wallet, and
    // writes decisions back into them. Resetting one without the other would
    // leave the two views disagreeing, which is exactly what this console is
    // supposed to make impossible.
    adminStore.resetForReview();
    // CR03: lead requests live in their own store but are visible from both
    // the Seller console and the Admin queue — same argument as above.
    leadRequestStore.resetLeadRequestsForReview();
    // CR02: owner submissions are written from the public owner journey and read
    // from the Admin queue — the same argument again. A reset that left them
    // behind would make "this submission was not here before" fail on a second
    // run of the same script.
    ownerListingStore.resetOwnerListings();
    // CR07: verification cases are written from the console and read from the
    // Admin queue, so the same argument applies again.
    verificationStore.resetVerification();
  },
  /** The ledger invariant, so a test can assert it instead of trusting a comment. */
  reconcile: sellerStore.reconcile,
  builder: {
    setKycStatus: builderStore.setKycStatusForReview,
    setAccountStatus: builderStore.setAccountStatusForReview,
    setSubscriptionState: builderStore.setSubscriptionStateForReview,
    setSubscriptionOutcome: builderStore.setSubscriptionOutcomeForReview,
    setContactAccess: builderStore.setContactAccessForReview,
    setPaymentOutcome: setBuilderPaymentOutcomeForReview,
    setBalance: setBuilderBalanceForReview,
    reconcile: reconcileBuilder,
    reset: () => {
      builderStore.resetForReview();
      resetBuilderModules();
      // B-16 lists Buyer enquiries from the public portal alongside the seeded
      // ones, so a Builder reset that left those behind would not be a reset:
      // the console would reopen carrying the last review pass's enquiries, and
      // a test asserting "this enquiry was not here before" would fail on its
      // own second run.
      enquiryStore.resetForReview();
      adminStore.resetForReview();
    },
  },
} as const;

/**
 * Builder console (B-01 to B-24).
 *
 * The account, listings and enquiries are Builder-specific; the marketplace,
 * credits and support are the same three interfaces the Seller uses, over the
 * Builder's own records (builder-modules.ts).
 */
const builderAccountService: BuilderAccountService = {
  async get() {
    return builderStore.getAccount();
  },
  async saveCompany(input) {
    return builderStore.saveCompany(input);
  },
  async submitVerification(input) {
    return builderStore.submitVerification(input);
  },
  async verificationTimeline() {
    return builderStore.verificationTimeline();
  },
  async startSubscription(input) {
    return builderStore.startSubscription(input);
  },
  async saveAlerts(input) {
    return builderStore.saveAlerts(input);
  },
};

const listingService: ListingService = {
  async list(filter) {
    return builderStore.listSummaries(filter);
  },
  async get(id) {
    return builderStore.getListing(id);
  },
  async create() {
    return builderStore.createListing();
  },
  async saveSection(input) {
    return builderStore.saveSection(input);
  },
  async sections(id) {
    return builderStore.sections(id);
  },
  async publishBlockers(id) {
    const listing = builderStore.getListing(id);
    return listing ? builderStore.publishBlockers(listing) : [];
  },
  async publish(id) {
    return builderStore.publishListing(id);
  },
  async unpublish(id) {
    return builderStore.unpublishListing(id);
  },
  async remove(id) {
    return builderStore.removeListing(id);
  },
};

const builderEnquiryService: BuilderEnquiryService = {
  async list(filter) {
    // The Buyer enquiries are passed in rather than read inside the store, so
    // the dependency runs one way. See portal-bridge.ts.
    return builderStore.listEnquiries(buyerEnquiriesForBuilder(), filter);
  },
  async get(id) {
    const seed =
      builderStore.findSeedEnquiry(id) ??
      buyerEnquiriesForBuilder().find((e) => e.id === id);
    return seed ? builderStore.projectOne(seed) : null;
  },
  async markRead(id) {
    builderStore.markEnquiryRead(id);
  },
  async unreadCount() {
    return builderStore.listEnquiries(buyerEnquiriesForBuilder(), { unreadOnly: true }).length;
  },
  async contactAccessMode() {
    // Sample mode always has an alternative selected, because selecting one
    // is what a reviewer came here to look at. The real service reports
    // `awaiting_decision`, which sample data cannot honestly claim to be.
    const mode = builderStore.contactAccessMode();
    return {
      state: "available" as const,
      selectedMode: mode,
      label: `Showing the ${mode.replace(/_/g, " ")} alternative`,
      detail: "Sample data: a reviewer selected this alternative. No rule has been confirmed.",
      question: "Q-2a",
      candidateModes: ["included_free", "included_with_subscription", "paid_unlock"] as const,
      unlockPriceCredits: null,
    };
  },

  /**
   * Alternative B only. Spends credits from the Builder's own balance to reveal
   * one enquiry's contact.
   *
   * Under alternative A this is `not_applicable` rather than a silent success:
   * the two alternatives are genuinely different products, and a screen that
   * charged for something already included would be the worst of both.
   */
  async unlockContact(input) {
    if (builderStore.contactAccessMode() !== "paid_unlock") return { kind: "not_applicable" };

    const seed =
      builderStore.findSeedEnquiry(input.id) ??
      buyerEnquiriesForBuilder().find((e) => e.id === input.id);
    if (!seed) return { kind: "not_applicable" };

    if (builderStore.isUnlocked(input.id)) {
      return { kind: "unlocked", enquiry: builderStore.projectOne(seed), duplicate: true };
    }

    const price = builderStore.unlockPrice();
    const balance = builderStore.balance();
    if (balance < price) {
      return { kind: "insufficient_credits", priceCredits: price, balanceCredits: balance };
    }

    const fresh = builderStore.recordUnlock({ id: input.id, idempotencyKey: input.idempotencyKey });
    if (fresh) {
      builderStore.postEntry({
        type: "lead_purchase",
        description: `Contact unlock ${input.id}`,
        deltaCredits: -price,
        reference: `UNL-${input.id}`,
      });
    }
    return { kind: "unlocked", enquiry: builderStore.projectOne(seed), duplicate: !fresh };
  },
};

/**
 * CR02 — the individual owner's posting journey.
 *
 * The owner is not an input to any of these. The store associates the single
 * sample owner, and the screens say so; no form field names the account.
 */
const ownerListingService: OwnerListingService = {
  async listMine() {
    return ownerListingStore.listMine();
  },
  async getMine(id) {
    const found = ownerListingStore.getMine(id);
    if (found === null) {
      // Missing and not-yours are the same answer, so ownership cannot be
      // probed by guessing identifiers.
      throw new ServiceError("not_found", "That listing could not be found.");
    }
    return found;
  },
  async startDraft(input) {
    return ownerListingStore.startDraft(input);
  },
  async saveStep(input) {
    return ownerListingStore.saveStep(input);
  },
  async blockers(listingId) {
    return ownerListingStore.blockers(listingId);
  },
  async submit(input) {
    return ownerListingStore.submit(input);
  },
  async withdraw(input) {
    return ownerListingStore.withdraw(input);
  },
  async reply(input) {
    return ownerListingStore.reply(input);
  },
};

/**
 * CR07 — verification, per action.
 *
 * The role is not an input either: it comes from the account the store holds.
 * In this build that is the one sample Seller, and the screens say so.
 */
const verificationService: VerificationService = {
  async requirements() {
    return verificationStore.requirements("seller");
  },
  async listMine() {
    return verificationStore.listCases();
  },
  async start(action) {
    return verificationStore.startCase(action);
  },
  async submit(reference) {
    return verificationStore.submitToProvider(reference);
  },
};

export const sampleServices: Services = {
  properties: propertyService,
  enquiries: enquiryService,
  profile: profileService,
  notifications: notificationService,
  locations: locationService,
  sellerAccount: sellerAccountService,
  leadMarket: leadMarketService,
  leadRequests: leadRequestService,
  ownerListings: ownerListingService,
  verification: verificationService,
  credits: creditService,
  support: supportService,
  builder: {
    account: builderAccountService,
    listings: listingService,
    enquiries: builderEnquiryService,
    leadMarket: builderLeadMarket,
    credits: builderCredits,
    support: builderSupport,
  },
  admin: adminService,
  isSample: true,
};
