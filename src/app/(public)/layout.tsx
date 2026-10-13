import { Suspense } from "react";
import { SiteHeader, SiteHeaderFallback } from "@/components/layout/site-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { headerShortlistCount } from "@/lib/services/backend/buyer-records";
import { hasBrowserSession } from "@/lib/auth/backend";
import { hasDemoSession } from "@/lib/auth/demo-session";
import { profileStoreKind } from "@/lib/services/backend/config";

async function Header() {
  const shortlist = await headerShortlistCount();
  /*
   * Decides what the account control says and where Buy leads points.
   * /seller/leads is the Seller console, which has its own shell and no
   * public header, so sending a signed-out visitor there drops them out of
   * the site they are browsing. They get /brokers, which explains leads and
   * is inside this layout.
   *
   * A cookie read, not an authorisation: the backend decides what anybody
   * may actually see.
   *
   * The review demo session counts here — and ONLY here, because it holds no
   * token. On a server whose account screens read from kkl-backend it does
   * not count at all: those screens would refuse it and bounce to sign-in, so
   * a header saying "My account" would be pointing at a door that does not
   * open. That server's demo session gets a signed-out header, which is the
   * honest reading of what it can do.
   */
  const demo = profileStoreKind() !== "backend" && (await hasDemoSession());
  const signedIn = (await hasBrowserSession()) || demo;
  // A guest, or a shortlist that could not be read, has no count to show.
  // The badge is a number somebody will act on, so an unknown one draws
  // nothing rather than a placeholder.
  return (
    <SiteHeader
      shortlistCount={shortlist.kind === "count" ? shortlist.total : 0}
      signedIn={signedIn}
    />
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={<SiteHeaderFallback />}>
        <Header />
      </Suspense>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
