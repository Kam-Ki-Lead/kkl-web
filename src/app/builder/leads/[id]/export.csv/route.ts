import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";

/** One purchased lead as CSV, 404 when this account does not own it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const services = getServices().builder;
  const owned = await services.leadMarket.getPurchased(id);
  if (!owned) return new NextResponse("Not found", { status: 404 });

  const file = await services.leadMarket.exportPurchased({ format: "csv", ids: [id] });
  return new NextResponse(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="kkl-builder-lead-${id}.csv"`,
      "cache-control": "no-store",
    },
  });
}
