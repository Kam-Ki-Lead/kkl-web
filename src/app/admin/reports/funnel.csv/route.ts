import { getServices } from "@/lib/services";

/**
 * A-29's CSV export.
 *
 * A Route Handler rather than a `data:` URI assembled in the browser, for the
 * same reason the Seller's lead export is one: the file comes from the same
 * service call the screen renders, so the download and the chart cannot
 * disagree, and the export works without JavaScript.
 */
export async function GET(): Promise<Response> {
  const funnel = await getServices().admin.funnelReport();

  const rows = [
    ["Stage", "Count", "Share of intaken"],
    ...funnel.map((stage) => [stage.label, String(stage.value), `${stage.percent}%`]),
    [],
    ["Synthetic figures for layout review. No performance claim is made."],
  ];

  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="kkl-lead-funnel-sample.csv"',
      "cache-control": "no-store",
    },
  });
}

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
