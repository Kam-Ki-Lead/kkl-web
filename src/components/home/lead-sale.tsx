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
    return null;
  }
  if (leads.length === 0) return null;
  return <section className="my-[24px]">
    <h2 className="t-card-title">Lead offers</h2>
    {<div className="mt-[16px] grid gap-[16px] sm:grid-cols-2 lg:grid-cols-3">{leads.map(lead => <article key={lead.id} className="rounded-[10px] border border-line p-[18px]">
      <h3 className="font-bold">{lead.locationName ?? "Area not specified"} · {lead.propertyType ?? "Property lead"}</h3>
      <p>Buyer budget: {lead.budgetBand ?? "Not stated"}</p><p className="mt-[8px] font-bold">{lead.priceCredits} credits · {lead.discountPercent}% off</p>
      <ButtonLink href={`/seller/leads/${lead.id}`}>Buy Leads</ButtonLink>
    </article>)}</div>}
  </section>;
}
