/**
 * build-docs.mjs — import a folder of .docx files as they are.
 *
 *   node scripts/build-docs.mjs --src <folder> --set cisco
 *   node scripts/build-docs.mjs --src <folder> --set rhel
 *
 * Writes:
 *   docs/data/docs/<id>.json   one file per document, formatting intact
 *   docs/data/documents.json   the index the app reads
 *
 * WHY THIS EXISTS, AND WHY IT IS NOT build-ccna-study.mjs
 *
 * The earlier CCNA converter read each .docx and rebuilt it as teaching
 * material: sections, labs pulled out, review questions separated, gaps logged,
 * metadata tables converted to records. That was a request for restructuring,
 * and it lost the documents' appearance.
 *
 * Measured across the 40 documents in scope, what a plain-text read throws
 * away is: 16 distinct run colours, 18 paragraph fills, 54 shaded paragraphs
 * per chapter forming 35 separate boxes, and 1,470 tables.
 *
 * This converter does not interpret. It transcribes. A "Main idea:" label is
 * bold and #1F4E79 in the document, so it is bold and #1F4E79 here. Nothing is
 * promoted to a lab, nothing is pulled into a quiz, nothing is renamed. What
 * the reader sees is what Word would show.
 *
 * FORMATTING IS CARRIED AS DATA, NOT AS CSS
 * Colour lives in the JSON, as the document's own hex. That is what "as it is"
 * means, and it is why scripts/check-doc-contrast.mjs exists: the palette is
 * not a fixed set of theme tokens, it varies per document, and five of the
 * eighteen fills are dark with white text. Contrast can only be checked per
 * (text colour, fill) pair, so the gate walks the data and checks the pairs it
 * actually finds rather than a hand-written list.
 *
 * PROVENANCE
 * Each entry records the source filename and its SHA-256, plus the block
 * counts. The .docx files are private material and are not in the repository,
 * so documents.json is what lets CI verify the output without them.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parseDocxRich } from "./docx.mjs";
import { xmlOf } from "./docx-xml.mjs";

const args = process.argv.slice(2);
const argOf = (n, d) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const SRC = argOf("--src", null);
const SET = argOf("--set", "cisco");
const OUT = "docs/data";

if (!SRC || !existsSync(SRC)) {
  console.error("  usage: node scripts/build-docs.mjs --src <folder of .docx> --set cisco|rhel");
  if (SRC) console.error(`  folder not found: ${SRC}`);
  process.exit(1);
}

/**
 * Per-set naming.
 *
 * The two sets have different filename conventions, so the id and the title are
 * derived per set rather than by one heuristic that fits neither.
 */
const SETS = {
  cisco: {
    label: "CCNA 200-301",
    subject: "cisco",
    match: /^CC(\d+)_.*\.docx$/i,
    id: (m) => `ccna-${String(Number(m[1])).padStart(2, "0")}`,
    title: (m) => m[0].replace(/^CC\d+_/i, "").replace(/\.docx$/i, "").replace(/_/g, " "),
    prefix: (m) => `Chapter ${Number(m[1])}`,
  },
  rhel: {
    label: "Red Hat Enterprise Linux Administration I",
    subject: "rhel",
    match: /^RHEL_SysAdmin_I_Ch(\d+)_Study\.docx$/i,
    id: (m) => `rhel-${String(Number(m[1])).padStart(2, "0")}`,
    title: () => null,                       // take it from the document
    prefix: (m) => `Chapter ${Number(m[1])}`,
  },
};

const set = SETS[SET];
if (!set) {
  console.error(`  unknown set "${SET}". known: ${Object.keys(SETS).join(", ")}`);
  process.exit(1);
}

const wc = (s) => (String(s).match(/\S+/g) || []).length;

/** Every distinct (text colour, background) pair the document actually uses. */
function colourPairs(blocks) {
  const pairs = new Set();
  const scan = (runs, bg) => {
    for (const r of runs || []) {
      if (r.c) pairs.add(`${r.c}|${bg || "page"}`);
    }
  };
  for (const b of blocks) {
    if (b.k === "box") { for (const p of b.paras) scan(p.runs, b.fill); continue; }
    if (b.k === "tbl") {
      for (const row of b.rows) for (const c of row) scan(c.runs, c.fill || "page");
      continue;
    }
    scan(b.runs, b.fill || "page");
  }
  return [...pairs].sort();
}

