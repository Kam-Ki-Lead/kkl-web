import { NextResponse } from "next/server";
import { ServiceError } from "@/lib/services/contracts";

/** A refused service call, as text. No contact file and no cache. */
export function serviceErrorResponse(error: unknown): NextResponse | null {
  if (!(error instanceof ServiceError)) return null;
  const status = error.kind === "unauthenticated" ? 401
    : error.kind === "forbidden" ? 403
      : error.kind === "not_found" ? 404
        : 503;
  return new NextResponse(error.message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
