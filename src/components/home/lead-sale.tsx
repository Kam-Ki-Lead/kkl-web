import { isFrameworkSignal } from "@/lib/services/backend/session";
import { authBackendBaseUrl, marketplaceStoreKind } from "@/lib/services/backend/config";
import { ButtonLink } from "@/components/ui/button";
type SaleLead = { id: string; reference: string; locationName: string | null; propertyType: string | null; budgetBand: string | null; priceCredits: number; discountPercent: number };
export async function LeadSale() {
  if (marketplaceStoreKind() !== "backend") return null;
  let leads: SaleLead[];
  try {
    const response = await fetch(`${authBackendBaseUrl()}/v1/leads/sale`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Unavailable");
    const body = await response.json();
    if (!Array.isArray(body.leads)) throw new Error("Invalid sale feed");
    leads = body.leads;
  } catch (error) {
    if (isFrameworkSignal(error)) throw error;
    return <section className="my-[24px]"><h2 className="t-card-title">Leads on sale</h2><p>Sale leads could not be loaded. Please try again later.</p></section>;
  }
  return <section className="my-[24px]">
    <h2 className="t-card-title">Buy Leads on sale</h2>
    <p className="mt-[8px] text-muted">Unsold leads: 90% off at 7–13 days, 80% off at 14–20 days, and 50% off from day 21. Prices include current search demand and are confirmed before purchase.</p>
    {leads.length === 0 ? <p className="mt-[12px]">No eligible sale leads available right now.</p> : <div className="mt-[16px] grid gap-[16px] sm:grid-cols-2 lg:grid-cols-3">{leads.map(lead => <article key={lead.id} className="rounded-[10px] border border-line p-[18px]">
      <h3 className="font-bold">{lead.locationName ?? "Area not specified"} · {lead.propertyType ?? "Property lead"}</h3>
      <p>Buyer budget: {lead.budgetBand ?? "Not stated"}</p><p className="mt-[8px] font-bold">{lead.priceCredits} credits · {lead.discountPercent}% off</p>
      <p className="my-[8px] text-muted">Contact details stay private until an eligible purchase.</p>
      <ButtonLink href={`/seller/leads/${lead.id}`}>Buy Leads</ButtonLink>
    </article>)}</div>}
  </section>;
}
