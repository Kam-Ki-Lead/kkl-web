/**
 * Runtime configuration and the guard that keeps sample behaviour out of production.
 *
 * kkl-web can render from one of two sources:
 *
 *   sample  Deterministic synthetic fixtures. Nothing is real — no payment is taken,
 *           no OTP is sent, no message is delivered, no account is authenticated,
 *           and no contact detail shown is a real person's.
 *   api     The real kkl-backend API.
 *
 * Sample mode exists for development and design review. It must never serve a
 * production deployment, because its "authentication", "payment" and "contact
 * reveal" are theatre. The guards below refuse that combination outright rather
 * than degrading quietly.
 *
 * Why there are two guards, not one
 * ---------------------------------
 * NEXT_PUBLIC_* values are inlined into the bundle at build time. A build-time
 * guard therefore only catches a build that was told it was for production. It
 * does NOT catch the more likely accident: a bundle built for review, deployed
 * to production, with NEXT_PUBLIC_KKL_ENV=production set on the server. The
 * inlined value still reads "review", the guard stays quiet, and simulated
 * sign-in and payment serve real users. That was verified to happen.
 *
 * So the authoritative values for the runtime guard are KKL_ENV and
 * KKL_DATA_SOURCE — deliberately without the NEXT_PUBLIC_ prefix, so they are
 * read from the process on each request instead of being frozen into the
 * bundle. assertDeploymentSafe() runs in proxy.ts, ahead of every request, and
 * refuses both the unsafe combination and any disagreement between what the
 * bundle was built as and what the server says it is.
 */

export type DataSource = "sample" | "api";

/** Where this build is destined to run. Deliberately separate from NODE_ENV so a
 *  local production build stays possible while a real production deploy is guarded. */
export type DeploymentEnv = "development" | "review" | "production";

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? undefined : raw;
}

function parseDeploymentEnv(): DeploymentEnv {
  const raw = readEnv("NEXT_PUBLIC_KKL_ENV") ?? "development";
  if (raw === "development" || raw === "review" || raw === "production") return raw;
  throw new Error(
    `NEXT_PUBLIC_KKL_ENV must be "development", "review" or "production"; received "${raw}".`,
  );
}

function parseDataSource(): DataSource {
  const raw = readEnv("NEXT_PUBLIC_KKL_DATA_SOURCE") ?? "sample";
  if (raw === "sample" || raw === "api") return raw;
  throw new Error(
    `NEXT_PUBLIC_KKL_DATA_SOURCE must be "sample" or "api"; received "${raw}".`,
  );
}

const deploymentEnv = parseDeploymentEnv();
const dataSource = parseDataSource();
const apiBaseUrl = readEnv("NEXT_PUBLIC_KKL_API_BASE_URL");

/*
 * Fail closed, at module load, in both directions.
 */
if (deploymentEnv === "production" && dataSource === "sample") {
  throw new Error(
    "Refusing to start: NEXT_PUBLIC_KKL_ENV=production with NEXT_PUBLIC_KKL_DATA_SOURCE=sample. " +
      "Sample mode simulates authentication, payment and contact reveal and must never serve " +
      "production traffic. Set NEXT_PUBLIC_KKL_DATA_SOURCE=api and point " +
      "NEXT_PUBLIC_KKL_API_BASE_URL at kkl-backend.",
  );
}

if (dataSource === "api" && apiBaseUrl === undefined) {
  throw new Error(
    "Refusing to start: NEXT_PUBLIC_KKL_DATA_SOURCE=api requires NEXT_PUBLIC_KKL_API_BASE_URL. " +
      "kkl-web does not fall back to sample data when the API is unconfigured.",
  );
}

/**
 * Per-request deployment guard. Throws rather than returning a value, because
 * there is no safe degraded mode: the alternative to refusing is serving
 * simulated authentication to real users.
 *
 * Reads the process on every call. Do not hoist these reads to module scope —
 * the point is that they are not build-time constants.
 */
export function assertDeploymentSafe(): void {
  const serverEnv = readEnv("KKL_ENV");
  const serverSource = readEnv("KKL_DATA_SOURCE");

  const effectiveEnv = serverEnv ?? deploymentEnv;
  const effectiveSource = serverSource ?? dataSource;

  if (effectiveEnv === "production" && effectiveSource === "sample") {
    throw new Error(
      "Refusing to serve: this deployment is marked production but is running sample services. " +
        "Sample mode simulates authentication, payment and contact reveal. Set KKL_DATA_SOURCE=api " +
        "and NEXT_PUBLIC_KKL_API_BASE_URL, and rebuild with NEXT_PUBLIC_KKL_DATA_SOURCE=api.",
    );
  }

  // A build for one environment deployed as another. The bundle's inlined value
  // and the server's disagree, so nothing about the running app can be trusted
  // to match what it claims — including which services it is talking to.
  if (serverEnv !== undefined && serverEnv !== deploymentEnv) {
    throw new Error(
      `Refusing to serve: built with NEXT_PUBLIC_KKL_ENV=${deploymentEnv} but deployed with ` +
        `KKL_ENV=${serverEnv}. NEXT_PUBLIC_* values are frozen at build time, so this bundle is ` +
        `not the one this environment asked for. Rebuild with NEXT_PUBLIC_KKL_ENV=${serverEnv}.`,
    );
  }

  if (serverSource !== undefined && serverSource !== dataSource) {
    throw new Error(
      `Refusing to serve: built with NEXT_PUBLIC_KKL_DATA_SOURCE=${dataSource} but deployed with ` +
        `KKL_DATA_SOURCE=${serverSource}. The data source is decided at build time, so setting it ` +
        `on the server alone has no effect. Rebuild with NEXT_PUBLIC_KKL_DATA_SOURCE=${serverSource}.`,
    );
  }
}

export const runtimeConfig = {
  deploymentEnv,
  dataSource,
  apiBaseUrl,
  /** True when screens are rendering fixtures rather than real data. */
  isSampleMode: dataSource === "sample",
} as const;
