#!/usr/bin/env node
/**
 * extract-knowledge-map.mjs
 *
 * Parses the extracted text of Enterprise_Infrastructure_Knowledge_Map_Unified.pdf
 * (146 sessions, 10 layers, 1402 pages) into a structured JSON outline.
 *
 * WHAT THIS EXTRACTS
 * The document is highly regular: every session is a numbered list of titled
 * sections. Session 2, for example, runs Business Problem -> Concept -> Deep
 * Technical Explanation -> Internal Workflow -> Enterprise Placement ->
 * Dependencies -> Dependents -> Security Perspective -> Troubleshooting ->
 * Real Enterprise Example -> Cloud Perspective -> Automation Perspective ->
 * Career Perspective -> Interview Questions.
 *
 * Two things matter most and are extracted properly:
 *
 *   1. THE SECTION OUTLINE - which sections a session actually has. Section
 *      names vary between sessions ("Deep Tech" vs "Deep Technical
 *      Explanation", "Lab" vs "Lab Exercise" vs "Practical Lab"), so they are
 *      normalised to a canonical `kind` rather than matched as strings.
 *
 *   2. THE DEPENDENCY GRAPH - Dependencies, Dependents, Connections and
 *      Connections to Prior Sessions name OTHER topics in prose. Those names
 *      are resolved to session numbers, which turns 1402 pages of prose into a
 *      navigable graph. This is what makes "how does the actual system fit
 *      together" answerable.
 *
 * Prose bodies are NOT copied wholesale: the full text is 2.6 MB and belongs
 * in the user's own library. Only compact, high-value material is kept:
 * interview questions, memory anchors, and the resolved graph.
 *
 *   node scripts/extract-knowledge-map.mjs [--dry-run]
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
  process.exit(1);
}
const raw = readFileSync(SRC, "utf8");

/* ------------------------------------------------------------- page split */

const marks = [];
{
  const re = /^===== PAGE (\d+) =====$/gm;
  let m;
  while ((m = re.exec(raw)) !== null) {
    marks.push({ page: Number(m[1]), at: m.index, after: m.index + m[0].length });
  }
}
const pages = [];
for (let i = 0; i < marks.length; i++) {
  const end = i + 1 < marks.length ? marks[i + 1].at : raw.length;
  pages.push({ page: marks[i].page, text: raw.slice(marks[i].after, end) });
}

const declared = (raw.match(/pages:\s*(\d+)/) || [])[1];
if (declared && Number(declared) !== pages.length) {
  console.error(`FAIL: header declares ${declared} pages, found ${pages.length}. Extraction truncated.`);
  process.exit(1);
}

/* ------------------------------------------------------ canonical sections */

// The same logical section is titled differently across sessions. Map every
// observed spelling onto one `kind`, which is what the app renders.
const SECTION_KIND = {
  "business problem": "problem",
  "concept": "concept",
  "deep tech": "deep",
  "deep technical explanation": "deep",
  "deep dive": "deep",
  "internal workflow": "workflow",
  "how it works": "workflow",
  "architecture": "architecture",
  "diagrams": "diagram",
  "ascii diagrams": "diagram",
  "visual diagram": "diagram",
  "lab": "lab",
  "lab exercise": "lab",
  "practical lab": "lab",
  "hands on lab": "lab",
  "troubleshooting": "troubleshooting",
  "real enterprise example": "example",
  "enterprise placement": "enterprise",
  "dependencies": "dependencies",
  "dependents": "dependents",
  "connections": "connections",
  "connections to prior sessions": "connections",
  "security": "security",
  "security considerations": "security",
  "security perspective": "security",
  "misconceptions": "misconceptions",
  "common misconceptions": "misconceptions",
  "cloud perspective": "cloud",
  "automation perspective": "automation",
  "career perspective": "career",
  "memory anchors": "anchors",
  "interview questions": "interview",
  "personal notes": "notes",
  "personal notes section": "notes",
  "check your understanding": "check",
  "key takeaways": "takeaways",
  "summary": "takeaways",
};

const KIND_LABEL = {
  problem: "Business problem",
  concept: "Concept",
  deep: "Deep technical explanation",
  workflow: "How it works",
  architecture: "Architecture",
  diagram: "Diagrams",
  lab: "Lab",
  troubleshooting: "Troubleshooting",
  example: "Real enterprise example",
  enterprise: "Where it sits in the enterprise",
  dependencies: "Depends on",
  dependents: "Needed by",
  connections: "Related sessions",
  security: "Security perspective",
  misconceptions: "Common misconceptions",
  cloud: "Cloud perspective",
  automation: "Automation perspective",
  career: "Career perspective",
  anchors: "Memory anchors",
  interview: "Interview questions",
  notes: "Personal notes",
  check: "Check your understanding",
  takeaways: "Key takeaways",
};

