/**
 * A stand-in for the published auth and enquiry routes, for a frontend run
 * when kkl-backend is not the process being tested.
 *
 * It is not kkl-backend and it is not production authentication. Codes are
 * readable only from GET /v1/dev/challenges/{id}/code with the shared secret,
 * which is the documented development channel. Nothing here sends a message.
 *
 * PORT and KKL_DEV_AUTH_SECRET select the listener. The secret is local only.
 */
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";

const port = Number(process.env.PORT ?? 4011);
const secret = process.env.KKL_DEV_AUTH_SECRET ?? "";
if (!secret) {
  console.error("KKL_DEV_AUTH_SECRET is required");
  process.exit(1);
}

const challenges = new Map();
const sessions = new Map();
const accounts = new Map();
const enquiries = [];

function phoneOf(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return /^\d{10}$/.test(digits) ? digits : null;
}

function accountFor(phone) {
  let account = accounts.get(phone);
  if (!account) {
    account = {
      accountId: randomUUID(),
      role: "buyer",
      status: "active",
      displayName: `Buyer ${phone.slice(-4)}`,
      phoneMasked: `••••${phone.slice(-4)}`,
      phone,
    };
    accounts.set(phone, account);
  }
  return account;
}

function issue(account) {
  const pair = { id: randomUUID(), account, dead: false, rotated: false, accessDead: false };
  const access = randomBytes(24).toString("hex");
  const refresh = randomBytes(24).toString("hex");
  pair.access = access;
  pair.refresh = refresh;
  sessions.set(access, { pair, kind: "access" });
  sessions.set(refresh, { pair, kind: "refresh" });
  const now = Date.now();
  return {
    accessToken: access,
    expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
    refreshToken: refresh,
    refreshExpiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
    sessionId: pair.id,
    account: {
      accountId: account.accountId,
      role: account.role,
      status: account.status,
      displayName: account.displayName,
    },
  };
}

function revokeAll(account) {
  for (const entry of sessions.values()) {
    if (entry.pair.account === account) entry.pair.dead = true;
  }
}

function bearerAccount(req) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const entry = sessions.get(token);
  if (!entry || entry.kind !== "access") return null;
  if (entry.pair.dead || entry.pair.rotated || entry.pair.accessDead) return null;
  if (entry.pair.account.status === "suspended") return { suspended: true, account: entry.pair.account };
  return { suspended: false, account: entry.pair.account };
}

