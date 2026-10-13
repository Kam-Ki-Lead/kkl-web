/**
 * Contract decisions for /v1/auth/* that do not need a server.
 *
 * Run with the rest of the suite: npm test
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  codeRequestBody,
  interpretAuthResponse,
  localIndianMobile,
  safeNext,
  sessionRequestBody,
} from "../src/lib/auth/contract.ts";
import { ACCESS_COOKIE, REFRESH_COOKIE, sessionCookieOptions } from "../src/lib/auth/cookies.ts";

test("a code request carries the number and never a role", () => {
  const body = codeRequestBody("9830012345");
  assert.deepEqual(body, { phone: "+919830012345" });
  assert.equal("role" in body, false);
  assert.equal(localIndianMobile("98300 12345"), "9830012345");
  assert.equal(localIndianMobile("+91 9830012345"), "9830012345");
  assert.equal(localIndianMobile("12345"), null);
});

test("a session request is the challenge and the code, nothing else", () => {
  const body = sessionRequestBody("11111111-1111-1111-1111-111111111111", "482913");
  assert.deepEqual(Object.keys(body).sort(), ["challengeId", "code"]);
});

test("the return path stays on this site", () => {
  assert.equal(safeNext("/enquiry/confirm"), "/enquiry/confirm");
  assert.equal(safeNext("//evil.example/auth"), "/account");
  assert.equal(safeNext("https://evil.example"), "/account");
  assert.equal(safeNext(""), "/account");
  assert.equal(safeNext("/\\evil.example"), "/account");
  assert.equal(safeNext("/%2f%2fevil.example"), "/account");
  assert.equal(safeNext("/%5Cevil.example"), "/account");
  assert.equal(safeNext("/auth\r\nLocation: https://evil.example"), "/account");
});

test("rate limit, suspension, a bad code and an outage stay distinct", () => {
  const limited = interpretAuthResponse(429, {
    error: "Too many codes were requested.",
    code: "rate_limited",
    retryAfterSeconds: 60,
  }, "code");
  assert.equal(limited?.kind, "rate_limited");
  assert.match(limited?.message ?? "", /60/);

  const suspended = interpretAuthResponse(403, {
    error: "This account is suspended.",
    code: "account_suspended",
  }, "verify");
  assert.equal(suspended?.kind, "suspended");

  const expired = interpretAuthResponse(401, {
    error: "That code has expired.",
    code: "unauthorized",
  }, "verify");
  assert.equal(expired?.kind, "invalid_code");
  assert.match(expired?.message ?? "", /expired/);

  const refresh = interpretAuthResponse(401, { error: "Sign in again.", code: "unauthorized" }, "refresh");
  assert.equal(refresh?.kind, "unauthorized");

  const down = interpretAuthResponse(503, {
    error: "No delivery provider is configured.",
    code: "delivery_unavailable",
  }, "code");
  assert.equal(down?.kind, "unavailable");
  assert.equal(interpretAuthResponse(201, {}, "verify"), null);
});

test("session cookies are httpOnly and the two tokens are different cookies", () => {
  const options = sessionCookieOptions(60);
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.notEqual(ACCESS_COOKIE, REFRESH_COOKIE);
});


test("a password refusal says the same thing however it failed", () => {
  // The API refuses three different situations with one sentence — no
  // account, no password set, wrong password — and the frontend must not
  // handle them into three different messages. An account-enumeration oracle
  // is not something a frontend gets to add back.
  const api = "That email address and password do not match an account.";
  for (const body of [
    { error: api, code: "unauthorized" },
    { error: api, code: "unauthorized", field: "password" },
  ]) {
    const refused = interpretAuthResponse(401, body, "password");
    assert.equal(refused?.kind, "invalid_code");
    assert.equal(refused?.message, api);
  }

  // And the fallback, for a response that carried no sentence at all, is
  // about this form rather than about a code that was never sent.
  const bare = interpretAuthResponse(401, {}, "password");
  assert.match(bare?.message ?? "", /email address and password/);
  assert.equal(/code/i.test(bare?.message ?? ""), false);
});

test("a password rate limit is not described as a code being resent", () => {
  const limited = interpretAuthResponse(429, { retryAfterSeconds: 90 }, "password");
  assert.equal(limited?.kind, "rate_limited");
  assert.equal(limited?.retryAfterSeconds, 90);
  assert.match(limited?.message ?? "", /try again in 90 seconds/);
  assert.equal(/request another code/i.test(limited?.message ?? ""), false);

  // The code form's own wording is unchanged.
  const code = interpretAuthResponse(429, { retryAfterSeconds: 90 }, "code");
  assert.match(code?.message ?? "", /request another code in 90 seconds/);
});

test("a suspended account is still reported as suspended on the password form", () => {
  const suspended = interpretAuthResponse(403, {
    error: "This account is suspended. Contact support.",
    code: "account_suspended",
  }, "password");
  assert.equal(suspended?.kind, "suspended");
});
