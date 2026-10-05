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
            Something failed before the page could be built. Nothing you had entered has been
            submitted, and no credits have been spent.
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
              Try again
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
        </main>
      </body>
    </html>
  );
}
