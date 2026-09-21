import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { runtimeConfig } from "@/lib/config/runtime";

export const metadata: Metadata = { title: "Contact & support" };

/** P-19 — contact & support. */
export default function SupportPage() {
  return (
    <div className="mx-auto max-w-[660px] px-[32px] pb-[60px] pt-[30px] max-[1060px]:px-[18px]">
      <h1 className="t-title text-ink">Contact &amp; support</h1>
      <p className="t-body mt-[6px] text-body">
        Questions about a listing, an enquiry or your account. We do not publish a response time.
      </p>

      <Card className="mt-[18px] p-[22px]">
        <form className="flex flex-col gap-[16px]">
          <Field id="support-name" label="Your name">
            <TextInput id="support-name" name="name" autoComplete="name" placeholder="Full name" />
          </Field>
          <Field id="support-mobile" label="Mobile number">
            <TextInput
              id="support-mobile"
              name="mobile"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
            />
          </Field>
          <Field id="support-subject" label="What is this about?">
            <TextInput id="support-subject" name="subject" placeholder="Subject" />
          </Field>
          <Field id="support-message" label="Message">
            <TextArea id="support-message" name="message" rows={5} placeholder="How can we help?" />
          </Field>
          <Button type="submit" disabled>
            Send message
          </Button>
          <p className="t-caption text-warning">
            {runtimeConfig.isSampleMode
              ? "Sample mode: this form is not connected. Nothing is sent and no ticket is created."
              : "Support ticket submission is not connected yet."}
          </p>
        </form>
      </Card>
    </div>
  );
}
