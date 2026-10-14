/**
 * remove-ccna-library.mjs
 *
 * Removes the CCNA book from the Library section at the owner's request.
 *
 * SCOPE, deliberately narrow: this touches library.json only. The CCNA
 * *subject* is untouched - its 12 commands, 4 lessons and the 200-301 syllabus
 * all stay, reachable from Subjects and from search. Only the commercial
 * book's chapter index is removed, because it was the commercial book that was
 * asked about.
 *
 * The build script is updated too, so re-running it does not put CCNA back.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const INDEX = join(ROOT, "docs", "data", "library.json");
const BUILD = join(ROOT, "scripts", "build-library-index.mjs");

/* ------------------------------------------------------------ the index */

const doc = JSON.parse(readFileSync(INDEX, "utf8"));
const before = doc.books.length;
doc.books = doc.books.filter((b) => b.id !== "ccna");
writeFileSync(INDEX, JSON.stringify(doc, null, 2), "utf8");
console.log(`  library books: ${before} -> ${doc.books.length}`);
for (const b of doc.books) console.log(`    ${b.id}  ${b.chapters.length} chapters`);

/* ---------------------------------------------------------- the builder */

let src = readFileSync(BUILD, "utf8");

// Drop the whole CCNA object from the books array.
const start = src.indexOf('    {\n      id: "ccna",');
const end = src.indexOf('    {\n      id: "rhcsa",');
if (start > -1 && end > start) {
  src = src.slice(0, start) + src.slice(end);
  console.log("  removed the ccna entry from build-library-index.mjs");
}

// Drop the now-unused CCNA parser and its variable.
src = src.replace(/\/\* -+ CCNA book \*\/[\s\S]*?\n}\n\n/, "");
src = src.replace(/const ccnaText = readFileSync[\s\S]*?\n/,
  'const ccnaText = null;  // removed with the CCNA book at the owner\'s request\n');
src = src.replace(/const ccna = parseCcna\(ccnaText\);\n/, "");
src = src.replace(/^.*ccna\.chapters.*$/gm, "");
src = src.replace(/console\.log\(`  CCNA   :[\s\S]*?ccna\.chapters\.forEach\(c => console\.log\(.*?\)\);\n/m, "");

writeFileSync(BUILD, src, "utf8");
console.log("  builder updated");
