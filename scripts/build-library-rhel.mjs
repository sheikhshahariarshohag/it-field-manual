/**
 * build-library-rhel.mjs
 *
 * Publishes the RHCSA study guide in full into the app, as searchable chunks.
 *
 * WHY THIS ONE AND NOT THE CCNA BOOK
 * The two files in Downloads are not the same kind of thing.
 *
 *   CCNA  - "CCNA Certification Study Guide: Exam 200-301" by Todd Lammle.
 *           Metadata: named author, Acrobat Distiller, AcroForm, 2020. A
 *           commercially published book. Only its chapter list is published,
 *           as a locator.
 *
 *   RHCSA - Author field reads "RHCSA Study Repository", produced by
 *           WeasyPrint 62.3 (a free HTML-to-PDF tool), with no creation date
 *           at all. Its contents are "Synthesis Modules", "Anki Flashcards",
 *           "Repository Structure", "Study Workflow". This is self-generated
 *           study material, not a published work.
 *
 * Checked before publishing, and the checks are recorded here rather than
 * assumed:
 *   - the only licence mentioned anywhere is GPL, and that is *content*
 *     (the guide covers Linux licensing), not a copyright claim
 *   - no citation to Red Hat documentation
 *   - no source repository link; the only URLs are example.com placeholders
 *     inside dnf configuration examples
 *
 * LIMITATION: a true verbatim check needs Red Hat's actual documentation to
 * compare against, which is not available offline. These checks are evidence,
 * not proof. The owner has seen this and asked for it to be published.
 *
 * OUTPUT
 *   docs/data/library.json              updated with full:true and chunk refs
 *   docs/data/library/rhcsa-NN.json     one file per module, full text
 *
 * The full text lives in a real file the app fetches on demand, rather than
 * inside library.json, so opening the Library tab does not pull half a
 * megabyte nobody asked for. This is the same lazy pattern the Knowledge Map
 * already uses.
 *
 *   node scripts/build-library-rhel.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "private", "library", "rhcsa.txt");
const OUT_DIR = join(ROOT, "docs", "data", "library");
const INDEX = join(ROOT, "docs", "data", "library.json");
const DRY = process.argv.includes("--dry-run");

if (!existsSync(SRC)) {
  console.error("  missing private/library/rhcsa.txt — run pdftotext first");
  process.exit(1);
}

const pages = readFileSync(SRC, "utf8").split(/\f/);

/**
 * Split into modules on the "Module NN: Title" heading, keeping the body.
 *
 * The heading is matched anywhere in the line, not anchored: the contents
 * page renders them as "2.13 Module 11: Boot Process & GRUB Configuration".
 * Anchoring at ^Module matched nothing and collapsed every objective into one
 * module, which is what the first attempt did.
 */
const modules = [];
let cur = null;
pages.forEach((page, pi) => {
  for (const raw of page.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/\bModule\s+(\d{1,2})\s*[:\-]\s*(.+)$/i);
    if (m) {
      const full = m[2].trim();
      const dash = full.indexOf(" - ");
      cur = {
        n: Number(m[1]),
        title: (dash > 0 ? full.slice(0, dash) : full).trim(),
        page: pi + 1,
        lines: [],
        objectives: [],
      };
      modules.push(cur);
      continue;
    }
    if (cur) {
      cur.lines.push(line);
      const o = line.match(/^Objective[:\-]\s*(.+)$/i);
      if (o && o[1].trim().length < 130) {
        cur.objectives.push({ title: o[1].trim(), page: pi + 1 });
      }
    }
  }
});

// The contents page and the body both list modules; keep the occurrence that
// actually carries content.
const byN = new Map();
for (const m of modules) {
  const body = m.lines.join(" ").trim();
  if (body.length < 400) continue;
  const prev = byN.get(m.n);
  if (!prev || body.length > prev.lines.join(" ").length) byN.set(m.n, m);
}
const kept = [...byN.values()].sort((a, b) => a.n - b.n);

/* ------------------------------------------------------------- normalise */

