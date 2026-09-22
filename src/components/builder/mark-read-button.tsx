import { markEnquiryRead } from "@/app/actions/builder-enquiries";
import { Button } from "@/components/ui/button";

/** Its own form, so it posts without JavaScript and cannot be fired by Enter elsewhere. */
export function MarkReadButton({ enquiryId }: { enquiryId: string }) {
  return (
    <form action={markEnquiryRead}>
      <input type="hidden" name="id" value={enquiryId} />
      <Button type="submit" variant="secondary" className="w-full">
        Mark as read
      </Button>
    </form>
  );
}
