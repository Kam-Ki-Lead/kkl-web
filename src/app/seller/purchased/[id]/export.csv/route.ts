import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";

/** One purchased lead as CSV. See ../../export.csv/route.ts for the reasoning. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const services = getServices();

  // Asking the service for the lead first means an id the caller does not own
  // produces a 404, not an empty file that looks like a successful export.
  const owned = await services.leadMarket.getPurchased(id);
  if (!owned) return new NextResponse("Not found", { status: 404 });

  const file = await services.leadMarket.exportPurchased({ format: "csv", ids: [id] });

  return new NextResponse(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="kkl-lead-${id}.csv"`,
      "cache-control": "no-store",
    },
  });
}
