import { legacyReviewIdentityLabel } from "@/lib/services/backend/session";

/** Labels the development staff identity. Renders nothing once sign-in is the browser session. */
export function IdentityBanner() {
  const label = legacyReviewIdentityLabel();
  if (!label) return null;
  return (
    <p className="t-body rounded-[8px] border border-[#F3DFB4] bg-[#FFF7E8] px-[14px] py-[11px] text-body">
      {label}
    </p>
  );
}
