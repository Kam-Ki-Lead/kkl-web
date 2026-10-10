/**
 * A script that runs while the browser parses the HTML, before first paint.
 *
 * This is the documented Next.js 16 way to correct server-rendered markup
 * with a value only the browser has — here, the city the visitor last chose.
 * See `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`.
 *
 * `type` is "text/javascript" on the server and "text/plain" in the browser:
 * on a hard navigation the script executes and fixes the DOM; on a soft
 * navigation React renders the Client Component directly and the inert copy
 * is ignored. `suppressHydrationWarning` covers that deliberate mismatch.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
