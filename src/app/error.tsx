"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateMessage } from "@/components/ui/states";

/**
 * The route-level error boundary.
 *
 * Fourteen pages read a service inside a `try`, handle `ServiceError`, and
 * deliberately rethrow anything else — which is right, and which needs a
 * boundary to land in. There was none, so an unexpected throw showed Next's
 * default production screen: "Application error: a server-side exception has
 * occurred", with no branding and no way out. React's own error-boundaries
 * rule says to wrap the component in an error boundary; this is it.
 *
 * It shows `digest`, not the message. Next replaces a server error's message
 * with a digest in production precisely so an internal detail does not reach
 * a browser, and this screen must not undo that. The digest is what a
 * support thread can quote so the entry can be found in the server log.
 *
 * WHAT THIS SCREEN MUST NOT SAY
 * It used to say "Nothing you had entered has been submitted, and no credits
 * have been spent." That was an assurance it is in no position to give. A
 * server action can complete — deduct credits, create the order, release the
 * contact — and the render that follows it can still throw. This boundary
 * receives an error, not an outcome: it cannot see whether a mutation
 * committed, and in the one case that matters most it would be telling the
 * customer their purchase failed when it succeeded.
 *
 * So it says what it knows, which is nothing about the outcome, and sends
 * the customer to the record that does know. That record is the point: a
 * purchase is idempotent on a key the form generated, and the orders screen
 * is where it can be seen. Guessing and resubmitting is the one thing this
 * screen must not encourage.
 *
 * It does not link to those screens. The boundary is at the root segment and
 * has no idea which role is signed in, and sending a buyer to a Seller route
 * produces an access panel rather than help. The places are named instead.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server already logged it. This is for a browser session, where
    // nothing else records that the screen failed.
    console.error("A page could not be rendered.", error.digest ?? "(no digest)");
  }, [error]);

  return (
    <div className="mx-auto max-w-[760px] px-[32px] pb-[80px] pt-[48px] max-[1060px]:px-[18px]">
      <StateMessage
        tone="error"
        title="This page could not be loaded"
        action={
          <>
            <Button onClick={reset}>Reload this page</Button>
            <ButtonLink href="/" variant="secondary">Go to the homepage</ButtonLink>
          </>
        }
      >
        Something failed while this page was being built.
        {" "}
        If you had just submitted something — a purchase, an enquiry or a form — this screen
        cannot tell you whether it went through. Open your dashboard and check your orders,
        purchases or enquiries before sending it again, so you do not do it twice.
        {error.digest ? ` Quote reference ${error.digest} if you contact support.` : ""}
      </StateMessage>
      <p className="t-caption mt-[10px] text-center text-muted">
        Reloading this page does not resend anything.
      </p>
    </div>
  );
}