/** Strip layout artefacts so the text reads as prose, not as PDF columns. */
function clean(lines) {
  const out = [];
  let blank = 0;
  for (const l of lines) {
    const t = l.replace(/\s+$/, "");
    if (!t.trim()) { blank++; if (blank > 1) continue; out.push(""); continue; }
    blank = 0;
    // Drop running headers: a line that is just the guide title, or a
    // page-number-only line.
    if (/^RHCSA Certification Study( Guide)?$/i.test(t.trim())) continue;
    if (/^\d{1,4}$/.test(t.trim())) continue;
    // Markdown emphasis is fine to keep; it renders.
    out.push(t);
  }
  // Collapse runs of blanks.
  const res = [];
  for (const l of out) {
    if (!l && res.length && !res[res.length - 1]) continue;
    res.push(l);
  }
  while (res.length && !res[0]) res.shift();
  while (res.length && !res[res.length - 1]) res.pop();
  return res.join("\n");
}

/** Words that carry no search value. */
const STOP = new Set(`
the and for that with this from have has was were are you your our their they them then than
not but its it's can will would should could may might must when where which who whom what how
why all any some each every other another such same both few more most very much many
using used use uses also into over under about after before between during through above below
because while both been being does did doing done make makes made take takes taken get gets
one two three four five six seven eight nine ten first second third next last new old
note example output command file line page chapter section part module objective learn learning
study studying read reading book guide manual review summary
`.trim().split(/\s+/));

/**
 * Distinctive terms from a chunk, so its prose is reachable by search.
 *
 * The chunk file is fetched on demand and is never part of the corpus, so
 * without this a word appearing only in the body - "restorecon", "setsebool",
 * "logrotate" - would be visible on the page and unfindable, which is the same
 * defect fixed elsewhere in this file.
 *
 * Document-frequency pruned, like the Knowledge Map index: a word appearing in
 * most modules locates nothing, so it is dropped.
 */
function distinctiveTerms(text, allTexts) {
  const df = new Map();
  const here = new Map();
  const toks = text.toLowerCase().match(/[a-z][a-z0-9._-]{2,}/g) || [];
  for (const t of toks) {
    if (STOP.has(t)) continue;
    here.set(t, (here.get(t) || 0) + 1);
  }
  for (const t of here.keys()) df.set(t, 0);
  for (const other of allTexts) {
    const seen = new Set((other.toLowerCase().match(/[a-z][a-z0-9._-]{2,}/g) || []));
    for (const t of here.keys()) if (seen.has(t)) df.set(t, df.get(t) + 1);
  }
  // Drop a word that appears in every module: it finds nothing useful.
  const limit = Math.max(2, Math.floor(allTexts.length * 0.6));
  return [...here.entries()]
    .filter(([t, n]) => n >= 1 && df.get(t) <= limit)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 260)
    .map(([t]) => t);
}

/* ----------------------------------------------------------------- write */

if (!DRY) mkdirSync(OUT_DIR, { recursive: true });

const cleaned = kept.map((m) => clean(m.lines));
const allTexts = cleaned;

const chapters = [];
let totalWords = 0;

for (let i = 0; i < kept.length; i++) {
  const m = kept[i];
  const text = cleaned[i];
  const words = text.split(/\s+/).filter(Boolean).length;
  totalWords += words;
  const chunk = `rhcsa-${String(m.n).padStart(2, "0")}`;
  const body = distinctiveTerms(text, allTexts);
  chapters.push({
    n: m.n,
    title: m.title,
    page: m.page,
    words,
    sections: m.objectives,
    chunk,
    body,
  });

  if (!DRY) {
    writeFileSync(join(OUT_DIR, `${chunk}.json`), JSON.stringify({
      id: chunk,
      book: "rhcsa",
      title: m.title,
      n: m.n,
      page: m.page,
      sections: m.objectives,
      text,
    }, null, 2), "utf8");
  }
}

// Rewrite the index entry for this book, leaving CCNA as a locator.
const index = JSON.parse(readFileSync(INDEX, "utf8"));
const entry = index.books.find((b) => b.id === "rhcsa");
if (entry) {
  entry.full = true;
  entry.pages = pages.length;
  entry.chapters = chapters;
  entry.note = "Full text published. Self-generated study material — see scripts/build-library-rhel.mjs for the checks made before publishing.";
}
index.built = new Date().toISOString().slice(0, 10);

if (!DRY) writeFileSync(INDEX, JSON.stringify(index, null, 2), "utf8");

console.log(`  modules published : ${chapters.length}`);
for (const c of chapters) {
  console.log(`      m${String(c.n).padStart(2)}  ${String(c.words).padStart(6)} words  ${c.title}`);
}
console.log(`  total words       : ${totalWords.toLocaleString()}`);
console.log(`  chunks            : docs/data/library/rhcsa-NN.json`);
console.log(DRY ? "  (dry run)" : "  written");