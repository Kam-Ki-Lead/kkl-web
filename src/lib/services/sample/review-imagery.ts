import type { PropertyMedia } from "@/lib/domain/types";

/**
 * Illustrative review photography carried over from the approved baseline.
 *
 * STATUS: OFF BY DEFAULT, and unverified in this environment.
 *
 * The baseline (kkl-design @ 5bc3512) does not vendor any photography. It
 * references seven Unsplash photographs by URL and credits each one per slot.
 * Those URLs are reproduced here with their credits so a reviewer can see the
 * portal the way the design intended, rather than a grid of empty slots.
 *
 * Three things are true about this and should not be glossed over:
 *
 * 1. **It is hotlinked, not vendored.** Nothing is stored in this repository.
 *    Turning it on makes the browser fetch images.unsplash.com directly.
 * 2. **It could not be verified here.** This build environment's egress policy
 *    blocks images.unsplash.com (403 on CONNECT), so the rendered result has
 *    never been seen in this repository. It is wired, not confirmed.
 * 3. **It is illustrative only.** The baseline is explicit: these photographs do
 *    not depict the named synthetic projects, and "every image must be replaced
 *    with licensed project photography before launch."
 *
 * Enable for a review session with NEXT_PUBLIC_KKL_REVIEW_IMAGERY=on. It is
 * deliberately not tied to sample mode, so nobody gets third-party hotlinks by
 * accident just by running with fixtures.
 */

export const REVIEW_IMAGERY_ENABLED = process.env.NEXT_PUBLIC_KKL_REVIEW_IMAGERY === "on";

type Credited = { readonly photoId: string; readonly credit: string };

/** The seven photographs the baseline uses, with the credit it shows per slot. */
const PHOTOS: Readonly<Record<string, Credited>> = {
  hero: { photoId: "photo-1750762367188-2f884520d63d", credit: "Photo by Bohdan Loik on Unsplash" },
  a: { photoId: "photo-1759882611054-fa61e7fa3099", credit: "Photo by Felicia Montenegro on Unsplash" },
  b: { photoId: "photo-1755103114153-eb0a66e3725a", credit: "Photo by Haberdoedas on Unsplash" },
  c: { photoId: "photo-1757970326337-95d7cca56fa1", credit: "Photo by Sebastian Schuster on Unsplash" },
  d: { photoId: "photo-1758193431351-68538bf55ec3", credit: "Photo by Aalo Lens on Unsplash" },
  e: { photoId: "photo-1762344692227-f6496e80d7bf", credit: "Photo by Zulfugar Karimov on Unsplash" },
  f: { photoId: "photo-1755735340764-3b077cab0c5c", credit: "Photo by Anton Ryazanov on Unsplash" },
};

/**
 * Which photograph stands in for which listing.
 *
 * Properties deliberately left out keep the designed no-image fallback, so the
 * missing-media state stays visible in review instead of disappearing the moment
 * imagery is switched on.
 */
const ASSIGNMENT: Readonly<Record<string, keyof typeof PHOTOS>> = {
  "p-ivy-court": "hero",
  "p-greenview": "a",
  "p-lakeshore": "b",
  "p-sundew": "c",
  "p-orchid-grove": "d",
  "p-riverside-commons": "e",
  "p-palm-meadows": "f",
  // p-the-pinnacle and p-willow-court intentionally have no photograph.
};

function url(photoId: string, w: number, h: number): string {
  return `https://images.unsplash.com/${photoId}?fm=jpg&q=72&w=${w}&h=${h}&auto=format&fit=crop`;
}

/** Cover image for a listing, or null to keep the designed fallback. */
export function reviewCoverFor(propertyId: string, title: string): PropertyMedia | null {
  if (!REVIEW_IMAGERY_ENABLED) return null;
  const key = ASSIGNMENT[propertyId];
  if (!key) return null;
  const photo = PHOTOS[key];
  if (!photo) return null;

  return {
    id: `review-${propertyId}`,
    url: url(photo.photoId, 1000, 760),
    kind: "image",
    // The alt text says what the picture actually is. Claiming it depicts the
    // project would be a lie: these are stock photographs.
    alt: `Illustrative photograph standing in for ${title}. ${photo.credit}.`,
    attribution: photo.credit,
  };
}

/** Gallery set for the detail screen, or an empty list to keep the fallbacks. */
export function reviewGalleryFor(propertyId: string, title: string): readonly PropertyMedia[] {
  if (!REVIEW_IMAGERY_ENABLED) return [];
  const key = ASSIGNMENT[propertyId];
  if (!key) return [];
  const primary = PHOTOS[key];
  const secondary = PHOTOS[key === "a" ? "b" : "a"];
  if (!primary || !secondary) return [];

  return [
    {
      id: `review-${propertyId}-1`,
      url: url(primary.photoId, 1600, 1100),
      kind: "image",
      alt: `Illustrative photograph standing in for ${title}. ${primary.credit}.`,
      attribution: primary.credit,
    },
    {
      id: `review-${propertyId}-2`,
      url: url(secondary.photoId, 1000, 760),
      kind: "image",
      alt: `Further illustrative photograph. ${secondary.credit}.`,
      attribution: secondary.credit,
    },
  ];
}
