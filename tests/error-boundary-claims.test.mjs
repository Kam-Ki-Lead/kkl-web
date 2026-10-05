import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * What the error boundaries are allowed to tell a customer.
 *
 * Both boundaries used to say "Nothing you had entered has been submitted,
 * and no credits have been spent." Neither is in a position to say it. A
 * server action can complete — deduct the credits, create the order, release
 * the contact — and the render that follows can still throw; the boundary
 * receives an error, not an outcome. In the one case that matters most it
 * was telling a customer their purchase had failed when it had succeeded,
 * which invites them to buy the same lead twice.
 *
 * These are static assertions over the two files. They are the regression
 * guard: the wording is the defect, so the wording is what is pinned. The
 * live scenario — a committed sample-mode purchase, then a render failure,
 * then the purchase still present — was driven in a browser against a
 * production build and is recorded in
 * `docs/phase-2/error-boundary-scenario.md`.
 */

const BOUNDARIES = [
  ["error.tsx", "src/app/error.tsx"],
  ["global-error.tsx", "src/app/global-error.tsx"],
];

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * The copy, with the explanatory comment removed.
 *
 * The comment deliberately quotes the old sentence to explain why it went,
 * so asserting over the whole file would match its own documentation.
 */
function copyOf(path) {
  return read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

test("neither boundary claims a submission did not happen", () => {
  const forbidden = [
    /nothing\s+you\s+had\s+entered/i,
    /has\s+not\s+been\s+submitted/i,
    /nothing\s+(has\s+)?been\s+submitted/i,
    /was\s+not\s+submitted/i,
    /no\s+credits\s+(have\s+)?been\s+spent/i,
    /no\s+credits\s+were\s+(spent|deducted|charged)/i,
    /nothing\s+(has\s+been\s+)?charged/i,
    /your\s+(purchase|order|payment)\s+(has\s+)?failed/i,
    /no\s+(payment|charge|order)\s+was\s+(taken|made|created)/i,
    /nothing\s+was\s+saved/i,
  ];
  for (const [label, path] of BOUNDARIES) {
    const copy = copyOf(path);
    for (const pattern of forbidden) {
      assert.equal(pattern.test(copy), false,
        `${label} claims an outcome it cannot know: ${pattern}`);
    }
  }
});

test("neither boundary claims a submission did happen either", () => {
  // The opposite error is just as wrong. The boundary knows nothing.
  const forbidden = [
    /your\s+(purchase|order)\s+(was|has been)\s+(completed|successful)/i,
    /credits\s+(have\s+)?been\s+deducted/i,
    /we\s+have\s+received\s+your/i,
  ];
  for (const [label, path] of BOUNDARIES) {
    const copy = copyOf(path);
    for (const pattern of forbidden) {
      assert.equal(pattern.test(copy), false, `${label} asserts success: ${pattern}`);
    }
  }
});

test("both boundaries say the outcome is unknown from here", () => {
  for (const [label, path] of BOUNDARIES) {
    const copy = copyOf(path);
    assert.match(copy, /cannot tell you whether/i,
      `${label} does not say the outcome is unknown`);
  }
});

test("both boundaries send the customer to the record that does know", () => {
  for (const [label, path] of BOUNDARIES) {
    const copy = copyOf(path);
    assert.match(copy, /orders/i, `${label} does not name the order record`);
    assert.match(copy, /check/i, `${label} does not tell the customer to check`);
    assert.match(copy, /before\s+sending\s+it\s+again/i,
      `${label} does not warn against resubmitting blind`);
  }
});

test("neither boundary offers an action that could resubmit", () => {
  for (const [label, path] of BOUNDARIES) {
    const copy = copyOf(path);
    // The recovery control re-renders. It must be labelled as what it does,
    // so nobody reads "Try again" as "send it again".
    assert.match(copy, /Reload this page/,
      `${label} does not label its recovery control as a reload`);
    assert.match(copy, /does not resend anything/i,
      `${label} does not say that reloading resends nothing`);
    // No form, no submit, no server action reachable from an error screen.
    assert.equal(/<form/i.test(copy), false, `${label} renders a form`);
    assert.equal(/formAction|type="submit"/i.test(copy), false,
      `${label} offers a submit control`);
  }
});

test("neither boundary exposes the internal error message", () => {
  for (const [label, path] of BOUNDARIES) {
    const copy = copyOf(path);
    assert.equal(/error\.message/.test(copy), false,
      `${label} renders error.message, which Next withholds in production`);
    assert.equal(/error\.stack/.test(copy), false, `${label} renders a stack`);
    // The digest is the safe reference and is kept.
    assert.match(copy, /error\.digest/, `${label} dropped the support reference`);
  }
});

test("the root boundary does not link to a role-specific console", () => {
  // It sits at the root segment and cannot know the signed-in role. A buyer
  // sent to /seller/orders gets an access panel, not help.
  const copy = copyOf("src/app/error.tsx");
  for (const route of ["/seller", "/builder", "/admin", "/account"]) {
    assert.equal(new RegExp(`href="${route}`).test(copy), false,
      `error.tsx links to ${route}, which the wrong role cannot open`);
  }
  assert.match(copy, /href="\/"/, "error.tsx has no safe way back");
});
