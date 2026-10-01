import { Suspense } from "react";
import { PublicHeaderFallback } from "@/components/layout/public-header";
import { PublicHeaderShortlist } from "@/components/layout/public-header-shortlist";
import { PublicFooter } from "@/components/layout/public-footer";

/** The public portal shell: light header on white, content, deep-blue footer. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* PublicHeader reads the query string to mark the active nav item, which
          Next requires to sit under a Suspense boundary so pages above it can
          still be prerendered. */}
      <Suspense fallback={<PublicHeaderFallback />}>
        <PublicHeaderShortlist />
      </Suspense>
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
