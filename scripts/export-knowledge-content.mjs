#!/usr/bin/env node
/**
 * export-knowledge-content.mjs
 *
 * Writes the session PROSE to docs/data/km/, one file per session.
 *
 * WHY THIS EXISTS
 * The Knowledge Map chips list every section a session contains, but nothing
 * was ever shipped behind them — only headings had been extracted, so clicking
 * a chip did nothing. That was a deliberate earlier decision (the prose stayed
 * in the user's library); the user has since asked for the chips to work, which
 * means publishing the text. This script produces it.
 *
 * WHY ONE FILE PER SESSION
 * The whole corpus is ~2.8 MB. Shipping it in one file makes every visitor
 * download 2.8 MB before they can read anything, on a phone, offline-first.
 * Instead there are 146 files averaging ~19 KB. A session's file is fetched the
 * first time that session's chips are opened, and the service worker keeps it
 * for offline use afterwards. Opening a second chip on the same session costs
 * nothing.
 *
 *   node scripts/export-knowledge-content.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "private", "extract", "Enterprise_Infrastructure_Knowledge_Map_Unified.txt");
const KM = join(ROOT, "docs", "data", "knowledge-map.json");
const OUT = join(ROOT, "docs", "data", "km");

if (!existsSync(SRC)) { console.error(`Source not found: ${SRC}`); process.exit(1); }

const raw = readFileSync(SRC, "utf8");
const lines = raw.split(/\r?\n/);
const outline = JSON.parse(readFileSync(KM, "utf8"));

/* ------------------------------------------------------ section detection */

const BULLET_RE = /^[\uF0B7\u2022?]\s*/;
function cleanLine(s) {
  const bullet = BULLET_RE.test(s);
  return { text: s.replace(BULLET_RE, "").replace(/\s+$/, "").trim(), bullet };
}
function isNoise(t) {
  if (!t) return true;
  return /^Page \d+ of \d+$/.test(t) || /^Layer \d+/.test(t) ||
    /^Enterprise Infrastructure Knowledge Map/.test(t) ||
    /^SESSION \d+/.test(t) || /^=====+/.test(t) || /^\d+$/.test(t);
}

// Section titles vary between sessions; canonicalise so the chips in the app
// match what is written here.
const SECTION_KIND = {
  "business problem": "problem", "concept": "concept",
  "deep tech": "deep", "deep technical explanation": "deep", "deep dive": "deep",
  "internal workflow": "workflow", "how it works": "workflow", "architecture": "architecture",
  "diagrams": "diagram", "ascii diagrams": "diagram", "visual diagram": "diagram",
  "lab": "lab", "lab exercise": "lab", "practical lab": "lab",
  "troubleshooting": "troubleshooting", "real enterprise example": "example",
  "enterprise placement": "enterprise", "dependencies": "dependencies",
  "dependents": "dependents", "connections": "connections", "connections to prior sessions": "connections",
  "security": "security", "security considerations": "security", "security perspective": "security",
  "misconceptions": "misconceptions", "common misconceptions": "misconceptions",
  "cloud perspective": "cloud", "automation perspective": "automation",
  "career perspective": "career", "memory anchors": "anchors",
  "interview questions": "interview", "personal notes": "notes",
  "personal notes section": "notes",
};

/**
 * Reassemble the PDF's hard-wrapped lines into whole items.
 *
 * Two rules, both learned the hard way:
 *  - a bullet starts a new item;
 *  - otherwise the line continues the current one UNLESS the previous line
 *    finished a sentence. A full stop is a boundary regardless of how long
 *    the item already is — an earlier length guard silently emptied the
 *    Memory Anchors of 24 sessions.
 *  - the sentence test must tolerate a trailing quote or bracket, because
 *    session 103 ends sentences with `."`.
 */
function blocks(body) {
  const out = [];
  let cur = null;
  for (const { text, bullet } of body) {
    if (bullet || !cur) { if (cur) out.push(cur); cur = text; continue; }
    if (/[.!?:;][")'\u201D\u2019\]]?$/.test(cur)) { out.push(cur); cur = text; continue; }
    cur = `${cur} ${text}`;
  }
  if (cur) out.push(cur);
  return out.map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 2);
}

/* --------------------------------------------------------- page indexing */

const pageAt = new Map();
{
  const re = /^===== PAGE (\d+) =====$/;
  lines.forEach((l, i) => {
    const m = l.match(re);
    if (m) pageAt.set(Number(m[1]), i + 1);
  });
  // page END offsets, for slicing a session
  const pageLine = [...pageAt.entries()].sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < pageLine.length; i++) {
    pageAt.set(`end:${pageLine[i][0]}`, i + 1 < pageLine.length ? pageLine[i + 1][1] : lines.length);
  }
}

/* ------------------------------------------------- searchable term index */

// The prose lives in 146 lazy-loaded files, so the in-app search index cannot
// see it: searching "mutex" or "restorecon" found nothing even though both
// appear on screen. Rather than loading 2.9 MB at boot, a distinctive-term
// list per session is written back into knowledge-map.json, which is already
// loaded. search.js walks it like any other field.
//
// The list is pruned by DOCUMENT FREQUENCY. A first attempt kept every word of
// five or more characters: 779 terms a session, and the outline went from
// 540 KB to 2.8 MB — mostly words like "server", "network" and "system" that
// appear in half the document and tell you nothing when searched. A term is
// kept only if it is rare enough to be a real signal, the same idea as IDF.
const STOP = new Set(("the and for with that this from are was were you your not but all any can " +
  "its they them then than there here when what which while will would should could have has had " +
  "been being into over under more most some such only also very just like about after before " +
  "because each other both same too own does did doing done how why where whose whom").split(" "));

