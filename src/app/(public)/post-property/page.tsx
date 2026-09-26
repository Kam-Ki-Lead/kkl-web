import type { Metadata } from "next";
import { RoleLanding } from "@/components/layout/role-landing";
import { AreaPicker } from "@/components/location/area-picker";
import { Card } from "@/components/ui/card";
import { Field, Select, TextInput } from "@/components/ui/field";
import { PendingRule } from "@/components/ui/states";
import { DECISIONS } from "@/lib/config/business-rules";
import { getServices } from "@/lib/services";

export const metadata: Metadata = { title: "Post your property" };

/**
 * CR02 — the individual owner's Post Property route, prepared for review.
 *
 * What is confirmed: the four audiences are distinct, and an individual owner
 * posting their own property is a different journey from a broker buying
 * leads, a builder managing projects, or a home seeker enquiring. The owner
 * journey exists and takes this shape: register → verification only where the
 * agreed policy requires it → add property → preview → submit or publish
 * under the agreed moderation rule.
 *
 * What is not confirmed (confirmation-document decisions 1, 5 and 7): whether
 * the existing Seller role is renamed, whether one account may hold more than
 * one role, what owners are charged, whether listings are moderated before or
 * after publication, how owner enquiries route, whether owners may post
 * rentals, and whether verification gates publication. The written
 * specification proposes third-party verification before publication; the
 * call says KYC is compliance-based and mostly unnecessary. That conflict is
 * unresolved, and this page takes neither side.
 *
 * So the guided form below is a skeleton for the client to review: the fields
 * the specification asks for, over the central location records (CR05), with
 * submission deliberately not connected. A disabled control always says why.
 * Nothing here creates a listing, a role or a charge.
 */
export default async function PostPropertyPage() {
  // The locality field's options are the launch city's area records (CR05),
  // fetched through the location service — the same records search, listings,
  // lead filters and lead requests use.
  const areas = await getServices().locations.areaOptions({ cityId: "in-wb-kol" });

  return (
    <>
      <RoleLanding
        eyebrow="For individual owners"
        title="Post your property"
        intro="Sell or let out your own property, in your own name. This is a different journey from a broker buying leads or a builder managing a project — one listing, yours, posted directly."
        steps={[
          {
            heading: "Register",
            body: "Create an account with your mobile number, verified by a one-time code.",
          },
          {
            heading: "Add the property",
            body: "A guided form: photographs, price, configuration, locality and how buyers should contact you.",
          },
          {
            heading: "Preview and submit",
            body: "Check how the listing reads, then submit it. Whether it publishes at once or after a review is part of the owner policy still being confirmed.",
          },
        ]}
        requirements={[
          "A mobile number we can verify by one-time code",
          "The property's locality, configuration and expected price",
          "Photographs of the property",
        ]}
        pending={[
          { label: "What posting costs, if anything", copy: DECISIONS["D-18"].pendingCopy },
          {
            label: "Whether a listing is reviewed before it goes live",
            copy: DECISIONS["D-18"].pendingCopy,
          },
          {
            label: "Whether verification is required before publication",
            copy:
              "The written specification proposes it; the call says it is mostly unnecessary — unresolved",
          },
          { label: "Whether owners can post rentals", copy: DECISIONS["D-18"].pendingCopy },
        ]}
        ctaLabel="Review the proposed form below"
        ctaHref="#proposed-form"
      />

      <div
        id="proposed-form"
        className="mx-auto max-w-[900px] scroll-mt-[20px] px-[32px] pb-[60px] max-[1060px]:px-[18px]"
      >
        <Card className="p-[22px]">
          <h2 className="t-card-title text-ink">The proposed guided form</h2>
          <p className="t-caption mt-[4px] text-muted">
            <PendingRule>{DECISIONS["D-18"].pendingCopy}</PendingRule> The fields are the client
            specification&rsquo;s set — photographs, price, configuration, locality and contact
            preference — rendered over the real location records so the client reviews the actual
            thing, not a picture of it.
          </p>

          {/*
            Disabled as a whole, and the note above says why: the owner policy
            (charges, moderation, verification, rentals) is unconfirmed, so
            there is nothing honest for a submission to do. When the policy
            lands, this fieldset loses `disabled` and gains a server action —
            and not before.
          */}
          <fieldset disabled className="mt-[16px] flex flex-col gap-[16px] opacity-80">
            <Field id="owner-locality" label="Locality">
              <AreaPicker
                id="owner-locality"
                name="locality"
                areas={areas}
                allLabel="Choose a locality"
              />
            </Field>

            <Field id="owner-propertyType" label="Property type">
              <Select id="owner-propertyType" name="propertyType" defaultValue="">
                <option value="">Choose</option>
                <option value="apartment">Apartment</option>
                <option value="villa">Villa / independent house</option>
                <option value="plot">Plot</option>
                <option value="commercial">Commercial</option>
              </Select>
            </Field>

            <Field id="owner-configuration" label="Configuration">
              <Select id="owner-configuration" name="configuration" defaultValue="">
                <option value="">Choose</option>
                {["1", "2", "3", "4+"].map((c) => (
                  <option key={c} value={c}>
                    {c} BHK
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              id="owner-price"
              label="Expected price (₹)"
              helper="For a rental this would be a monthly rent — whether owners may post rentals at all is part of the unconfirmed owner policy."
            >
              <TextInput id="owner-price" name="price" inputMode="numeric" placeholder="e.g. 6500000" />
            </Field>

            <Field id="owner-photos" label="Photographs">
              <TextInput id="owner-photos" name="photos" type="file" multiple accept="image/*" />
            </Field>

            <Field
              id="owner-contact"
              label="How should buyers contact you?"
              helper="Your choice is shown on the listing; your number itself is verified at registration."
            >
              <Select id="owner-contact" name="contactPreference" defaultValue="">
                <option value="">Choose</option>
                <option value="phone">Phone call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="either">Either</option>
              </Select>
            </Field>
          </fieldset>
        </Card>
      </div>
    </>
  );
}
