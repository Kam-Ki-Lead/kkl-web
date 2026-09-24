import type { Metadata } from "next";
import { BuilderShell } from "@/components/builder/builder-shell";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ButtonLink } from "@/components/ui/button";
import { DECISIONS } from "@/lib/config/business-rules";

export const metadata: Metadata = { title: "Notification states" };

/**
 * B-18 — how a new enquiry reaches a Builder.
 *
 * The three surfaces are shown as specimens, not as live notifications: nothing
 * on this screen is delivered, and the outbound message is copy for review
 * rather than something that was sent.
 *
 * The outbound message carries no contact details. Whether it could is part of
 * the same unresolved decision as B-17 — the roles specification requires a
 * notification and is silent on its contents (D-05).
 */
export default function NotificationStatesPage() {
  return (
    <BuilderShell title="Notification states" subtitle="How a new enquiry reaches you">
      <div className="flex max-w-[760px] flex-col gap-[18px]">
        <Card className="p-[22px]">
          <h2 className="t-card-title text-ink">In-console toast</h2>
          <p className="t-caption mt-[2px] text-muted">
            Shown while the Builder is in the console. A specimen — nothing is delivered here.
          </p>
          {/* The approved toast is ink, not brand: saffron icon chip, white
              title, #C6CCE0 body and a white "View" button. */}
          <div className="mt-[14px] flex items-start gap-[12px] rounded-[10px] bg-ink p-[16px]">
            <span
              aria-hidden="true"
              className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-[6px] bg-saffron text-[16px] text-ink"
            >
              ✉
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-white">
                New enquiry · Greenview Residency
              </p>
              <p className="mt-[1px] text-[14px] text-[#C6CCE0]">
                A buyer has asked about 3 BHK availability.
              </p>
            </div>
            <span className="flex-none rounded-[6px] bg-white px-[14px] py-[9px] text-[14px] font-bold text-ink">
              View
            </span>
          </div>
        </Card>

        <Card className="p-[22px]">
          <h2 className="t-card-title text-ink">Sidebar badge</h2>
          <p className="t-caption mt-[2px] text-muted">
            The count beside Enquiries in the rail. This one is live — it reflects your actual
            unread enquiries.
          </p>
          <div className="mt-[14px] inline-flex items-center gap-[10px] rounded-[8px] bg-brand-deep px-[17px] py-[11px]">
            <span className="text-[16px] font-medium text-rail-seller-item">Enquiries</span>
            <span className="rounded-full bg-saffron px-[9px] py-[2px] text-[12px] font-bold text-ink">
              3 new
            </span>
          </div>
        </Card>

        <Card className="p-[22px]">
          <h2 className="t-card-title text-ink">Outbound message copy</h2>
          <p className="t-caption mt-[2px] text-muted">
            Draft copy for review. No message is sent by this application, and no delivery channel
            is connected.
          </p>
          <blockquote className="mt-[14px] rounded-[10px] border border-line bg-tint p-[16px]">
            <p className="t-body text-body">
              You have a new enquiry on Greenview Residency from a verified buyer. Open your Kam Ki
              Lead builder console to respond.
            </p>
          </blockquote>
          <p className="t-caption mt-[10px] text-warning">
            <strong>No contact details are included in the outbound message.</strong> Whether they
            can be is part of the same unresolved decision on Builder contact access — the roles
            specification requires notification but is silent on its contents.
          </p>
          <p className="t-caption mt-[6px] text-muted">{DECISIONS["D-05"].question} — D-05</p>
        </Card>

        <Card className="p-[18px]">
          <h2 className="t-card-title text-ink">Not built</h2>
          <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
            <li>
              No channel is connected. WhatsApp, email and push delivery are kkl-backend&rsquo;s, and
              consent and suppression (D-14) govern whether a message may be sent at all.
            </li>
            <li>
              The toast is a specimen. A real one needs C-07, which is not built, and a delivery
              mechanism that does not exist.
            </li>
          </ul>
          <div className="mt-[14px]">
            <Chip tone="muted">Specimen only</Chip>
          </div>
        </Card>

        <div>
          <ButtonLink href="/builder/enquiries" variant="secondary">
            Back to enquiries
          </ButtonLink>
        </div>
      </div>
    </BuilderShell>
  );
}