// Appearing in more than this many sessions = common vocabulary, not a signal.
const DF_MAX = 5;

function sessionTerms(sections) {
  const set = new Set();
  const walk = (node, depth = 0) => {
    if (depth > 6 || node == null) return;
    if (typeof node === "string") {
      for (const w of node.toLowerCase().split(/[^a-z0-9.+#-]+/)) {
        // The splitter keeps . + # - so IPs and time_wait survive, but that also
        // leaves sentence punctuation on the end of ordinary words ("alike.").
        const clean = w.replace(/[.,;:!?]+$/, "");
        if (clean.length >= 5 && !STOP.has(clean) && /\w/.test(clean)) set.add(clean);
      }
      return;
    }
    if (Array.isArray(node)) { for (const v of node) walk(v, depth + 1); return; }
    if (typeof node === "object") for (const v of Object.values(node)) walk(v, depth + 1);
  };
  walk(sections);
  return [...set].sort();
}

const DRY = process.argv.includes("--dry-run");
const written = [];
const problems = [];

for (const s of outline.sessions) {
  const from = pageAt.get(s.page);
  const to = pageAt.get(`end:${s.endPage}`);
  if (from === undefined || to === undefined) {
    problems.push(`S${s.n} ${s.title}: pages ${s.page}-${s.endPage} not found in extract`);
    continue;
  }
  const seg = lines.slice(from, to);

  const sections = {};
  let cur = null;
  for (let i = 0; i < seg.length; i++) {
    const c = cleanLine(seg[i]);
    if (!c.bullet) {
      const m = c.text.match(/^(\d{1,2})\.\s+(.+?)\s*$/);
      if (m) {
        const kind = SECTION_KIND[m[2].trim().toLowerCase()];
        if (kind) { cur = kind; sections[cur] = []; continue; }
      }
    }
    if (!cur || isNoise(c.text)) continue;
    sections[cur].push(c);
  }

  // Keep only the section kinds the outline claims exist, in reading order.
  const ordered = [];
  const seen = new Set();
  for (const kind of (outline.kindOrder || [])) {
    if (sections[kind] && !seen.has(kind)) { seen.add(kind); ordered.push(kind); }
  }
  // Anything found but not in the outline order still gets included.
  for (const kind of Object.keys(sections)) {
    if (!seen.has(kind) && sections[kind].length) { seen.add(kind); ordered.push(kind); }
  }

  const body = {};
  for (const kind of ordered) {
    const items = blocks(sections[kind]);
    if (items.length) body[kind] = items;
  }

  const record = {
    id: s.id,
    n: s.n,
    title: s.title,
    page: s.page,
    endPage: s.endPage,
    sections: body,
  };

  if (!Object.keys(body).length) {
    problems.push(`S${s.n} ${s.title}: section heading found but no body text`);
    continue;
  }

  const json = JSON.stringify(record);
  written.push({
    n: s.n, id: s.id, title: s.title, bytes: json.length,
    kinds: Object.keys(body).length,
    terms: sessionTerms(body),
  });
  if (!DRY) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, `${s.id}.json`), json, "utf8");
  }
}

if (DRY) {
  const total = written.reduce((a, w) => a + w.bytes, 0);
  const avg = Math.round(total / written.length);
  console.log(`Would write ${written.length} files, ${(total / 1024 / 1024).toFixed(2)} MB total, ${(avg / 1024).toFixed(1)} KB average`);
  console.log(`largest: ${written.sort((a, b) => b.bytes - a.bytes).slice(0, 3).map((w) => `S${w.n} ${(w.bytes / 1024).toFixed(0)}KB`).join(", ")}`);
  process.exit(0);
}

if (problems.length) {
  console.error("Problems:\n" + problems.slice(0, 20).map((p) => "  x " + p).join("\n"));
  if (problems.length > 20) console.error(`  ... and ${problems.length - 20} more`);
  process.exit(1);
}

// Fold the term lists back into the outline so search can reach them — but
// only after pruning terms that appear in too many sessions to distinguish
// anything.
{
  const raw = written.map((w) => [w.id, w.terms]);
  const df = new Map();
  for (const [, set] of raw) for (const t of set) df.set(t, (df.get(t) || 0) + 1);

  const byId = new Map();
  let keptTotal = 0;
  let droppedTotal = 0;
  for (const [id, set] of raw) {
    const kept = [...set].filter((t) => (df.get(t) || 0) <= DF_MAX).sort();
    byId.set(id, kept);
    keptTotal += kept.length;
    droppedTotal += set.length - kept.length;
  }

  for (const s of outline.sessions) s.terms = byId.get(s.id) || [];
  writeFileSync(KM, JSON.stringify(outline, null, 2), "utf8");

  console.log(`  term index: ${keptTotal} distinctive terms kept, ${droppedTotal} dropped as too common ` +
    `(appear in >${DF_MAX} of ${outline.sessions.length} sessions)`);
  console.log(`  outline now ${(readFileSync(KM).length / 1024).toFixed(0)} KB`);
}

const total = written.reduce((a, w) => a + w.bytes, 0);
console.log(`Wrote ${written.length} session files to docs/data/km/`);
console.log(`  total   ${(total / 1024 / 1024).toFixed(2)} MB`);
console.log(`  average ${(total / written.length / 1024).toFixed(1)} KB per session`);
const biggest = [...written].sort((a, b) => b.bytes - a.bytes).slice(0, 3);
console.log(`  largest ${biggest.map((w) => `S${w.n} ${(w.bytes / 1024).toFixed(0)}KB`).join(", ")}`);