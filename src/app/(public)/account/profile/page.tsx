import type { Metadata } from "next";
import { getServices } from "@/lib/services";
import { runtimeConfig } from "@/lib/config/runtime";
import { profileStoreKind } from "@/lib/services/backend/config";
import { readBuyerProfile } from "@/lib/services/backend/profile";
import { ServiceError } from "@/lib/services/contracts";
import { StateMessage } from "@/components/ui/states";
import { ProfileForm } from "@/components/account/profile-form";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Profile & settings" };

/** P-15 — profile & settings. */
export default async function ProfilePage() {
  const services = getServices();
  const profileIsSample = profileStoreKind() !== "backend";
  let profile;
  let accountName: string | null = null;
  if (profileIsSample) {
    profile = await services.profile.get();
  } else {
    try {
      const loaded = await readBuyerProfile();
      profile = loaded.profile;
      accountName = loaded.accountName;
    } catch (error) {
      if (error instanceof ServiceError) {
        return (
          <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[28px] max-[1060px]:px-[18px]">
            <StateMessage title="This profile could not be read">
              {error.message} The sample profile is not shown in its place.
            </StateMessage>
          </div>
        );
      }
      throw error;
    }
  }
  const areas = await services.locations.areaOptions({ cityId: "in-wb-kol" });

  return (
    <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[28px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">Profile &amp; settings</h1>
      <p className="t-body mt-[6px] text-body">
        Your details, and how Kam Ki Lead contacts you about enquiries.
      </p>

      <Card className="mt-[18px] p-[22px]">
        <ProfileForm
          profile={profile}
          areas={areas}
          isSample={profileIsSample}
          accountName={accountName}
        />
      </Card>

      {profileIsSample && runtimeConfig.isSampleMode ? (
        <Card className="mt-[14px] border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
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