function send(res, status, body) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function enquiryView(row) {
  return {
    id: row.id,
    reference: row.reference,
    kind: row.kind,
    status: "new",
    listingId: null,
    subjectRef: row.subjectRef,
    subjectLabel: row.subjectLabel,
    message: row.message,
    createdAt: row.createdAt,
    routing: "pending_backend_property",
    duplicate: row.duplicate === true,
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return send(res, 200, {
        service: "kkl-auth-stub",
        ok: true,
        devAuth: true,
        otpDelivery: "local",
        note: "Development stand-in. Not production authentication.",
      });
    }

    if (req.method === "POST" && url.pathname === "/__test/expire-challenge") {
      const body = await readJson(req);
      const challenge = challenges.get(body.challengeId);
      if (challenge) challenge.expiresAt = new Date(Date.now() - 1000).toISOString();
      return send(res, 204);
    }

    if (req.method === "POST" && url.pathname === "/__test/expire-access") {
      const body = await readJson(req);
      const entry = sessions.get(body.accessToken);
      if (entry?.kind === "access") entry.pair.accessDead = true;
      return send(res, 204);
    }

    if (req.method === "POST" && url.pathname === "/__test/shutdown") {
      send(res, 204);
      server.close();
      return;
    }

    if (req.method === "POST" && url.pathname === "/v1/auth/code") {
      const body = await readJson(req);
      if (body.role === "staff") {
        return send(res, 422, {
          error: "Staff accounts are not created here.",
          code: "validation_failed",
          field: "role",
        });
      }
      const phone = phoneOf(body.phone);
      if (!phone) {
        return send(res, 422, { error: "Enter a mobile number.", code: "validation_failed", field: "phone" });
      }
      if (phone.endsWith("0001")) {
        return send(res, 429, {
          error: "Too many codes were requested.",
          code: "rate_limited",
          retryAfterSeconds: 60,
        });
      }
      if (phone.endsWith("0003")) {
        return send(res, 503, {
          error: "No delivery provider is configured.",
          code: "delivery_unavailable",
        });
      }
      const challengeId = randomUUID();
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      challenges.set(challengeId, { challengeId, code, phone, expiresAt, attempts: 0, used: false });
      accountFor(phone);
      return send(res, 201, {
        challengeId,
        expiresAt,
        deliveryChannel: "local",
        attemptsAllowed: 5,
        phoneMasked: `••••${phone.slice(-4)}`,
      });
    }

    const codeRead = url.pathname.match(/^\/v1\/dev\/challenges\/([^/]+)\/code$/);
    if (req.method === "GET" && codeRead) {
      if (req.headers["x-kkl-dev-secret"] !== secret) {
        return send(res, 401, { error: "The development secret did not match.", code: "unauthorized" });
      }
      const challenge = challenges.get(codeRead[1]);
      if (!challenge) return send(res, 404, { error: "No local code for that challenge.", code: "not_found" });
      return send(res, 200, { code: challenge.code });
    }

    if (req.method === "POST" && url.pathname === "/v1/auth/sessions") {
      const body = await readJson(req);
      const challenge = challenges.get(body.challengeId);
      if (!challenge || challenge.used || challenge.attempts >= 5 || Date.parse(challenge.expiresAt) <= Date.now()) {
        return send(res, 401, { error: "That code has expired.", code: "unauthorized" });
      }
      if (body.code !== challenge.code) {
        challenge.attempts += 1;
        return send(res, 401, { error: "That code is not correct.", code: "unauthorized" });
      }
      challenge.used = true;
      const account = accountFor(challenge.phone);
      if (challenge.phone.endsWith("0002")) {
        account.status = "suspended";
        return send(res, 403, { error: "This account is suspended.", code: "account_suspended" });
      }
      return send(res, 201, issue(account));
    }

    if (req.method === "POST" && url.pathname === "/v1/auth/sessions/refresh") {
      const body = await readJson(req);
      const entry = sessions.get(body.refreshToken);
      if (!entry || entry.kind !== "refresh" || entry.pair.dead || entry.pair.rotated) {
        if (entry?.pair?.account) revokeAll(entry.pair.account);
        return send(res, 401, { error: "That session has ended. Sign in again.", code: "unauthorized" });
      }
      entry.pair.dead = true;
      entry.pair.rotated = true;
      return send(res, 201, issue(entry.pair.account));
    }

    if (req.method === "DELETE" && (url.pathname === "/v1/sessions/current" || url.pathname === "/v1/sessions")) {
      const header = req.headers.authorization ?? "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      const entry = sessions.get(token);
      if (!entry) return send(res, 401, { error: "Sign in to continue.", code: "unauthorized" });
      if (url.pathname === "/v1/sessions") revokeAll(entry.pair.account);
      else entry.pair.dead = true;
      if (url.pathname === "/v1/sessions") return send(res, 200, { revoked: 1 });
      return send(res, 204);
    }

    if (req.method === "GET" && url.pathname === "/v1/me") {
      const who = bearerAccount(req);
      if (!who) return send(res, 401, { error: "Sign in to continue.", code: "unauthorized" });
      if (who.suspended) {
        return send(res, 403, { error: "This account is suspended.", code: "account_suspended" });
      }
      return send(res, 200, {
        accountId: who.account.accountId,
        role: who.account.role,
        displayName: who.account.displayName,
        status: who.account.status,
        phone: who.account.phoneMasked,
      });
    }

    if (req.method === "POST" && url.pathname === "/v1/enquiries") {
      const who = bearerAccount(req);
      if (!who) return send(res, 401, { error: "Sign in to continue.", code: "unauthorized" });
      if (who.suspended) {
        return send(res, 403, { error: "This account is suspended.", code: "account_suspended" });
      }
      const body = await readJson(req);
      if (!body.idempotencyKey) {
        return send(res, 422, { error: "An idempotency key is required.", code: "validation_failed", field: "idempotencyKey" });
      }
      const existing = enquiries.find((row) => row.id === body.idempotencyKey);
      if (existing) {
        if (existing.accountId !== who.account.accountId) return send(res, 404, { error: "Not found.", code: "not_found" });
        return send(res, 200, enquiryView({ ...existing, duplicate: true }));
      }
      const row = {
        id: body.idempotencyKey,
        reference: `EN-${enquiries.length + 1}`,
        accountId: who.account.accountId,
        kind: body.kind === "visit_request" ? "visit_request" : "enquiry",
        subjectRef: body.subjectRef ?? "",
        subjectLabel: body.subjectLabel ?? body.subjectRef ?? "",
        message: body.message ?? null,
        createdAt: new Date().toISOString(),
      };
      enquiries.push(row);
      return send(res, 201, enquiryView(row));
    }

    if (req.method === "GET" && url.pathname === "/v1/enquiries") {
      const who = bearerAccount(req);
      if (!who) return send(res, 401, { error: "Sign in to continue.", code: "unauthorized" });
      const mine = enquiries.filter((row) => row.accountId === who.account.accountId);
      return send(res, 200, { enquiries: mine.map((row) => enquiryView(row)) });
    }

    const one = url.pathname.match(/^\/v1\/enquiries\/([^/]+)$/);
    if (req.method === "GET" && one) {
      const who = bearerAccount(req);
      if (!who) return send(res, 401, { error: "Sign in to continue.", code: "unauthorized" });
      const row = enquiries.find((item) => item.id === one[1] && item.accountId === who.account.accountId);
      if (!row) return send(res, 404, { error: "Not found.", code: "not_found" });
      return send(res, 200, enquiryView(row));
    }

    return send(res, 404, { error: "No such route.", code: "not_found" });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: "The stand-in failed.", code: "internal" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`auth stub listening on 127.0.0.1:${port}`);
});
