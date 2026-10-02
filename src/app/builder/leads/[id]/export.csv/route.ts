import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";
import { serviceErrorResponse } from "@/lib/http/service-response";

/** One purchased lead as CSV, 404 when this account does not own it. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const services = getServices().builder;
  try {
    const owned = await services.leadMarket.getPurchased(id);
    if (!owned) {
      return new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store" } });
    }
    const file = await services.leadMarket.exportPurchased({ format: "csv", ids: [id] });
    return new NextResponse(file.body, {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `attachment; filename="kkl-builder-lead-${id}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const refused = serviceErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
