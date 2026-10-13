import { Suspense } from "react";
import { SiteHeader, SiteHeaderFallback } from "@/components/layout/site-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { headerShortlistCount } from "@/lib/services/backend/buyer-records";
import { hasBrowserSession } from "@/lib/auth/backend";
import { demoSession } from "@/lib/auth/demo-session";

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
   * token. `demoSession()` is already null on every server where the shortcut
   * is off or where the consoles it signs in to could not open it, so there is
   * no server on which this header claims a session that leads nowhere.
   *
   * The account control goes to THAT account's console — a signed-in Builder
   * sent to the Buyer's /account is in the wrong room.
   */
  const demo = await demoSession();
  const signedIn = (await hasBrowserSession()) || demo !== null;
  // A guest, or a shortlist that could not be read, has no count to show.
  // The badge is a number somebody will act on, so an unknown one draws
  // nothing rather than a placeholder.
  return (
    <SiteHeader
      shortlistCount={shortlist.kind === "count" ? shortlist.total : 0}
      signedIn={signedIn}
      accountHref={demo?.landing}
      accountLabel={demo ? demo.label : undefined}
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
