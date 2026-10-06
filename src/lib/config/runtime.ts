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
 * bundle. assertDeploymentSafe() runs in proxy.ts, ahead of every request.
 *
 * WHAT THE GUARD CAN AND CANNOT DETECT
 * ------------------------------------
 * It cannot tell where it is running. Nothing available to a Node process
 * distinguishes a production host from a laptop, and this code does not try to
 * guess from hostnames, cloud metadata or anything else — a guess that can be
 * wrong is worse than a rule that is explicit.
 *
 * What it does instead is **require the deployment to declare itself**. A served
 * build (NODE_ENV=production, i.e. `next start`) must set both KKL_ENV and
 * KKL_DATA_SOURCE or it refuses to serve at all. That turns "nobody configured
 * this" from a silent fallback into a visible failure, which is the only honest
 * thing a guard in this position can do.
 *
 * Given those declarations it then refuses three things: production with sample
 * services, a bundle built for one environment deployed as another, and a
 * data-source disagreement between bundle and server.
 *
 * The residual risk, stated plainly: a deployment that declares itself
 * `KKL_ENV=review` while serving real users is not detectable here, and nothing
 * in a frontend could detect it. That is an operational control, not a code one.
 */

export type DataSource = "sample" | "api";

/** Where this build is destined to run. Deliberately separate from NODE_ENV so a
 *  local production build stays possible while a real production deploy is guarded.
 *
 *  `staging` is a deployment on a URL anyone can open, carrying synthetic data,
 *  for testing. It is not production — no live call, no live message, no real
 *  money — and it is not review, because review runs where only the reviewer
 *  can reach it. kkl-backend has the same four declarations, for the same
 *  reason: *anyone can reach this* and *this is the real business* are
 *  independent properties, and the machinery that is unsafe on a public
 *  address is not the same machinery that is unsafe with real money. */
export type DeploymentEnv = "development" | "review" | "staging" | "production";

/** Environments served on an address a stranger can open. */
const PUBLICLY_REACHABLE: ReadonlySet<string> = new Set(["staging", "production"]);

/** Read a variable from the live process, at the moment of the call. */
function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? undefined : raw;
}

/**
 * The values frozen into this bundle when it was built.
 *
 * **Every one of these must be written as a literal `process.env.NEXT_PUBLIC_…`
 * member access.** That exact syntax is what the bundler substitutes with the
 * build-time value; a computed lookup — `process.env[name]`, destructuring, a
 * variable holding the name — is left in the output untouched and therefore
 * reads the *server's* environment at request time instead.
 *
 * That distinction is the whole basis of the deployment guard below, which
 * compares what this bundle was built as against what the server says it is.
 * Sourcing either side from the same place makes the comparison meaningless.
 * **This file previously read them through `readEnv`,** and the consequences
 * were exactly that: a server started with only `KKL_ENV` refused a bundle
 * that in fact matched it, and a server that set all four variables compared
 * each value against itself and could never disagree. See
 * `docs/phase-2/verification.md`.
 */
const BUILT_ENV = process.env.NEXT_PUBLIC_KKL_ENV;
const BUILT_DATA_SOURCE = process.env.NEXT_PUBLIC_KKL_DATA_SOURCE;
const BUILT_API_BASE_URL = process.env.NEXT_PUBLIC_KKL_API_BASE_URL;

/** An unset variable and one set to "" mean the same thing here: not given. */
function given(raw: string | undefined): string | undefined {
  return raw === undefined || raw === "" ? undefined : raw;
}

function parseDeploymentEnv(): DeploymentEnv {
  const raw = given(BUILT_ENV) ?? "development";
  if (raw === "development" || raw === "review" || raw === "staging" || raw === "production") {
    return raw;
  }
  throw new Error(
    "NEXT_PUBLIC_KKL_ENV must be \"development\", \"review\", \"staging\" or " +
      `"production"; received "${raw}".`,
  );
}

function parseDataSource(): DataSource {
  const raw = given(BUILT_DATA_SOURCE) ?? "sample";
  if (raw === "sample" || raw === "api") return raw;
  throw new Error(
    `NEXT_PUBLIC_KKL_DATA_SOURCE must be "sample" or "api"; received "${raw}".`,
  );
}

