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
 * reveal" are theatre. The guard below refuses that combination outright rather
 * than degrading quietly.
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

export const runtimeConfig = {
  deploymentEnv,
  dataSource,
  apiBaseUrl,
  /** True when screens are rendering fixtures rather than real data. */
  isSampleMode: dataSource === "sample",
} as const;
