import { ExtendCreditsButton } from "./extend-credits-button";
import { callAs, type BackendRole } from "@/lib/services/backend/session";
import { marketplaceStoreKind } from "@/lib/services/backend/config";
import { Card } from "@/components/ui/card";
type Expiry = { lots: { id: string; remainingCredits: number; expiresAt: string }[]; extension: { available: boolean; reason: string } };
export async function CreditExpiry({ role }: { role: BackendRole }) {
  if (marketplaceStoreKind() !== "backend") return <Card className="p-[22px]"><h2 className="t-card-title">Credit expiry</h2><p>Sample balances do not represent stored credit expiry dates.</p></Card>;
  const { status, body } = await callAs<{ expiry?: Expiry }>(role, "/v1/wallet");
  if (status !== 200 || !body.expiry) return <Card className="p-[22px]"><h2 className="t-card-title">Credit expiry unavailable</h2><p>Your credit expiry details could not be loaded.</p></Card>;
  return <Card className="p-[22px]">
    <h2 className="t-card-title">Wallet &amp; Credits — expiry</h2>
    <p className="mt-[10px]">New recharges of ₹500 or less have a 30-day validity. Larger recharges and balances held before this policy are not subject to this expiry. Credits expiring first are spent first.</p>
    <p className="mt-[10px]">A 30-day extension costs ₹500. Check the remaining balance before paying: the fee may exceed the credits you retain. There is no automatic charge.</p>
    {body.expiry.lots.length ? <ul className="mt-[12px] space-y-[8px]">{body.expiry.lots.map(lot => <li key={lot.id}>{lot.remainingCredits} credits — expires {new Date(lot.expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}{body.expiry?.extension.available ? <ExtendCreditsButton lotId={lot.id} /> : null}</li>)}</ul> : <p className="mt-[12px]">No remaining credits have an expiry date.</p>}
    <p className="mt-[12px] text-muted">{body.expiry.extension.reason}</p>
  </Card>;
}