const deploymentEnv = parseDeploymentEnv();
const dataSource = parseDataSource();
const apiBaseUrl = given(BUILT_API_BASE_URL);

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

  // A production server must say what it is. Without this the guard falls back
  // to the values baked into the bundle, which means a deployment that sets
  // nothing at all runs whatever it was built as — and a review build deployed
  // to production with no server configuration would serve sample services in
  // silence. Refusing is the only way the absence of configuration is visible.
  //
  // NODE_ENV is "production" under `next start` and "development" under
  // `next dev`, so this applies to a served build and not to local development.
  // It does not apply during `next build`, because this function runs per
  // request in proxy.ts, not at build time.
  if (process.env.NODE_ENV === "production") {
    const missing = [
      serverEnv === undefined ? "KKL_ENV" : null,
      serverSource === undefined ? "KKL_DATA_SOURCE" : null,
    ].filter((name): name is string => name !== null);

    if (missing.length > 0) {
      throw new Error(
        `Refusing to serve: ${missing.join(" and ")} ${missing.length === 1 ? "is" : "are"} not set. ` +
          "A served build must state its environment and data source on the server, because the " +
          "values compiled into the bundle cannot be trusted to describe where it ended up. Set " +
          "KKL_ENV=development|review|production and KKL_DATA_SOURCE=sample|api to match the build. " +
          "For local review that is KKL_ENV=review KKL_DATA_SOURCE=sample — see " +
          "docs/phase-2/local-review.md.",
      );
    }
  }

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

  // ---------------------------------------------------------------- staging
  //
  // A staging deployment runs on an address a stranger can open, so the one
  // thing it may not do is the thing sample mode does for free: let anybody
  // in. With `KKL_AUTH` unset, the sign-in step accepts any six digits and
  // treats `000000` as the failure — that is the approved prototype's
  // behaviour, and it authenticates nobody. On a private review host that is
  // a reviewer walking through screens. On a public URL it is an open door to
  // every dashboard.
  //
  // So staging does NOT get the production rule (refuse `sample` outright).
  // It cannot: the platform-wide `api` client does not exist — kkl-backend
  // serves individual domains, each behind its own switch, and `getServices()`
  // throws for `api`. Refusing `sample` here would mean no staging deployment
  // is possible at all, which is how a guard gets bypassed instead of
  // satisfied. What staging gets instead is the narrower rule that closes the
  // actual hole: the session must be a real one, issued by kkl-backend's
  // published authenticator against a code it delivered.
  //
  // Everything else sample mode simulates — a purchase, a contact reveal —
  // stays visible as simulated, because the sample-mode banner renders above
  // every page and says so.
  if (PUBLICLY_REACHABLE.has(effectiveEnv) && effectiveSource === "sample") {
    const auth = readEnv("KKL_AUTH");
    if (auth !== "backend") {
      throw new Error(
        `Refusing to serve: KKL_ENV=${effectiveEnv} is a publicly reachable deployment running ` +
          "sample services, and KKL_AUTH is not \"backend\". The sample sign-in step accepts any " +
          "six digits, so this would let anyone open any dashboard. Set KKL_AUTH=backend and " +
          "KKL_BACKEND_BASE_URL so sign-in goes to kkl-backend's published authenticator.",
      );
    }
    if (readEnv("KKL_BACKEND_BASE_URL") === undefined
        && readEnv("KKL_LEAD_REQUESTS_BASE_URL") === undefined) {
      throw new Error(
        `Refusing to serve: KKL_ENV=${effectiveEnv} with KKL_AUTH=backend requires ` +
          "KKL_BACKEND_BASE_URL (or KKL_LEAD_REQUESTS_BASE_URL) pointing at kkl-backend. " +
          "Without an origin there is nowhere for a real session to come from.",
      );
    }
  }

  // The development identity issuer invents an account for a name and takes
  // the role from the caller, "staff" included. kkl-backend already refuses it
  // on a publicly reachable deployment; this refuses to deploy a web process
  // that is configured to try, so the failure is one start-up error rather
  // than a run of 404s nobody traces.
  if (PUBLICLY_REACHABLE.has(effectiveEnv)) {
    const devSecrets = ["KKL_DEV_AUTH_SECRET", "KKL_BACKEND_DEV_SECRET", "KKL_LEAD_REQUESTS_DEV_SECRET"]
      .filter((name) => readEnv(name) !== undefined);
    if (devSecrets.length > 0) {
      throw new Error(
        `Refusing to serve: ${devSecrets.join(", ")} ${devSecrets.length === 1 ? "is" : "are"} ` +
          `set on a ${effectiveEnv} deployment. That secret exists to call kkl-backend's ` +
          "development identity issuer, which invents an account for a name with whatever role " +
          "is asked for. It must not be present where the public can reach this process. " +
          "Remove it; KKL_AUTH=backend needs no shared secret.",
      );
    }
  }
}


export const runtimeConfig = {
  deploymentEnv,
  dataSource,
  apiBaseUrl,
  /** True when screens are rendering fixtures rather than real data. */
  isSampleMode: dataSource === "sample",
} as const;
