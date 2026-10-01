import { runtimeConfig } from "@/lib/config/runtime";
import { authStoreKind } from "@/lib/services/backend/config";
import {
  adminOperationsStore,
  listingStore,
  notificationStore,
  supportStore,
  verificationStore,
} from "@/lib/services";
import { Card } from "@/components/ui/card";

/**
 * The Admin console's sample disclosure.
 *
 * This one has to work harder than the Seller's and the Builder's, because a
 * staff console is where the temptation to read a screen as authoritative is
 * strongest: it *looks* like the inside of the system. It says the four things
 * these screens could otherwise imply — that someone signed in, that staff
 * permissions exist, that a decision moved money, and that the operational data
 * came from a running pipeline.
 */
export function AdminSampleNotice() {
  if (!runtimeConfig.isSampleMode) return null;
  const signedIn = authStoreKind() === "backend";
  const operations = adminOperationsStore() === "backend";
  const connectedQueues = supportStore() === "backend" || notificationStore() === "backend";

  return (
    <Card className="border-[#F3DFB4] bg-[#FFF7E8] p-[18px]">
      <h2 className="t-card-title text-warning">
        {signedIn ? "Part of this console is still sample data" : "This is not a staff console yet"}
      </h2>
      <ul className="t-body mt-[8px] flex list-disc flex-col gap-[4px] pl-[20px] text-body">
        <li>
          {signedIn ? (
            <>
              <strong className="text-ink">The signed-in session is the only identity.</strong> A
              session that is not staff does not open these queues. The screen does not substitute
              a development staff account.
            </>
          ) : (
            <>
              <strong className="text-ink">Nobody is signed in.</strong> A-01 collects an address and a
              password and authenticates no one. Every action is recorded against one fixed staff
              identity, and anything that reaches this URL gets the whole console.
            </>
          )}
        </li>
        <li>
          {signedIn ? (
            <>
              <strong className="text-ink">Staff-only requests are decided by kkl-backend.</strong>{" "}
              The rail still lists every destination. Hiding a link is not the permission check.
            </>
          ) : (
            <>
              <strong className="text-ink">There are no staff roles.</strong> Who may approve a
              document, adjust a balance or read a transcript are kkl-backend&rsquo;s to decide and
              enforce. Nothing here is separated by permission.
            </>
          )}
        </li>
        <li>
          {operations ? (
            <>
              <strong className="text-ink">No payment is taken.</strong> A credit adjustment, if one
              is submitted, is a ledger entry in kkl-backend. No refund request is stored, and a
              refund would still move nothing, because both halves of D-06 are open.
            </>
          ) : (
            <>
              <strong className="text-ink">No money moves.</strong> A credit adjustment posts an entry
              in an in-memory ledger. A refund decision is recorded and moves nothing at all, because
              the policy and the destination are both undecided (D-06).
            </>
          )}
        </li>
        <li>
          {connectedQueues ? (
            <>
              <strong className="text-ink">Support and delivery attempts are stored.</strong> A
              queued or unconfigured delivery was not sent.{" "}
              {verificationStore() === "backend"
                ? "Open KYC applications are read from kkl-backend."
                : "KYC applications on this console are still fixtures."}{" "}
              {listingStore() === "backend"
                ? "Live property review is read from kkl-backend. Drafts stay on owner submissions."
                : "Property review on this console is still a fixture."}{" "}
              Voice, WhatsApp and today&rsquo;s volume figures are fixtures.
            </>
          ) : (
            <>
              <strong className="text-ink">The operational screens read fixtures.</strong> There is no
              intake pipeline, no qualification call, no WhatsApp journey and no notification sender
              anywhere in this repository. Those screens exist so their layout and states can be
              reviewed.
            </>
          )}
        </li>
        <li>
          {operations
            ? "Wallet entries live in kkl-backend and stay after this frontend restarts."
            : "Decisions, notes and adjustments are lost when the server restarts."}
        </li>
      </ul>
      <p className="t-caption mt-[10px] text-muted">
        {signedIn ? (
          <>
            Portal property cards stay on the sample catalogue, which is why the site-wide sample
            banner remains. A stored support ticket or wallet balance is not that catalogue.
          </>
        ) : (
          <>
            What <em>is</em> connected: decisions on the two accounts whose consoles exist in this
            build — verification, suspension, credit adjustments, support replies — reach those
            consoles through the sample service layer. That is a demonstration of the join, not of any
            control over it.
          </>
        )}
      </p>
    </Card>
  );
}

/**
 * A one-line mark for a screen whose records are fixtures end to end.
 *
 * Used on the qualification, notification and integration screens, where there
 * is no live record at all and a reader could otherwise believe they are
 * looking at today's traffic.
 */
export function FixtureNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="t-caption rounded-[8px] bg-tint px-[13px] py-[10px] text-body">
      <strong className="text-ink">Fixtures.</strong> {children}
    </p>
  );
}
