import { Suspense } from "react";
import { SiteHeader, SiteHeaderFallback } from "@/components/layout/site-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { headerShortlistCount } from "@/lib/services/backend/buyer-records";

async function Header() {
  const shortlist = await headerShortlistCount();
  // A guest, or a shortlist that could not be read, has no count to show.
  // The badge is a number somebody will act on, so an unknown one draws
  // nothing rather than a placeholder.
  return <SiteHeader shortlistCount={shortlist.kind === "count" ? shortlist.total : 0} />;
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
