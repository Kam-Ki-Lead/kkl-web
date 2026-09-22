import { createListing } from "@/app/actions/builder-listings";
import { Button } from "@/components/ui/button";

/**
 * Creating a listing is a POST, not a link.
 *
 * It creates a record, so a GET would make a new empty draft every time a
 * crawler, a prefetch or a Back button touched the URL.
 */
export function NewListingButton() {
  return (
    <form action={createListing}>
      <Button type="submit">New listing</Button>
    </form>
  );
}
