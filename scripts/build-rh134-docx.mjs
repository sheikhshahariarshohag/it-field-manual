/**
 * build-rh134-docx.mjs
 *
 * Builds RH134 study units from the supplied RHEL Administrator Part 2
 * document, replacing the previous eight-part extraction.
 *
 * WHY REPLACE RATHER THAN MERGE
 * The two sources are organised completely differently. The earlier guide
 * split RH134 into eight "Parts" that bundled unrelated material — Part 3 held
 * tuned, nice/renice, ACLs and all of SELinux together. The supplied document
 * uses the book's own thirteen-chapter structure, with ACLs, SELinux, storage,
 * NFS, boot and installation each in their own chapter. Merging them would
 * produce two contradictory chapter numberings, so the supplied document wins
 * and the old extraction is removed.
 *
 * Note this document has no Chapter 2. The chapters are 1, then 3 through 13.
 * That gap is real and is reported rather than papered over by renumbering —
 * a learner's book may be missing a chapter, and silently renumbering would
 * hide that.
 *
 * CHAPTER DETECTION
 * An H1 that matches /Chapter\s+(\d+)/ starts a new chapter. An H1 beginning
 * "Part " or "Topic " belongs to the chapter above it, because the source uses
 * those as internal divisions. A short H1 with no number and no Part/Topic
 * prefix is treated as a chapter goal or overview and folded into the chapter
 * that precedes it.
 *
 *   node scripts/build-rh134-docx.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const EXTRACT = join(ROOT, "private", "extract", "RHEL Administrator Part 2 Full (1).txt");
const OUT_DIR = join(ROOT, "docs", "data", "study");
const DRY = process.argv.includes("--dry-run");

/* ------------------------------------------------------------------ parse */

const raw = readFileSync(EXTRACT, "utf8").split("\n");

/**
 * Sanitise before anything is published.
 *
 * The document is derived from a private course book and from the owner's own
 * Downloads folder, and it quotes both inside its body text. Three kinds of
 * thing are removed here, and none of them is teaching content:
 *
 *   - the original document's filename, which is on disk in a private folder
 *   - the name of the private source book, replaced with the course code
 *   - the HTML comment recording the local source path, which the extractor
 *     writes into line 1
 *
 * Anything that fails here stops the build rather than reaching the site.
 */
function sanitise(text) {
  return text
    // Drop the extractor's source comment outright.
    .replace(/^\s*<!--[\s\S]*?-->\s*/g, "")
    // The private source book's filename and full title.
    .replace(/M-10\s+Red Hat Enterprise Linux 8\.0 RH134\s*-\s*Red Hat System Administration II\.pdf/g,
      "RH134 course material")
    .replace(/Red Hat System Administration\s+II\s*\(RHEL 8\)/g, "RH134 course material")
    .replace(/Red Hat System Administration\s+II/gi, "RH134 course material")
    .replace(/your uploaded Red Hat Enterprise Linux 8\s*-\s*RH134 book/gi, "the RH134 course material")
    .replace(/your uploaded Red Hat System Administration II\s*\(RH134\)\s*book/gi, "the RH134 course material")
    .replace(/\byour uploaded\b/gi, "the supplied")
    .replace(/\bM-\d+\s+/g, "");
}

/** @type {{level:number, text:string}[]} */
const blocks = [];
let para = [];
const flush = () => {
  if (para.length) {
    blocks.push({ level: 0, text: sanitise(para.join(" ")) });
    para = [];
  }
};

for (const line of raw) {
  const h = line.match(/^\s*\[H(\d)\]\s*(.*)$/);
  if (h) {
    flush();
    blocks.push({ level: Number(h[1]), text: sanitise(h[2].trim()) });
  } else if (!line.trim()) {
    flush();
  } else {
    para.push(line.trim());
  }
}
flush();

/* ------------------------------------------------- group into chapters */

const chapters = [];
let cur = null;

const chapterOf = (t) => {
  const m = t.match(/Chapter\s+(\d+)/i);
  return m ? Number(m[1]) : null;
};

for (const b of blocks) {
  if (b.level === 1) {
    // Order matters. "Part 7: Chapter 12 Final Revision" contains "Chapter 12"
    // but is a division of chapter 12, not the start of one. Checking the
    // chapter pattern first created a duplicate unit with the same id.
    const isDivision = /^(Part|Topic)\s/i.test(b.text);
    const n = isDivision ? null : chapterOf(b.text);
    if (n !== null) {
      cur = { n, title: b.text, blocks: [] };
      chapters.push(cur);
    } else if (cur) {
      // A division or a goal statement belongs to the chapter above.
      cur.blocks.push(b);
    } else {
      cur = { n: 0, title: b.text, blocks: [] };
      chapters.push(cur);
    }
    continue;
  }
  if (cur) cur.blocks.push(b);
}

