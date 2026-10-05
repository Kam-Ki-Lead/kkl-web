#!/usr/bin/env node
// Builds KKL_Technical_Documentation.md from the chapter files in this folder.
//
// The consolidated document carries the full text of every chapter, not links
// to them, so a reader who only has the single file loses nothing. It is
// generated rather than written, so the two versions cannot drift apart: edit
// a chapter, re-run `node docs/technical-history/build-consolidated.mjs`.
//
// Nothing outside this folder is read or written.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUTPUT = "KKL_Technical_Documentation.md";

const CHAPTERS = [
  "01-project-scope-and-evolution.md",
  "02-prompt-by-prompt-worklog.md",
  "03-architecture-and-repository-boundaries.md",
  "04-design-and-frontend-methodology.md",
  "05-role-journeys-and-screen-implementation.md",
  "06-data-services-and-backend-integration.md",
  "07-security-verification-and-accessibility.md",
  "08-defects-root-causes-and-corrections.md",
  "09-client-changes-and-decision-history.md",
  "10-environments-and-reproducibility.md",
  "11-current-status-and-outstanding-work.md",
];

// README sections carried into the front matter. The chapter table and the
// pointer to this file are not carried: the table is regenerated below as a
// contents list, and a document does not link to itself.
const FRONT_MATTER_SECTIONS = [
  "Repositories and commits documented",
  "Source coverage",
];

const read = (name) => readFileSync(join(here, name), "utf8");

/** Slug in the style GitHub uses for heading anchors. */
const slugger = () => {
  const seen = new Map();
  return (text) => {
    const base = text
      .replace(/`/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\*\*/g, "")
      .toLowerCase()
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/ +/g, "-");
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
};

/**
 * Walk a Markdown document line by line, skipping fenced code blocks so that
 * shell comments such as `# 1. PostgreSQL 16` are never mistaken for headings.
 */
function eachLine(markdown, visit) {
  let fence = null;
  const out = [];
  for (const line of markdown.split("\n")) {
    const opener = /^\s*(```+|~~~+)/.exec(line);
    if (fence) {
      if (opener && line.trim().startsWith(fence)) fence = null;
      out.push(visit(line, true));
      continue;
    }
    if (opener) {
      fence = opener[1];
      out.push(visit(line, true));
      continue;
    }
    out.push(visit(line, false));
  }
  return out.join("\n");
}

/** Demote every heading by one level, outside code fences. */
const demote = (markdown) =>
  eachLine(markdown, (line, inCode) =>
    inCode ? line : line.replace(/^(#{1,5}) /, "#$1 "),
  );

/** Collect headings (original levels) for the contents list. */
function headings(markdown) {
  const found = [];
  eachLine(markdown, (line, inCode) => {
    if (!inCode) {
      const m = /^(#{1,6}) +(.*?)\s*$/.exec(line);
      if (m) found.push({ level: m[1].length, text: m[2] });
    }
    return line;
  });
  return found;
}

/** Extract the text before the first `## ` heading. */
function intro(markdown) {
  const at = markdown.indexOf("\n## ");
  const body = at === -1 ? markdown : markdown.slice(0, at);
  return body.replace(/^# .*\n/, "").trim();
}

/** Extract one `## <title>` section, heading included. */
function section(markdown, title) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${title}`);
  if (start === -1) throw new Error(`README section not found: ${title}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^## /.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}

/** Minimal RFC 4180 reader; the matrix has no embedded newlines. */
function parseCsv(text) {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const cells = [];
      let cell = "";
      let quoted = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (quoted) {
          if (ch === '"') {
            if (line[i + 1] === '"') {
              cell += '"';
              i += 1;
            } else quoted = false;
          } else cell += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ",") {
          cells.push(cell);
          cell = "";
        } else cell += ch;
      }
      cells.push(cell);
      return cells;
    });
}

const escapeCell = (value) =>
  value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim() || "—";

function csvToTable(rows) {
  const [header, ...body] = rows;
  const head = header.map((h) => escapeCell(h.replace(/_/g, " ")));
  return [
    `| ${head.join(" | ")} |`,
    `|${head.map(() => "---").join("|")}|`,
    ...body.map((r) => `| ${r.map(escapeCell).join(" | ")} |`),
  ].join("\n");
}

// ---------------------------------------------------------------------------

const readme = read("README.md");
const chapters = CHAPTERS.map((file) => {
  const text = read(file);
  const title = /^# +(.*)$/m.exec(text)?.[1];
  if (!title) throw new Error(`No H1 in ${file}`);
  return { file, title, text };
});

const slug = slugger();
const toc = [];

// The contents list is built in document order, so every anchor it emits is
// the anchor the rendered document actually has.
const FRONT_TITLE = "0. About this package";
toc.push({ level: 1, text: FRONT_TITLE, anchor: slug(FRONT_TITLE) });
for (const title of FRONT_MATTER_SECTIONS) {
  toc.push({ level: 2, text: title, anchor: slug(title) });
}
for (const chapter of chapters) {
  for (const h of headings(chapter.text)) {
    if (h.level > 2) {
      slug(h.text); // consume, to keep anchor numbering aligned
      continue;
    }
    toc.push({ level: h.level, text: h.text, anchor: slug(h.text) });
  }
}
const APPENDIX_TITLE = "Appendix A. Traceability matrix";
toc.push({ level: 1, text: APPENDIX_TITLE, anchor: slug(APPENDIX_TITLE) });

const contents = toc
  .map(
    ({ level, text, anchor }) =>
      `${level === 1 ? "" : "    "}- [${text}](#${anchor})`,
  )
  .join("\n");

const matrix = parseCsv(read("traceability.csv"));

const document = `# Kaam Ki Lead — consolidated technical documentation

**Generated file — do not edit by hand.** It is assembled from the chapter
files in \`docs/technical-history/\` by \`build-consolidated.mjs\`, so the
chapters and this document cannot say different things. To change anything
here, change the chapter and re-run:

\`\`\`bash
node docs/technical-history/build-consolidated.mjs
\`\`\`

Sources: \`README.md\`, ${CHAPTERS.map((c) => `\`${c}\``).join(", ")}, and
\`traceability.csv\` — all in this folder.

${intro(readme)}

## Contents

${contents}

---

## ${FRONT_TITLE}

${FRONT_MATTER_SECTIONS.map((title) => demote(section(readme, title))).join("\n\n")}

${chapters.map((c) => `---\n\n${demote(c.text).trim()}`).join("\n\n")}

---

## ${APPENDIX_TITLE}

The same rows as \`traceability.csv\`, rendered for reading. The CSV remains the
machine-readable copy; both are generated from the same file, so a row that
appears here appears there.

Each row connects a prompt to what it produced: prompt → requirement or CR →
screen or state → repository and files → commit → verification evidence →
evidence class → current status.

Evidence classes are the ones defined in chapter 7 — **H** historical, **A**
audit-rerun, **C** CR-pass, **S** source inspection, **V** visual inspection,
**G** geometry/token, **L** known limitation; a pair such as \`G/H\` means both
applied. A dash means the row has no verification evidence at all, which is the
honest answer for an interrupted prompt or a re-issue that produced no work of
its own.

${csvToTable(matrix)}
`;

writeFileSync(join(here, OUTPUT), document);
process.stdout.write(
  `${OUTPUT}: ${document.split("\n").length} lines, ` +
    `${chapters.length} chapters, ${matrix.length - 1} matrix rows\n`,
);
