"use server";
import { redirect } from "next/navigation";
import { callAs } from "@/lib/services/backend/session";
import { marketplaceStoreKind } from "@/lib/services/backend/config";
export async function searchLeads(form: FormData) {
  const path = form.get("marketplace") === "builder" ? "/builder/marketplace" : "/seller/leads";
  const role = path.startsWith("/builder") ? "builder" : "seller";
  const params = new URLSearchParams();
  for (const key of ["area", "budget", "config", "score", "tab", "sort"]) {
    const value = form.get(key);
    if (typeof value === "string" && value) params.set(key, value);
  }
  if (marketplaceStoreKind() === "backend" && params.get("area")) {
    const response = await callAs<{ error?: string }>(role, "/v1/leads/searches", { method: "POST", body: { locationId: params.get("area") } });
    if (response.status !== 200) throw new Error(response.body.error ?? "The lead search could not be recorded.");
  }
  redirect(`${path}?${params}`);
}