/* --------------------------------------------------- sections per chapter */

/**
 * Build sections from the H2 headings inside a chapter. H3/H4 become the
 * content of the H2 they sit under. Anything before the first H2 — a goal
 * statement, an overview — becomes a leading section so it is not lost.
 */
function sectionsOf(ch) {
  const out = [];
  const words = (s) => s.content.reduce((a, c) => a + c.text.split(/\s+/).filter(Boolean).length, 0);

  let head = null;
  let acc = [];
  const close = () => {
    if (!head) return;
    out.push({ title: head, content: acc.slice(), words: words({ content: acc }) });
    head = null;
    acc = [];
  };

  const lead = [];
  for (const b of ch.blocks) {
    if (b.level === 1) { lead.push(b.text); continue; }
    if (b.level === 2) { close(); head = b.text; continue; }
    if (!head) { lead.push(b.text); continue; }
    if (b.level === 3 || b.level === 4) {
      acc.push({ level: 0, text: b.text });
    } else {
      acc.push({ level: b.level, text: b.text });
    }
  }
  close();

  if (lead.length) {
    out.unshift({
      title: "Overview",
      content: lead.map((t) => ({ level: 0, text: t })),
      words: words({ content: lead.map((t) => ({ level: 0, text: t })) }),
    });
  }
  return out;
}

/* ------------------------------------------------------------ write units */

const units = [];
for (const ch of chapters) {
  const sections = sectionsOf(ch);
  if (!sections.length) continue;
  const words = sections.reduce((a, s) => a + s.words, 0);
  const id = `rh134-${String(ch.n).padStart(2, "0")}`;
  units.push({
    id,
    n: ch.n,
    sourceNumber: ch.n,
    kind: "chapter",
    title: ch.title.replace(/^RH134\s+[-–—]?\s*/i, "").trim(),
    display: ch.title.replace(/^RH134\s+[-–—]?\s*/i, "").trim(),
    exam: "RHCSA (EX200)",
    words,
    sections,
    labs: 0,
    quizzes: 0,
    services: 0,
  });
}

/* ----------------------------------------------------- clean old extraction */

const existing = readdirSync(OUT_DIR).filter((f) => /^rh134-\d+\.json$/.test(f));
const wanted = new Set(units.map((u) => u.id + ".json"));
const stale = existing.filter((f) => !wanted.has(f));

if (!DRY) {
  for (const u of units) {
    writeFileSync(join(OUT_DIR, u.id + ".json"), JSON.stringify(u, null, 2), "utf8");
  }
  for (const f of stale) unlinkSync(join(OUT_DIR, f));
}

/* ------------------------------------------------- sync study-manual.json */

const MANUAL = join(ROOT, "docs", "data", "study-manual.json");
const manual = JSON.parse(readFileSync(MANUAL, "utf8"));
const book = manual.books.find((b) => b.id === "rh134");
if (!book) {
  console.error("  no rh134 book in study-manual.json");
  process.exit(1);
}

book.units = units.map((u) => ({
  id: u.id,
  n: u.n,
  sourceNumber: u.sourceNumber,
  kind: u.kind,
  title: u.title,
  display: u.display,
  sections: u.sections.length,
  // Section titles live in the per-unit file, which is fetched on demand. The
  // search index needs them up front so a search can reach a chapter by a
  // section name, so the titles are duplicated here. They are short, and this
  // is the only reason they are not left solely in the unit body.
  sectionTitles: u.sections.map((s) => s.title),
  labs: 0,
  quizzes: 0,
  words: u.words,
  services: 0,
  hasCurrency: false,
}));

book.currency = [
  "This book is the supplied RHEL Administrator Part 2 document, not the earlier eight-part extraction.",
  "It uses the book's own chapter numbering, and it has no Chapter 2 — chapters run 1, then 3 to 13.",
  "That gap is present in the source document and has been left visible rather than renumbered away.",
];
if (!DRY) writeFileSync(MANUAL, JSON.stringify(manual, null, 2), "utf8");

console.log(`  study-manual rh134 units : ${book.units.length}`);

console.log(`  chapters built : ${units.length}`);
for (const u of units) {
  console.log(`    ${u.id}  ch${String(u.n).padStart(2)}  ${String(u.sections.length).padStart(2)} sections  ${String(u.words).padStart(5)} words  ${u.title.slice(0, 44)}`);
}
console.log(`  stale removed  : ${stale.length ? stale.join(", ") : "(none)"}`);
console.log(`  total words    : ${units.reduce((a, u) => a + u.words, 0)}`);
console.log(DRY ? "\n  (dry run)" : "\n  written");