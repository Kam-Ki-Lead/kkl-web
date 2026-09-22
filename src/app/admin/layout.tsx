import type { ReactNode } from "react";

/**
 * Nothing under /admin is prerendered.
 *
 * Every screen here reads queues that change while staff work — and, for the
 * two live accounts, state that another console can change at the same time. A
 * cached Admin screen is a staff member acting on what used to be true.
 */
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
