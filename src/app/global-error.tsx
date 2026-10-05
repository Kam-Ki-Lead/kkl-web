"use client";

/**
 * The last resort: a failure in the root layout itself.
 *
 * `error.tsx` renders inside the root layout, so it cannot help when that
 * layout is what threw. This replaces the whole document, which is why it
 * renders its own `<html>` and `<body>` and why it cannot use the shared
 * components — the stylesheet the root layout loads is not loaded here.
 * Every value is inline for that reason, and the colours are the brand
 * tokens' own values rather than the variables, which are not defined
 * either.
 *
 * It must not import anything that could be the thing that failed.
 *
 * Like `error.tsx`, it says nothing about whether a mutation committed. It
 * used to claim that nothing had been submitted and no credits spent, which
 * it cannot know: a server action can succeed and the render after it can
 * still throw. See `error.tsx` for the full reasoning.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#FFFFFF",
          color: "#12182B",
          font: "400 16px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <main style={{ maxWidth: "46ch", textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: "21px", fontWeight: 700, color: "#4B2973" }}>
            Kaam Ki Lead could not start this page
          </h1>
          <p style={{ marginTop: "8px", color: "#4A5168" }}>
            Something failed before the page could be built. If you had just submitted
            something — a purchase, an enquiry or a form — this screen cannot tell you whether
            it went through. Open your dashboard and check your orders, purchases or enquiries
            before sending it again, so you do not do it twice.
            {error.digest ? ` Quote reference ${error.digest} if you contact support.` : ""}
          </p>
          <p style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                font: "inherit",
                fontWeight: 600,
                padding: "10px 18px",
                borderRadius: "8px",
                border: "1px solid #4B2973",
                background: "#643681",
                color: "#FFFFFF",
                cursor: "pointer",
              }}
            >
              Reload this page
            </button>
            {/*
              A plain <a>, not next/link. The root layout is what failed, so a
              client-side navigation would route through the thing that is
              broken. A full page load is the recovery.
            */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                font: "inherit",
                fontWeight: 600,
                padding: "10px 18px",
                borderRadius: "8px",
                border: "1px solid #8A8E9C",
                background: "#FFFFFF",
                color: "#12182B",
                textDecoration: "none",
              }}
            >
              Go to the homepage
            </a>
          </p>
          <p style={{ marginTop: "10px", fontSize: "14px", color: "#5B6075" }}>
            Reloading this page does not resend anything.
          </p>
        </main>
      </body>
    </html>
  );
}