/**
 * The chapter's own title, taken from the document.
 *
 * Neither available shortcut works on its own. `dc:title` is boilerplate -
 * across the 17 RHEL chapters it is only ever the course name plus a chapter
 * number, with the topic in four of them ("RHEL System Administration I -
 * Chapter 3 Study"). The first level-1 heading is worse: it is "Chapter goal"
 * in 12 of 17, and for CCNA it is "Step 0: Pre-check (do this before you read)".
 *
 * What the documents agree on is a title in the paragraphs BEFORE the first
 * heading, or in a heading that is literally "Chapter N: <topic>". Measured:
 *
 *   rhel-13  "Chapter 13" / "Archiving and Transferring Files" / course / "Study file"
 *   ccna-06  "CCNA 200-301 STUDY MANUAL" / "Chapter 6" / "Open Shortest Path First (OSPF)" / "This document replaces ..."
 *   rhel-03  (no paragraphs at all - the title is its H1, "Chapter 3: Managing Files From the Command Line")
 *
 * So: the first leading paragraph that is neither course boilerplate nor the
 * long provenance note; failing that, the first heading shaped like
 * "Chapter N: something"; then dc:title; then the filename.
 *
 * The length cap is what stops "This document replaces Chapter 6 of Todd
 * Lammle, CCNA Certification Study Guide, Volume 2, Exam 200-301 (2020), book
 * pages 163 to 192..." becoming the chapter's name.
 */
const BOILERPLATE = [
  /\|/,                                        // the running header line
  /^CCNA\s*200-301\s*STUDY MANUAL$/i,
  /^Chapter\s+\d+$/i,                          // a bare number; the title is the next line
  /^RHEL\s+System Administration/i,
  /^Red Hat Enterprise Linux System Administration$/i,
  /^Study file$/i,
  /^(This document|This manual|A personalised|Personalised)\b/i,
];

function titleFrom(blocks) {
  const text = (b) => (b.runs || []).map((r) => r.t).join("").replace(/\s+/g, " ").trim();
  const clean = (s) => s.replace(/^Chapter\s+\d+\s*[:\-–—]\s*/i, "").replace(/\s+/g, " ").trim();

  const firstHeading = blocks.findIndex((b) => b.k === "h");
  const lead = blocks
    .slice(0, firstHeading === -1 ? Math.min(8, blocks.length) : firstHeading)
    .filter((b) => b.k === "p")
    .map(text)
    .filter(Boolean);

  for (const t of lead) {
    if (t.length <= 90 && !BOILERPLATE.some((re) => re.test(t))) return clean(t);
  }
  // No lead paragraph, or all of them were boilerplate. "Chapter 3: Managing
  // Files..." is a title; "Chapter goal" is not, which is why the colon and the
  // number are required rather than just the word Chapter.
  for (const b of blocks) {
    if (b.k !== "h") continue;
    const t = text(b);
    if (/^Chapter\s+\d+\s*[:\-–—]/.test(t) && t.length <= 90) return clean(t);
  }
  return "";
}

function stats(blocks) {
  const s = { blocks: 0, h: 0, p: 0, li: 0, box: 0, tbl: 0, tableCells: 0, runs: 0, words: 0, boxes: 0, shadedParas: 0 };
  const text = [];
  const walk = (runs) => {
    for (const r of runs || []) { s.runs++; text.push(r.t); }
  };
  for (const b of blocks) {
    s.blocks++;
    if (b.k === "box") {
      s.box++; s.boxes++;
      for (const p of b.paras) { s.shadedParas++; walk(p.runs); }
    } else if (b.k === "tbl") {
      s.tbl++;
      for (const row of b.rows) for (const c of row) { s.tableCells++; walk(c.runs); }
    } else {
      if (b.k === "h") s.h++; else if (b.k === "li") s.li++; else s.p++;
      walk(b.runs);
    }
  }
  s.words = wc(text.join(" "));
  return s;
}

/* ------------------------------------------------------------------ main */

const files = readdirSync(SRC)
  .filter((f) => set.match.test(f))
  .sort((a, b) => {
    const na = Number(set.match.exec(a)[1]);
    const nb = Number(set.match.exec(b)[1]);
    return na - nb;
  });

if (!files.length) {
  console.error(`  no files matching ${set.match} in ${SRC}`);
  process.exit(1);
}

