import type { ReactNode } from "react";

/**
 * The Builder console renders per-request state, so nothing under it is
 * prerendered — listings, enquiries, subscription state and credits all change
 * during a session, and once kkl-backend serves these screens they are
 * per-account as well.
 */
export const dynamic = "force-dynamic";

export default function BuilderLayout({ children }: { children: ReactNode }) {
  return children;
}
