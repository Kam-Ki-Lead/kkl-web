import { getServices } from "@/lib/services";
import { ServiceError } from "@/lib/services/contracts";
import { describeLocation } from "@/lib/requirement";

export { describeLocation };

export type LocationChoice = { readonly id: string; readonly label: string };

export type LocationChoices =
  | { readonly ok: true; readonly options: readonly LocationChoice[] }
  | { readonly ok: false; readonly message: string };

/**
 * Localities for a requirement, from the location service.
 * The homepage's featured set is not a substitute when this read fails.
 */
export async function loadRequirementLocations(): Promise<LocationChoices> {
  try {
    const locations = getServices().locations;
    const chain = await locations.launchChain();
    const city = [...chain].reverse().find((node) => node.level === "city");
    if (!city) {
      return { ok: false, message: "The location service did not name a launch city." };
    }
    const options = await locations.areaOptions({ cityId: city.id });
    return { ok: true, options };
  } catch (error) {
    if (error instanceof ServiceError) return { ok: false, message: error.message };
    throw error;
  }
}

