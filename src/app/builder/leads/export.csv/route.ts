import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";

/** CSV of this Builder's purchased leads. See the Seller's equivalent for the reasoning. */
export async function GET() {
  const file = await getServices().builder.leadMarket.exportPurchased({ format: "csv" });
  return new NextResponse(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.filename}"`,
      "cache-control": "no-store",
    },
  });
}