mkdirSync(join(OUT, "docs"), { recursive: true });

const entries = [];
for (const f of files) {
  const m = set.match.exec(f);
  const id = set.id(m);
  const full = join(SRC, f);
  const xml = xmlOf(full);
  const blocks = parseDocxRich(xml);
  if (!blocks.length) {
    console.error(`  FAIL   ${f}: parsed to nothing - refusing to write an empty document`);
    process.exit(1);
  }

  const core = (() => {
    try {
      const cx = xmlOf(full, "docProps/core.xml");
      const t = (cx.match(/<dc:title>([\s\S]*?)<\/dc:title>/) || [])[1];
      return t ? t.replace(/^Chapter\s+\d+\s*[-–—:]\s*/i, "").trim() : "";
    } catch (_) { return ""; }
  })();

  // The document's own title wins; the filename and dc:title are fallbacks.
  const title = titleFrom(blocks) || set.title(m) || core || f.replace(/\.docx$/i, "");
  const st = stats(blocks);
  const doc = {
    id,
    n: Number(m[1]),
    subject: set.subject,
    title,
    display: `${set.prefix(m)}: ${title}`,
    sourceFile: f,
    sourceSha256: createHash("sha256").update(readFileSync(full)).digest("hex"),
    ...st,
    colourPairs: colourPairs(blocks),
    blocks,
  };

  writeFileSync(join(OUT, "docs", `${id}.json`), JSON.stringify(doc) + "\n");

  /*
   * The headings go into the index, and that is what makes documents findable.
   *
   * The bodies are 3.5 MB across the 40 files, which is more than the rest of
   * the corpus, so search cannot index them without loading all of it up front
   * - a bad trade for an offline-first app on a phone.
   *
   * What it can index for free is each document's own headings, taken from the
   * index rather than the file. "subnetting" then finds "Chapter 3: Easy
   * Subnetting" and lands on the right chapter. Full-text search INSIDE a
   * document is not available and this is where that is recorded.
   */
  const headings = [];
  const headText = (b) => (b.runs || []).map((r) => r.t).join("").replace(/\s+/g, " ").trim();
  for (const b of blocks) {
    if (b.k !== "h") continue;
    const t = headText(b);
    if (t && t.length <= 120) headings.push({ lvl: b.lvl, text: t });
  }

  entries.push({
    id, n: doc.n, title, display: doc.display, subject: doc.subject,
    sourceFile: f, sourceSha256: doc.sourceSha256,
    blocks: st.blocks, words: st.words, tables: st.tbl, boxes: st.boxes,
    runs: st.runs, shadedParas: st.shadedParas,
    headings,
  });

  console.log(
    `  ${id}  ${String(title).slice(0, 42).padEnd(42)} ` +
    `${String(st.blocks).padStart(5)}blk ${String(st.words).padStart(6)}w ` +
    `${String(st.tbl).padStart(3)}tbl ${String(st.boxes).padStart(3)}box ` +
    `${String(st.shadedParas).padStart(4)}shd`,
  );
}

/* --- the index ---------------------------------------------------------- */

const indexPath = join(OUT, "documents.json");
const index = existsSync(indexPath)
  ? JSON.parse(readFileSync(indexPath, "utf8"))
  : { note: "", sets: {} };

index.note =
  "Documents reproduced as they are. Colour and shading are the document's own, " +
  "carried in the JSON rather than mapped onto app theme tokens, so " +
  "scripts/check-doc-contrast.mjs checks each (text colour, fill) pair the " +
  "data actually uses. The source .docx files are private material and are not " +
  "in this repository; each entry records the source name and its SHA-256.";
index.sets = index.sets || {};
index.sets[SET] = {
  label: set.label,
  subject: set.subject,
  built: new Date().toISOString().slice(0, 10),
  count: entries.length,
  docs: entries,
};
writeFileSync(indexPath, JSON.stringify(index, null, 1) + "\n");

const words = entries.reduce((a, e) => a + e.words, 0);
const tables = entries.reduce((a, e) => a + e.tables, 0);
const boxes = entries.reduce((a, e) => a + e.boxes, 0);
console.log("");
console.log(`  ${entries.length} documents, ${words.toLocaleString()} words, ${tables} tables, ${boxes} shaded boxes`);
console.log(`  wrote docs/${entries.length} files and the "${SET}" entry in documents.json`);