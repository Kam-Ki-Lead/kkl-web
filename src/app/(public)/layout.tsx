import { Suspense } from "react";
import { SiteHeader, SiteHeaderFallback } from "@/components/layout/site-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { headerShortlistCount } from "@/lib/services/backend/buyer-records";
import { hasBrowserSession } from "@/lib/auth/backend";

async function Header() {
  const shortlist = await headerShortlistCount();
  /*
   * Only decides where Buy leads points. /seller/leads is the Seller console,
   * which has its own shell and no public header, so sending a signed-out
   * visitor there drops them out of the site they are browsing. They get
   * /brokers, which explains leads and is inside this layout.
   *
   * A cookie read, not an authorisation: the backend decides what anybody
   * may actually see.
   */
  const signedIn = await hasBrowserSession();
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
