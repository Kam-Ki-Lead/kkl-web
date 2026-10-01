import type { ListingDraft, ListingSummary } from "@/lib/domain/types";
import type { ListingService } from "@/lib/services/contracts";
import { ServiceError, ValidationError } from "@/lib/services/contracts";
import {
  builderBlockers,
  builderSections,
  DraftDeleteRefusal,
  deleteFollowUp,
  draftDeleteResult,
  listingListPresentation,
  listingsMatchingStatus,
  sectionPatch,
  toBuilderDraft,
  type StoredConfiguration,
} from "./builder-draft";
import { callAs } from "./session";

/**
 * B-07 to B-15 for a signed-in builder, served by /v1/listings.
 *
 * A builder draft is not an owner draft: contact, the single owner
 * configuration column, and a photograph are not required here. Publication
 * is not requested. The price range on the editor is not written.
 */

type ListingResponse = Parameters<typeof toBuilderDraft>[0] & {
  reference?: string;
  locationName?: string | null;
  priceInr?: number | null;
  configurations?: readonly StoredConfiguration[];
  enquiryCount?: number | null;
  declaredImageCount?: number | null;
  error?: string;
  field?: string;
};

type ListingList = {
  listings?: readonly ListingResponse[];
  error?: string;
};

const PUBLICATION_REFUSAL = {
  kind: "blocked" as const,
  reason: "publication_not_decided" as const,
  blockers: [
    {
      section: "preview" as const,
      sectionNumber: 6,
      message: "No request publishes a listing. The draft stays a draft.",
    },
  ],
};

async function readListing(id: string): Promise<ListingResponse> {
  const { status, body } = await callAs<ListingResponse>("builder", `/v1/listings/${id}`);
  if (status === 404) throw new ServiceError("not_found", "That listing is not on this account.");
  if (status === 403) {
    throw new ServiceError("forbidden", body.error ?? "This account cannot open that listing.");
  }
  if (status !== 200) {
    throw new ServiceError("unavailable", body.error ?? `The listing service returned ${status}.`);
  }
  return body;
}

function summary(body: ListingResponse): ListingSummary {
  const draft = toBuilderDraft(body);
  const sections = builderSections(draft);
  const presented = listingListPresentation(body.status);
  const priceLabel =
    draft.listingPriceInr == null ? "Price not stored" : `Listing price ₹${draft.listingPriceInr.toLocaleString("en-IN")}`;
  return {
    id: draft.id,
    title: draft.title || "Untitled project",
    status: presented.status,
    recordStatus: presented.recordStatus,
    locationLabel: body.locationName || "Locality not chosen",
    configurationLabel: "Configurations are on the listing, not on this list",
    priceLabel,
    detailLine: presented.detailLine,
    enquiryCount: typeof body.enquiryCount === "number" ? body.enquiryCount : null,
    declaredImageCount: typeof body.declaredImageCount === "number" ? body.declaredImageCount : null,
    hasMedia: false,
    coverImage: null,
    sectionsComplete: sections.filter((section) => section.complete).length,
    sectionsTotal: sections.length,
  };
}

export const backendBuilderListings: ListingService = {
  async list(filter) {
    const query = filter?.status ? `?status=${encodeURIComponent(filter.status)}` : "";
    const { status, body } = await callAs<ListingList>("builder", `/v1/listings${query}`);
    if (status === 403) {
      throw new ServiceError("forbidden", body.error ?? "This account cannot list properties.");
    }
    if (status !== 200 || !Array.isArray(body.listings)) {
      throw new ServiceError("unavailable", body.error ?? `The listing service returned ${status}.`);
    }
    return listingsMatchingStatus(body.listings, filter?.status).map(summary);
  },

  async get(id) {
    try {
      return toBuilderDraft(await readListing(id));
    } catch (error) {
      if (error instanceof ServiceError && error.kind === "not_found") return null;
      throw error;
    }
  },

  async create() {
    const { status, body } = await callAs<ListingResponse>("builder", "/v1/listings", {
      method: "POST",
      body: {},
    });
    if (status === 403) {
      throw new ServiceError("forbidden", body.error ?? "This account cannot start a listing.");
    }
    if (status !== 201 || !body.id) {
      throw new ServiceError("unavailable", body.error ?? `The listing service returned ${status}.`);
    }
    return toBuilderDraft(body);
  },

  async saveSection({ id, section, values }) {
    const existing = section === "pricing" ? ((await readListing(id)).configurations ?? []) : [];
    const patch = sectionPatch(section, values, existing);
    if (Object.keys(patch).length === 0) return toBuilderDraft(await readListing(id));
    const { status, body } = await callAs<ListingResponse>("builder", `/v1/listings/${id}`, {
      method: "PATCH",
      body: patch,
    });
    if (status === 422) {
      const field =
        body.field === "reraId" ? "reraNumber" : body.field === "locationId" ? "locality" : (body.field ?? "form");
      throw new ValidationError({
        [field]: body.error ?? "This value was not accepted.",
      });
    }
    if (status === 404) throw new ServiceError("not_found", "That listing is not on this account.");
    if (status === 403) {
      throw new ServiceError("forbidden", body.error ?? "This account cannot change that listing.");
    }
    if (status !== 200) {
      throw new ServiceError("unavailable", body.error ?? `The listing service returned ${status}.`);
    }
    return toBuilderDraft(body);
  },

  async sections(id) {
    const listing = await this.get(id);
    if (!listing) return [];
    return builderSections(listing);
  },

  async publishBlockers(id) {
    const listing = await this.get(id);
    return listing ? builderBlockers(listing) : [];
  },

  async publish() {
    return PUBLICATION_REFUSAL;
  },

  async unpublish() {
    return PUBLICATION_REFUSAL;
  },

  async remove(id) {
    const { status, body } = await callAs<{ deleted?: boolean; error?: string; code?: string }>(
      "builder",
      `/v1/listings/${id}`,
      { method: "DELETE" },
    );
    const result = draftDeleteResult(status, body);
    const follow = deleteFollowUp(result);
    if (follow.type === "deleted" || result.ok) return { removed: true };
    if (follow.type === "sign-in") throw new ServiceError("unauthenticated", result.message);
    throw new DraftDeleteRefusal(follow.code, result.message);
  },
};