// Reading order for the section list. Anything unlisted sorts last.
const KIND_ORDER = [
  "problem", "concept", "deep", "architecture", "workflow", "diagram",
  "example", "lab", "troubleshooting", "misconceptions",
  "dependencies", "connections", "dependents",
  "security", "cloud", "automation", "enterprise", "career",
  "anchors", "interview", "notes", "check", "takeaways",
];

/* -------------------------------------------------------------- TOC parse */

const DASH = "\\u2010-\\u2015";
const TOC_RE = new RegExp(`^Session\\s+(\\d+)\\s*[-${DASH}]\\s*(.+?)\\s*\\.{2,}\\s*(\\d+)\\s*$`);
const HEAD_RE = new RegExp(`^(\\d{1,2})\\.\\s+(.+?)\\s*$`);

const toc = [];
const layers = new Map();
let currentLayer = null;

for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  const layerM = t.match(new RegExp(`^Layer\\s+(\\d+)\\s*[-${DASH}:]\\s*(.+)$`));
  const sessM = t.match(TOC_RE);
  if (layerM && !sessM) { currentLayer = { n: +layerM[1], name: layerM[2].trim() }; continue; }
  if (sessM) {
    toc.push({
      n: +sessM[1], title: sessM[2].trim(), tocPage: +sessM[3],
      layer: currentLayer ? currentLayer.n : null,
      layerName: currentLayer ? currentLayer.name : null,
    });
  }
}
toc.sort((a, b) => a.tocPage - b.tocPage);
for (let i = 0; i < toc.length; i++) toc[i].endPage = i + 1 < toc.length ? toc[i + 1].tocPage - 1 : pages.length;
for (const s of toc) {
  if (!layers.has(s.layer)) layers.set(s.layer, { n: s.layer, name: s.layerName, sessions: [] });
  layers.get(s.layer).sessions.push(s.n);
}
for (const l of layers.values()) { l.first = Math.min(...l.sessions); l.last = Math.max(...l.sessions); }

/* ------------------------------------------------------------ text helpers */

// The PDF's bullet glyph extracts as U+F0B7 / "?" on its own. Strip it, but
// REPORT whether it was there: the distinction between "new bullet" and
// "wrapped continuation of the previous line" is what lets paragraphs be
// reassembled correctly.
const BULLET_RE = /^[\uF0B7\u2022?]\s*/;
function cleanLine(s) {
  const bullet = BULLET_RE.test(s);
  return { text: s.replace(BULLET_RE, "").replace(/\s+$/, "").trim(), bullet };
}
function isNoise(s) {
  if (!s) return true;
  const t = s.trim();
  return /^Page \d+ of \d+$/.test(t) || /^Layer \d+/.test(t) ||
         /^Enterprise Infrastructure Knowledge Map/.test(t) ||
         /^SESSION \d+/.test(t) || /^=====+/.test(t) || /^\d+$/.test(t);
}

const pageIndex = new Map(pages.map((p) => [p.page, p.text]));
function sessionText(s) {
  const out = [];
  for (let p = s.tocPage; p <= s.endPage; p++) {
    const t = pageIndex.get(p);
    if (t) out.push(t);
  }
  return out.join("\n");
}

/* ------------------------------------------------- per-session section parse */

function parseSections(text) {
  const lines = text.split(/\r?\n/);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const { text: clean, bullet } = cleanLine(lines[i]);
    const m = clean.match(HEAD_RE);
    if (!m || bullet) continue;
    const title = m[2].trim();
    const kind = SECTION_KIND[title.toLowerCase()];
    if (!kind) continue;               // only recognised section titles
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const c = cleanLine(lines[j]);
      if (!c.text || isNoise(c.text)) continue;
      const h = c.text.match(HEAD_RE);
      // A numbered heading we do not recognise still ends the section.
      if (h && SECTION_KIND[h[2].trim().toLowerCase()]) break;
      body.push(c);
    }
    found.push({ kind, label: KIND_LABEL[kind], title, body });
    i += body.length;
  }
  return found;
}

