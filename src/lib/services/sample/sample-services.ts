import type { PropertySummary } from "@/lib/domain/types";
import {
  ServiceError,
  type EnquiryService,
  type NotificationService,
  type ProfileService,
  type HomepageContent,
  type Paged,
  type PropertyService,
  type Services,
} from "@/lib/services/contracts";
import * as accountStore from "./account-store";
import * as enquiryStore from "./enquiry-store";
import {
  SAMPLE_ENQUIRIES,
  SAMPLE_LOCALITIES,
  SAMPLE_PROPERTIES,
  SAMPLE_TOTAL_LISTINGS,
  sampleDetailFor,
} from "./fixtures";

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
    const wanted = filters.locationId.replace(/-/g, " ").toLowerCase();
    const inPath = property.locationPath.some((p) => p.toLowerCase() === wanted);
    if (!inPath) return false;
  }
  if (filters.configurations && filters.configurations.length > 0) {
    const wanted = new Set(filters.configurations.map((c) => c.replace(/\D/g, "")));
    if (!property.configurations.some((c) => wanted.has(c))) return false;
  }
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

const propertyService: PropertyService = {
  async getHomepage(): Promise<HomepageContent> {
    const bySlug = (slug: string) => SAMPLE_PROPERTIES.find((p) => p.slug === slug) ?? null;
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
      totalPublishedListings: SAMPLE_TOTAL_LISTINGS,
    };
  },

  async search({ filters, sort, page }): Promise<Paged<PropertySummary>> {
    const all = sorted(SAMPLE_PROPERTIES.filter((p) => matches(p, filters)), sort);
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: all.slice(start, start + PAGE_SIZE),
      total: all.length,
      page,
      pageSize: PAGE_SIZE,
    };
  },

  async getBySlug(slug) {
    const summary = SAMPLE_PROPERTIES.find((p) => p.slug === slug);
    if (!summary) {
      throw new ServiceError("not_found", `No published listing with slug "${slug}".`);
    }
    return sampleDetailFor(summary);
  },

  async countMatching(filters) {
    return SAMPLE_PROPERTIES.filter((p) => matches(p, filters)).length;
  },

  /**
   * Locality and configuration are hard requirements; budget and timing move a
   * project up or down. The score is computed here, in the service, because the
   * real one will be computed by kkl-backend — never in the browser.
   */
  async match(requirement) {
    const scored = SAMPLE_PROPERTIES.filter((p) => {
      const localityOk =
        !requirement.locationId ||
        p.locationPath.some(
          (seg) => seg.toLowerCase() === requirement.locationId!.replace(/-/g, " ").toLowerCase(),
        );
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

  async getByReference(id) {
    return enquiryStore.findByReference(id) ?? SAMPLE_ENQUIRIES.find((e) => e.id === id) ?? null;
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

export const sampleServices: Services = {
  properties: propertyService,
  enquiries: enquiryService,
  profile: profileService,
  notifications: notificationService,
  isSample: true,
};
