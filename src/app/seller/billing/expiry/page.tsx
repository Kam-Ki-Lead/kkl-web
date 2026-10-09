import { SellerShell } from "@/components/seller/seller-shell";
import { CreditExpiry } from "@/components/console/credit-expiry";
export const dynamic = "force-dynamic";
export const metadata = { title: "Credit expiry" };
export default function CreditExpiryPage() {
 return <SellerShell title="Credit expiry" subtitle="Remaining credits, validity and extension"><CreditExpiry role="seller" /></SellerShell>;
}
