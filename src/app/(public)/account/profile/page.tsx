import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import { ProfileForm } from "@/components/account/profile-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Profile & settings" };

/** P-15 — profile & settings. */
export default async function ProfilePage() {
  const services = getServices();
  const [profile, localities] = await Promise.all([
    services.profile.get(),
    services.properties.getHomepage().then((h) => h.localities),
  ]);

  return (
    <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[28px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">Profile &amp; settings</h1>
      <p className="t-body mt-[6px] text-body">
        Your details, and how Kam Ki Lead contacts you about enquiries.
      </p>

      <Card className="mt-[18px] p-[22px]">
        <ProfileForm
          profile={profile}
          localities={localities}
          isSample={runtimeConfig.isSampleMode}
        />
      </Card>

      {runtimeConfig.isSampleMode ? (
        <Card className="mt-[14px] border-[#F2DFBC] bg-[#FFF9EE] p-[18px]">
          <h2 className="t-label text-warning">This is not a real account</h2>
          <p className="t-caption mt-[6px] text-body">
            Saving changes a value held in the server&rsquo;s memory for this review session. It
            does not update an account, send a verification message, or change any preference at
            WhatsApp or an email provider. Restarting the server restores the original details.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
