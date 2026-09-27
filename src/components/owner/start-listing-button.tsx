import { newOwnerToken, startOwnerListing } from "@/app/actions/owner-listings";
import { Button } from "@/components/ui/button";

/**
 * CR02 — starts a draft.
 *
 * A form rather than a link, because starting a draft writes something, and a
 * GET that writes is the kind of thing a prefetch or a crawler trips. The
 * token makes a double click one draft instead of two.
 */
export async function StartListingButton({
  label = "Start a listing",
  variant = "primary",
}: {
  label?: string;
  variant?: "primary" | "secondary";
}) {
  const idempotencyKey = await newOwnerToken();
  return (
    <form action={startOwnerListing}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <Button type="submit" variant={variant}>
        {label}
      </Button>
    </form>
  );
}
