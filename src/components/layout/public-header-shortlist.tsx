import { PublicHeader } from "@/components/layout/public-header";
import { headerShortlistCount } from "@/lib/services/backend/buyer-records";

/** Reads the signed-in shortlist once per request. No session stays a normal entry. */
export async function PublicHeaderShortlist() {
  const shortlist = await headerShortlistCount();
  return <PublicHeader shortlist={shortlist} />;
}
