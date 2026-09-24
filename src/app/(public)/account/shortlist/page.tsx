import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { AccessPanel } from "@/components/ui/states";

export const metadata: Metadata = { title: "My shortlist" };

/**
 * P-11 — shortlist.
 *
 * A shortlist belongs to an account, and this build has no authenticated session:
 * kkl-backend owns sign-in and has not published its API. Rather than inventing a
 * client-side shortlist that would look saved and then vanish, the screen renders
 * the signed-out state from C-09 and says plainly what is missing.
 */
export default function ShortlistPage() {
  return (
    <div className="mx-auto max-w-[760px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">My shortlist</h1>
      <p className="t-body mt-[6px] text-body">
        Projects you save while browsing, kept against your account.
      </p>

      <div className="mt-[18px]">
        <AccessPanel
          chipLabel="Not signed in"
          title="Sign in to see your shortlist"
          footnote="P-11 shortlist · saving is not connected until kkl-backend provides accounts"
          actions={
            <>
              {/* The approved P-11 panel's one filled action is "Browse
                  properties"; the sign-in action is an implementation addition
                  (the baseline relies on the header), so it takes the
                  secondary slot. */}
              <ButtonLink href="/auth?next=/account/shortlist" variant="secondary">
                Sign in or register
              </ButtonLink>
              <ButtonLink href="/search">Browse properties</ButtonLink>
            </>
          }
        >
          A shortlist is stored against your account so it follows you between devices. Saving is
          not connected yet, so nothing you save now would be kept — we would rather say so than
          show you a list that disappears.
        </AccessPanel>
      </div>
    </div>
  );
}
