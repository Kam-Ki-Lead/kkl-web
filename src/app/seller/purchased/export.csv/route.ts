import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";

/**
 * CSV of the caller's own purchased leads (S-12, S-13).
 *
 * A route handler rather than a client-side blob, for two reasons. The file is
 * built from data the caller is entitled to, decided server-side, so the browser
 * never needs a list it could otherwise assemble from. And a real export has to
 * be logged — who downloaded which leads, and when — which only the server can
 * do. That logging is kkl-backend's and is not implemented here.
 *
 * `no-store`: a purchased-lead export must not sit in a shared cache.
 */
export async function GET() {
  const file = await getServices().leadMarket.exportPurchased({ format: "csv" });

  return new NextResponse(file.body, {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${file.filename}"`,
      "cache-control": "no-store",
    },
  });
}
