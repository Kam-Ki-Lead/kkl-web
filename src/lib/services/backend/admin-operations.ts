import type {
  AdminActionResult, AdminLedgerRow, AdminWallet, ConsentBasis, SuppressionEntry,
} from "@/lib/domain/admin";
import type { AccountRole, StaffRef } from "@/lib/domain/identity";
import { ServiceError } from "@/lib/services/contracts";
import { callAs } from "./session";

/**
 * A-18, A-19 and A-28, served by kkl-backend.
 *
 * WHY THESE THREE AND NOT THE REST OF THE ADMIN CONSOLE
 * Each of them was already implemented, policy-enforced and tested in
 * kkl-backend, and each was unreachable: the wallet read took an account
 * identifier that no route passed, and nothing anywhere read the suppression
 * list. A capability with no caller is not delivered, however green its
 * tests are, and three of them had accumulated behind the same blind spot.
 *
 * CREDITS AND RUPEES
 * The domain types say `Inr` because the approved screens do. One credit is
 * one rupee (R-CR-01, confirmed), so the number does not change crossing this
 * boundary — but nothing here multiplies, and if that rule ever moves this is
 * the one place that would have to.
 */

type BackendWallet = {
  accountId: string;
  displayName: string;
  role: string;
  accountStatus: "active" | "suspended";
  balanceCredits: number;
  entries: number;
  lastEntryAt: string | null;
};

type BackendEntry = {
  id: string;
  entryType: string;
  amountCredits: number;
  orderId: string | null;
  paymentId: string | null;
  reason: string | null;
  at: string;
};

type BackendSuppression = {
  id: string;
  channel: string;
  reason: string;
  addedAt: string;
  addedBy: string | null;
  addressAvailable: false;
};

function raise(status: number, body: { error?: string }): never {
  throw new ServiceError("unavailable", body.error ?? `The service returned ${status}.`);
}

const ENTRY_LABEL: Record<string, string> = {
  purchase: "Lead purchase",
  recharge: "Recharge",
  adjustment: "Staff adjustment",
  refund: "Refund",
};

export const backendAdminOperations = {
  async listWallets(): Promise<readonly AdminWallet[]> {
    const { status, body } = await callAs<{ wallets: BackendWallet[] }>(
      "staff", "/v1/wallets?limit=200");
    if (status !== 200) raise(status, body);
    return body.wallets.map((w) => ({
      accountId: w.accountId,
      name: w.displayName,
      role: w.role as AccountRole,
      balanceInr: w.balanceCredits,
      accountStatus: w.accountStatus,
      // Suspension, reported as itself. There is no wallet freeze in the
      // system and this must not imply one exists.
      frozen: w.accountStatus === "suspended",
      note: w.entries === 0
        ? "No ledger entries yet — the balance is zero because nothing has moved"
        : `${w.entries} ledger ${w.entries === 1 ? "entry" : "entries"}, summed on every read`,
    }));
  },

  /**
   * A running balance, composed here.
   *
   * kkl-backend stores no balance column and returns none per entry, which is
   * the right call: a stored running total is a second source of truth that
   * drifts. The screen wants one, so it is computed from the newest entry
   * backwards over the page that was returned — and where the page does not
   * reach the beginning of the ledger, the oldest row's "balance after" is
   * still correct while the rows before it are simply not shown.
   */
  async walletLedger(accountId: string): Promise<readonly AdminLedgerRow[]> {
    const { status, body } = await callAs<{ balanceCredits: number; entries: BackendEntry[] }>(
      "staff", `/v1/wallet?accountId=${encodeURIComponent(accountId)}`);
    if (status === 403) raise(status, body);
    if (status !== 200) raise(status, body);

    let running = body.balanceCredits;
    return body.entries.map((e) => {
      const balanceAfter = running;
      running -= e.amountCredits;
      return {
        when: e.at,
        what: ENTRY_LABEL[e.entryType] ?? e.entryType.replace(/_/g, " "),
        reference: e.orderId ?? e.paymentId ?? e.id,
        deltaInr: e.amountCredits,
        balanceAfterInr: balanceAfter,
        reason: e.reason,
      };
    });
  },

  async adjustCredits(input: {
    actor: StaffRef;
    accountId: string;
    direction: "credit" | "debit";
    amountInr: number;
    reason: string;
  }): Promise<AdminActionResult> {
    const amount = input.direction === "debit"
      ? -Math.abs(input.amountInr)
      : Math.abs(input.amountInr);
    const { status, body } = await callAs<{
      entryId: string; balanceCredits: number; error?: string;
    }>(
      "staff", "/v1/wallet/adjustments", {
        method: "POST",
        body: {
          accountId: input.accountId,
          amountCredits: amount,
          reason: input.reason,
          // A fresh key per submission: this is a person pressing a button,
          // not a retried job, and two deliberate adjustments of the same
          // amount for the same reason are two adjustments.
          idempotencyKey: crypto.randomUUID(),
        },
      });
    // The ledger entry's own identifier is the audit reference: the entry is
    // the record, and the audit log names it. There is no second identifier
    // to invent for the screen.
    if (status === 201) return { ok: true, auditId: body.entryId };
    return { ok: false, error: body.error ?? `The adjustment was refused (${status}).` };
  },

  /**
   * A-28. The addresses are not here, and this adapter could not produce them
   * if a screen asked: the response has no field that carries one, because
   * the table stores a digest. `maskedNumber` is null rather than a row of
   * dots — dots would say a value is being withheld, and nothing is.
   */
  async consent(): Promise<{
    readonly suppression: readonly SuppressionEntry[];
    readonly effects: readonly string[];
    readonly bases: readonly ConsentBasis[];
  }> {
    const { status, body } = await callAs<{
      total: number; byChannel: Record<string, number>; entries: BackendSuppression[];
    }>("staff", "/v1/notifications/suppressions?limit=200");
    if (status !== 200) raise(status, body);

    return {
      suppression: body.entries.map((e) => ({
        maskedNumber: null,
        addressAvailable: false,
        source: `${e.channel} · added by ${e.addedBy ?? "a staff account since removed"}`,
        basis: e.reason,
        when: e.addedAt,
      })),
      effects: [
        "The delivery worker checks this list before every send and records "
          + "`suppressed` instead of attempting one.",
        "The check is on the hash, so an address can be tested without the "
          + "list ever holding it in the clear.",
        `${body.total} ${body.total === 1 ? "entry" : "entries"} today: `
          + Object.entries(body.byChannel)
            .map(([channel, n]) => `${n} on ${channel}`)
            .join(", ") + ".",
      ],
      // The consent bases are a rule, not a record, and no rule has been
      // confirmed (Q-6). Saying so is the honest content of this panel.
      bases: [
        {
          source: "Any lead",
          basis: "Consent is recorded with an evidence reference or it is `unknown`. "
            + "An `unknown` lead is not sold. What counts as evidence for leads that "
            + "predate any calling is Q-6, and is not decided.",
        },
      ],
    };
  },
};