/**
 * Reassemble the PDF's hard-wrapped lines back into whole items.
 *
 * The layout engine breaks a paragraph across lines, so treating every line as
 * its own bullet produced fragments like "RAM is the pantry" / "(slower, has to
 * walk there)". A line starting with a bullet begins a new item; anything else
 * continues the previous one, unless the previous line already ended a
 * sentence.
 */
function blocks(body) {
  const out = [];
  let cur = null;
  for (const { text, bullet } of body) {
    if (bullet || !cur) {
      if (cur) out.push(cur);
      cur = text;
      continue;
    }
    // A bullet always starts a new item. Otherwise the line continues the
    // current one UNLESS the previous line finished a sentence — a full stop
    // is a reliable boundary no matter how long the item already is.
    //
    // The closing quote/bracket after the punctuation matters: session 103 ends
    // sentences with `."`, which a bare [.!?:;]$ test misses, merging the whole
    // section into one oversized block that the size filter then discarded.
    //
    // There must be no length guard here. One existed ("only split if the
    // block is under 120 chars") and it silently broke 24 sessions: once a
    // block grew past that, sentence-ending periods stopped splitting it, so
    // a whole Memory Anchors section collapsed into one block — 8 lines in,
    // 0 anchors out.
    if (/[.!?:;][")'\u201D\u2019\]]?$/.test(cur)) { out.push(cur); cur = text; continue; }
    cur = `${cur} ${text}`;
  }
  if (cur) out.push(cur);
  return out.map((s) => s.replace(/\s+/g, " ").trim())
           .filter((s) => s.length > 2);
}

/* --------------------------------------------- resolve topic names to ids */

// "Dependencies" prose names other topics in plain language. Build an index of
// session titles so those names can be turned into session numbers.
const titleIndex = [];
for (const s of toc) {
  titleIndex.push({ n: s.n, title: s.title, norm: norm(s.title) });
}
function norm(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|and|of|for|in|to|with|basics?|fundamentals?|introduction|overview|part)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
// Titles that are too generic to be matched by CONTAINMENT. "Services",
// "Security", "Backup" and "Monitoring" collide with ordinary prose words all
// over the document, so a containment match on them is almost always wrong.
// They can still be matched by an EXACT normalised match.
const GENERIC = new Set([
  "services", "security", "backup", "logging", "monitoring", "storage",
  "memory", "network", "processes", "permissions", "users", "groups",
  "troubleshooting", "automation", "career", "diagrams", "lab",
]);

function resolveTopic(phrase) {
  const key = norm(phrase);
  if (key.length < 3) return null;

  // Exact normalised match is always safe.
  for (const t of titleIndex) if (t.norm && key === t.norm) return t.n;

  // Containment is only trusted when both sides are specific and reasonably
  // close in length. Without these guards, "CPU" matched "Processes" and
  // "Services" matched half the document.
  let best = null;
  for (const t of titleIndex) {
    if (!t.norm || t.norm.length < 6 || GENERIC.has(t.norm)) continue;
    const contains = key.includes(t.norm) || t.norm.includes(key);
    if (!contains) continue;
    const shorter = Math.min(key.length, t.norm.length);
    const longer = Math.max(key.length, t.norm.length);
    if (shorter / longer < 0.6) continue;   // too loose to be the same topic
    const score = shorter;
    if (!best || score > best.score) best = { n: t.n, score };
  }
  return best ? best.n : null;
}

// Pull leading "Topic (Layer x) - short note" phrases out of dependency bullets.
// Edges are read from the RAW lines, not from `blocks()`. Each dependency
// bullet is one topic, so merging wrapped lines would swallow every topic but
// the first into a single block. Anchors and questions are the opposite case —
// they ARE wrapped prose — and use `blocks()`.
function parseEdges(body) {
  const out = [];
  for (const item of body) {
    const line = (item && typeof item === "object" ? item.text : String(item)) || "";
    const m = line.match(/^\s*([^:(\n]{3,46}?)\s*(?:\(Layer[^)]*\))?\s*[:(-]/);
    if (!m) continue;
    const n = resolveTopic(m[1]);
    if (n) out.push(n);
  }
  return [...new Set(out)];
}

/* -------------------------------------------------- compact study material */

function interviewQuestions(body) {
  return blocks(body)
    .filter((l) => l.length > 8 && l.length < 320 && /\?/.test(l))
    .map((l) => l
      // Strip "Q3." / "3." / "Q3:" prefixes, which were left on some.
      .replace(/^\s*Q(?:uestion)?\.?\s*\d*\s*[:.\)]?\s*/i, "")
      .replace(/^\s*\d{1,2}\s*[.)]\s*/, "")
      .replace(/^[""]|[""]$/g, "")
      .trim())
    .filter((l) => l.length > 8 && /\?/.test(l))
    .slice(0, 12);
}

/* --------------------------------------------------------------- build */

const sessions = toc.map((s) => {
  const text = sessionText(s);
  const secs = parseSections(text);

  const kinds = [...new Set(secs.map((x) => x.kind))];
  const find = (k) => secs.find((x) => x.kind === k);

  const deps = [...new Set([...parseEdges((find("dependencies") || {}).body || []),
                            ...parseEdges((find("connections") || {}).body || [])])]
    .filter((n) => n !== s.n);

  const dependents = parseEdges((find("dependents") || {}).body || []).filter((n) => n !== s.n);
  const interview = interviewQuestions((find("interview") || {}).body || []);
  const anchors = blocks((find("anchors") || {}).body || [])
    .filter((s) => s.length < 600).slice(0, 5);

  const ordered = [...kinds].sort(
    (a, b) => (KIND_ORDER.indexOf(a) + 99 * (KIND_ORDER.indexOf(a) < 0)) -
             (KIND_ORDER.indexOf(b) + 99 * (KIND_ORDER.indexOf(b) < 0))
  );

  return {
    n: s.n,
    id: `km-${String(s.n).padStart(3, "0")}`,
    title: s.title,
    layer: s.layer,
    layerName: s.layerName,
    page: s.tocPage,
    endPage: s.endPage,
    sections: ordered.map((k) => ({ kind: k, label: KIND_LABEL[k] || k })),
    sectionKinds: ordered,
    dependsOn: deps.sort((a, b) => a - b),
    dependents: dependents.sort((a, b) => a - b),
    interview,
    anchors,
    hasLab: ordered.includes("lab"),
  };
});

/* --------------------------------------------------------------- output */

const doc = {
  note:
    "Outline of the user's own master curriculum, Enterprise_Infrastructure_Knowledge_Map_Unified.pdf " +
    "(146 sessions across 10 layers, 1402 pages, prepared July 2026). Structure, section outline and " +
    "the dependency graph are extracted mechanically. Session summaries are hand-written and reviewed. " +
    "The section PROSE lives in docs/data/km/, one file per session, fetched on demand and cached for " +
    "offline - it is ~2.9 MB and would otherwise dominate every page load. The source PDF itself stays " +
    "in the user's private library and is never committed.",
  source: "Enterprise_Infrastructure_Knowledge_Map_Unified.pdf",
  extracted: new Date().toISOString().slice(0, 10),
  totalPages: pages.length,
  totalSessions: sessions.length,
  kindLabels: KIND_LABEL,
  layers: [...layers.values()].sort((a, b) => a.n - b.n),
  sessions,
};

if (process.argv.includes("--dry-run")) {
  console.log(`${sessions.length} sessions, ${pages.length} pages`);
  const withDeps = sessions.filter((s) => s.dependsOn.length).length;
  const withDep = sessions.filter((s) => s.dependents.length).length;
  const withInt = sessions.filter((s) => s.interview.length).length;
  const withAnc = sessions.filter((s) => s.anchors.length).length;
  const withLab = sessions.filter((s) => s.hasLab).length;
  const withSecs = sessions.filter((s) => s.sections.length).length;
  console.log(`  section outline : ${withSecs}/${sessions.length}`);
  console.log(`  dependsOn       : ${withDeps}/${sessions.length}`);
  console.log(`  dependents      : ${withDep}/${sessions.length}`);
  console.log(`  interview Qs    : ${withInt}/${sessions.length}`);
  console.log(`  memory anchors  : ${withAnc}/${sessions.length}`);
  console.log(`  lab             : ${withLab}/${sessions.length}`);
  console.log("\nSession 29 sample:");
  console.log(JSON.stringify(sessions.find((s) => s.n === 29), null, 1).slice(0, 1100));
  process.exit(0);
}

writeFileSync(OUT, JSON.stringify(doc, null, 2), "utf8");
console.log(`Wrote ${OUT}`);
console.log(`  ${doc.totalSessions} sessions, ${doc.layers.length} layers, ${doc.totalPages} pages`);
for (const l of doc.layers) {
  console.log(`  Layer ${String(l.n).padStart(2)}  ${String(l.sessions.length).padStart(3)} sessions  ${l.first}-${l.last}  ${l.name}`);
}