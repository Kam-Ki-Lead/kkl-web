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
            <Button onClick={reset}>Try again</Button>
            <ButtonLink href="/" variant="secondary">Go to the homepage</ButtonLink>
          </>
        }
      >
        Something failed while building this page. Nothing you had entered has been submitted,
        and no credits have been spent.
        {error.digest ? ` Quote reference ${error.digest} if you contact support.` : ""}
      </StateMessage>
    </div>
  );
}
