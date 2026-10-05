import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";

export const metadata: Metadata = { title: "Page not found" };

/**
 * The 404 every `notFound()` lands on.
 *
 * There were 43 `notFound()` calls across the application and no
 * `not-found.tsx` anywhere, so all 43 rendered Next's unstyled default: no
 * wordmark, no navigation, no way back. The designed state components
 * existed and the approved inventory includes an error and access-denied
 * screen; what was missing was the route-level file that uses them.
 *
 * It says nothing about why. A missing record and a record belonging to
 * somebody else are deliberately indistinguishable throughout this
 * application — `getOrder` returns null for both — and a 404 that
 * distinguished them would undo that.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-[760px] px-[32px] pb-[80px] pt-[48px] max-[1060px]:px-[18px]">
      <StateMessage
        title="This page is not here"
        action={
          <>
            <ButtonLink href="/">Go to the homepage</ButtonLink>
            <ButtonLink href="/search" variant="secondary">Browse properties</ButtonLink>
          </>
        }
      >
        The address may be mistyped, the record may have been removed, or it may belong to
        another account. Nothing you had entered elsewhere has been lost.
      </StateMessage>
    </div>
  );
}
