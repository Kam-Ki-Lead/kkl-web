import { runtimeConfig } from "@/lib/config/runtime";
import { authStoreKind } from "@/lib/services/backend/config";

/**
 * Sample mode has to be visible, not inferred.
 *
 * When kkl-web renders fixtures, nothing on screen is real: no account is
 * authenticated, no payment is taken, no OTP is sent, no message is delivered, and
 * no contact detail belongs to a real person. Saying so once, at the top of every
 * page, is the difference between a review build and a misleading one.
 *
 * This cannot appear in a production deployment: runtime.ts refuses to start that
 * combination at all.
 */
export function SampleModeBanner() {
  if (!runtimeConfig.isSampleMode) return null;
  const backendAuth = authStoreKind() === "backend";

  return (
    <div className="bg-ink px-4 py-[7px] text-center">
      <p className="t-caption text-white">
        <span className="t-mono mr-[8px] rounded-[3px] bg-saffron px-[7px] py-[2px] text-[11px] font-medium tracking-[0.1em] text-ink">
          {backendAuth ? "REVIEW" : "SAMPLE DATA"}
        </span>
        {backendAuth
          ? "Sign-in uses the configured API. Payments, live calls and live messages are not configured. A screen whose switch is off still uses labelled sample fixtures."
          : "Synthetic content for development and review. Sign-in, payments, OTP and contact details are simulated — nothing is sent, charged or stored."}
      </p>
    </div>
  );
}
