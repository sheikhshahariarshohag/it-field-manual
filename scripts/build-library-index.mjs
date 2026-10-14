/**
 * build-library-index.mjs
 *
 * Builds a locator index over two reference books held on the owner's machine.
 *
 * WHY AN INDEX AND NOT THE TEXT
 * The repository is public and GitHub Pages serves it to anyone. These are two
 * commercial books: "CCNA Certification Study Guide: Exam 200-301" (Sybex) and
 * an RHCSA certification study guide. Extracting their prose into the site
 * would republish them in full, which is a different act from the owner having
 * a copy on their own disk.
 *
 * What is published instead is the *structure*: chapter and module titles with
 * page numbers. Those are facts about a book rather than the book. They do the
 * job the user actually described - "if I ever need to read back the book I
 * will go there" - because a search result that says "OSPF, Chapter 6,
 * page 163" sends you to the right page of the PDF they already own.
 *
 * The full extracted text stays in private/library/, which .gitignore already
 * excludes, and is never served.
 *
 *   node scripts/build-library-index.mjs
 */
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "private", "library");
const OUT = join(ROOT, "docs", "data", "library.json");

/* ------------------------------------------------------- RHCSA guide */

/**
 * The RHCSA guide is organised as "Module NN: Title - description", with
 * Objective: lines underneath. Page numbers are not printed beside them, so
 * they are derived by counting form feeds rather than read from a contents
 * list. The first pass of this parser looked for "Module N" with the number
 * first and matched only one module; the real headings put the number after
 * the word.
 */
function parseRhcsa(text) {
  const lines = text.split(/\f/);
  const modules = [];
  let cur = null;

  const add = (n, title, page) => {
    cur = { n, title, page, sections: [] };
    modules.push(cur);
  };

  lines.forEach((page, pi) => {
    for (const raw of page.split("\n")) {
      const line = raw.trim();
      if (!line) continue;

      // "Module 01: System Installation - ..." but also the contents-page form
      // "2.13 Module 11: Boot Process & GRUB Configuration", so the match is
      // not anchored at the start of the line.
      const mod = line.match(/\bModule\s+(\d{1,2})\s*[:\-]\s*(.+)$/i);
      if (mod) {
        const full = mod[2].trim();
        // Split "Title - description" so the description does not become the title.
        const dash = full.indexOf(" - ");
        const title = (dash > 0 ? full.slice(0, dash) : full).trim();
        if (title.length <= 90) add(Number(mod[1]), title, pi + 1);
        continue;
      }

      const obj = line.match(/^Objective[:\-]\s*(.+)$/i);
      if (obj) {
        const title = obj[1].trim();
        if (title.length < 130) {
          if (!cur) add(0, "RHCSA objectives", pi + 1);
          cur.sections.push({ title, page: pi + 1 });
        }
      }
    }
  });

  // Keep one entry per module number: the contents page and the body both list
  // them, and the body occurrence is the one carrying objectives.
  const byN = new Map();
  for (const m of modules) {
    const prev = byN.get(m.n);
    if (!prev || (m.sections.length > prev.sections.length)) byN.set(m.n, m);
  }

  return {
    chapters: [...byN.values()]
      .filter((m) => m.sections.length)
      .sort((a, b) => a.n - b.n),
    pageCount: lines.length,
  };
}

/* ---------------------------------------------------------------- write */

function readIfPresent(name) {
  const p = join(SRC, name);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8");
}

const ccnaText = readIfPresent("ccna.txt");
const rhcsaText = readIfPresent("rhcsa.txt");
if (!ccnaText || !rhcsaText) {
  console.error("  Missing extracted text in private/library/. Run pdftotext first:");
  console.error("    pdftotext -enc UTF-8 -layout <book.pdf> private/library/ccna.txt");
  console.error("    pdftotext -enc UTF-8 -layout <book.pdf> private/library/rhcsa.txt");
  process.exit(1);
}

const rhcsa = parseRhcsa(rhcsaText);

const doc = {
  note:
    "A locator for two reference books held on the owner's machine. Chapter and " +
    "module titles with page numbers only — the books' text is not reproduced here. " +
    "Search a topic, get the page, open your own copy.",
  copyright:
    "Titles and page references are facts about a work. The prose of these books " +
    "is not published. The full extracted text stays in private/library/, which is " +
    "git-ignored and never served.",
  built: new Date().toISOString().slice(0, 10),
  books: [
    {
      id: "rhcsa",
      subject: "rhel",
      title: "RHCSA Certification Study Guide",
      author: "",
      note: "Objectives and modules, with page numbers derived from page boundaries.",
      pages: rhcsa.pageCount,
      chapters: rhcsa.chapters,
    },
  ],
};

writeFileSync(OUT, JSON.stringify(doc, null, 2), "utf8");



console.log(`  RHCSA  : ${rhcsa.chapters.length} modules, ${rhcsa.pageCount} pages`);
for (const c of rhcsa.chapters) console.log(`      m${String(c.n).padStart(2)} p.${String(c.page).padStart(4)}  ${c.title} (${c.sections.length} sections)`);
console.log(`\n  written -> docs/data/library.json (${Math.round(statSync(OUT).size / 1024)} KB)`);
console.log("  the extracted text stays in private/library/ and is not published");