/**
 * The account area renders per-request state, so nothing under it is prerendered.
 *
 * Every screen here reads something that changes at runtime: enquiries submitted
 * during this session, the shortlist, profile edits, notifications marked read.
 * Prerendering them served a snapshot taken at build time — an enquiry could be
 * submitted, confirmed with its reference on screen, and then be absent from
 * "Track my enquiries", because that page was static HTML from the build.
 *
 * Once kkl-backend serves these screens they will be per-account as well as
 * per-request, which makes static rendering wrong for the same reason.
 */
export const dynamic = "force-dynamic";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
