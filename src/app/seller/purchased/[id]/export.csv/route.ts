import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";
import { serviceErrorResponse } from "@/lib/http/service-response";

/** One purchased lead as CSV. See ../../export.csv/route.ts for the reasoning. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const services = getServices();

  // Asking the service for the lead first means an id the caller does not own
  // produces a 404, not an empty file that looks like a successful export.
  let owned;
  try {
    owned = await services.leadMarket.getPurchased(id);
  } catch (error) {
    const refused = serviceErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
  if (!owned) return new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store" } });

  try {
    const file = await services.leadMarket.exportPurchased({ format: "csv", ids: [id] });
    return new NextResponse(file.body, {
      headers: {
        "content-type": file.contentType,
        "content-disposition": `attachment; filename="kkl-lead-${id}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const refused = serviceErrorResponse(error);
    if (refused) return refused;
    throw error;
  }
}
