#!/usr/bin/env node
/**
 * extract-knowledge-map.mjs
 *
 * Parses the extracted text of Enterprise_Infrastructure_Knowledge_Map_Unified.pdf
 * (146 sessions, 10 layers, 1402 pages) into a structured JSON outline.
 *
 * The PDF is the user's own master curriculum. This script only STRUCTURE
 * information: session number, title, owning layer and page range. It does not
 * invent summaries. Content summaries are written by hand and kept in
 * docs/data/knowledge-map.json so they can be reviewed and corrected.
 *
 * The PDF and its text stay OUTSIDE the repository (private/). Only the
 * derived outline is committed, and only after review.
 *
 *   node scripts/extract-knowledge-map.mjs
 *   node scripts/extract-knowledge-map.mjs --dump N   # print session N's pages
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "private", "extract", "Enterprise_Infrastructure_Knowledge_Map_Unified.txt");
const OUT = join(ROOT, "docs", "data", "knowledge-map.json");

if (!existsSync(SRC)) {
  console.error(`Source not found: ${SRC}`);
  console.error("Set KNOWLEDGE_MAP_TXT to the extracted text file and retry.");
  process.exit(1);
}

const raw = readFileSync(SRC, "utf8");

/* ------------------------------------------------------------- page split */

const PAGE_RE = /^===== PAGE (\d+) =====$/gm;
const pages = [];
let m;
const marks = [];
while ((m = PAGE_RE.exec(raw)) !== null) {
  marks.push({ page: Number(m[1]), at: m.index, after: m.index + m[0].length });
}
for (let i = 0; i < marks.length; i++) {
  const start = marks[i].after;
  const end = i + 1 < marks.length ? marks[i + 1].at : raw.length;
  pages.push({ page: marks[i].page, text: raw.slice(start, end).trim() });
}

console.log(`Parsed ${pages.length} pages from the extract.`);
const declared = (raw.match(/pages:\s*(\d+)/) || [])[1];
if (declared && Number(declared) !== pages.length) {
  console.error(`FAIL: header declares ${declared} pages but found ${pages.length}. Extraction is truncated.`);
  process.exit(1);
}

/* -------------------------------------------------------------- TOC parse */

// "Session 42 - ICMP...........362" — dot leaders, variable spacing.
// The separator is an EM DASH (U+2014) in this document, not a hyphen, so all
// three dash forms must be accepted.
const DASH = "\\u2010-\\u2015";
const TOC_RE = new RegExp(`^Session\\s+(\\d+)\\s*[-${DASH}]\\s*(.+?)\\s*\\.{2,}\\s*(\\d+)\\s*$`);
const toc = [];
const layerAt = [];          // index -> current layer name seen in the TOC
let currentLayer = null;
const tocLines = raw.split(/\r?\n/);

for (let i = 0; i < tocLines.length; i++) {
  const line = tocLines[i].trim();
  const layerMatch = line.match(new RegExp(`^Layer\\s+(\\d+)\\s*[-${DASH}:]\\s*(.+)$`));
  const sessMatch = line.match(TOC_RE);

  if (layerMatch && !sessMatch) {
    currentLayer = {
      n: Number(layerMatch[1]),
      name: layerMatch[2].trim(),
    };
    continue;
  }
  if (sessMatch) {
    toc.push({
      n: Number(sessMatch[1]),
      title: sessMatch[2].trim(),
      tocPage: Number(sessMatch[3]),
      layer: currentLayer ? currentLayer.n : null,
      layerName: currentLayer ? currentLayer.name : null,
    });
  }
}

console.log(`Parsed ${toc.length} session entries from the table of contents.`);

/* ------------------------------------------------------- layer boundaries */

const LAYER_FALLBACK = {
  1: "Physical Hardware",
  2: "Operating Systems",
  3: "Networking",
  4: "Identity",
  5: "Enterprise Services",
  6: "Security",
  7: "Automation & CI/CD",
  8: "Containers & Observability",
  9: "Cloud",
  10: "Architecture & Governance",
};

const layers = new Map();
for (const s of toc) {
  const n = s.layer ?? 0;
  if (!layers.has(n)) layers.set(n, { n, name: s.layerName || LAYER_FALLBACK[n] || `Layer ${n}`, sessions: [] });
  layers.get(n).sessions.push(s.n);
}
for (const l of layers.values()) {
  if (l.sessions.length) {
    l.first = Math.min(...l.sessions);
    l.last = Math.max(...l.sessions);
  }
}

/* --------------------------------------------------------- end pages by toc */

// A session runs until the next session's TOC page (or the next layer title).
const sorted = [...toc].sort((a, b) => a.tocPage - b.tocPage);
for (let i = 0; i < sorted.length; i++) {
  sorted[i].endPage = i + 1 < sorted.length ? sorted[i + 1].tocPage - 1 : pages.length;
}

/* --------------------------------------------------- per-session digests */

// Pull the recurring structural headings the document uses so the outline can
// show what a session actually covers without storing 2.6 MB of prose.
const HEADING_HINTS = [
  /^What (?:You|We) (?:Will )?(?:Learn|Understand)/i,
  /^Why It Matters/i,
  /^Core Concepts?$/i,
  /^Key (?:Concepts?|Terms|Points?)/i,
  /^Architecture$/i,
  /^How It Works$/i,
  /^Deep Dive/i,
  /^Practical/i,
  /^Hands[- ]on/i,
  /^Lab/i,
  /^Check Your Understanding$/i,
  /^Summary$/i,
  /^Key Takeaways$/i,
];

function digest(session) {
  const text = pages
    .filter((p) => p.page >= session.tocPage && p.page <= session.endPage)
    .map((p) => p.text)
    .join("\n");
  const found = new Set();
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.length > 80) continue;
    if (HEADING_HINTS.some((re) => re.test(s))) found.add(s);
  }
  return [...found].slice(0, 8);
}

/* --------------------------------------------------------------- output */

const doc = {
  note:
    "Outline of the user's own master curriculum, Enterprise_Infrastructure_Knowledge_Map_Unified.pdf " +
    "(prepared July 2026, 146 sessions across 10 layers, 1402 pages). Structure extracted mechanically " +
    "from the document. Summaries and any corrections are added by hand and reviewed. The PDF itself " +
    "stays in the user's private library and is never committed to this repository.",
  source: "Enterprise_Infrastructure_Knowledge_Map_Unified.pdf",
  extracted: new Date().toISOString().slice(0, 10),
  totalPages: pages.length,
  totalSessions: toc.length,
  layers: [...layers.values()].sort((a, b) => a.n - b.n),
  sessions: sorted.map((s) => ({
    n: s.n,
    id: `km-${String(s.n).padStart(3, "0")}`,
    title: s.title,
    layer: s.layer,
    layerName: s.layerName,
    page: s.tocPage,
    endPage: s.endPage,
    headings: digest(s),
  })),
};

if (process.argv.includes("--dry-run")) {
  console.log(JSON.stringify(doc.layers, null, 1));
  console.log(`\nWould write ${doc.sessions.length} sessions to ${OUT}`);
  process.exit(0);
}

writeFileSync(OUT, JSON.stringify(doc, null, 2), "utf8");
console.log(`Wrote ${OUT}`);
console.log(`  ${doc.totalSessions} sessions, ${doc.layers.length} layers, ${doc.totalPages} pages`);
for (const l of doc.layers) {
  console.log(`  Layer ${String(l.n).padStart(2)}  ${String(l.sessions.length).padStart(3)} sessions  ${l.first}-${l.last}  ${l.name}`);
}