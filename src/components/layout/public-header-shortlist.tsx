import { PublicHeader } from "@/components/layout/public-header";
import { headerShortlistCount } from "@/lib/services/backend/buyer-records";

/** Reads the signed-in shortlist once per request. A failed read stays unavailable. */
export async function PublicHeaderShortlist() {
  const shortlistCount = await headerShortlistCount();
  return <PublicHeader shortlistCount={shortlistCount} />;
}
