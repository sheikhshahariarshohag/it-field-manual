/**
 * add-notes.mjs
 *
 * Merges every authored Simple Notes chapter into docs/data/simple-notes.json.
 *
 * Content lives in readable JS modules under scripts/ (one per authoring
 * batch) rather than being hand-edited into the JSON blob. This merges
 * idempotently: a chapter whose id already exists is replaced, not
 * duplicated, so re-running after an edit is safe.
 *
 * Data modules discovered automatically:
 *   scripts/rh134-notes-data.mjs        RH134 (8 chapters)
 *   scripts/notes-data-rh124-*.mjs      RH124 (batches a/b/c)
 *   scripts/notes-data-rh294.mjs        RH294
 *
 * Each must export an array named after its contents (RH134_NOTES etc.).
 *
 *   node scripts/add-notes.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCRIPTS = join(ROOT, "scripts");
const FILE = join(ROOT, "docs", "data", "simple-notes.json");
const DRY = process.argv.includes("--dry-run");

const files = readdirSync(SCRIPTS)
  .filter((f) => f === "rh134-notes-data.mjs" || /^notes-data-rh(124|294).*\.mjs$/.test(f))
  .sort();

const modules = [];
for (const f of files) {
  const mod = await import(pathToFileURL(join(SCRIPTS, f)).href);
  for (const [name, value] of Object.entries(mod)) {
    if (Array.isArray(value)) modules.push({ file: f, chapters: value });
  }
}

const doc = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(doc.chapters.map((c) => [c.id, c]));
let added = 0;
let replaced = 0;

for (const { file, chapters } of modules) {
  let a = 0;
  let r = 0;
  for (const c of chapters) {
    // JSON round-trip strips undefined so it never emits null placeholders.
    const clean = JSON.parse(JSON.stringify(c));
    if (byId.has(c.id)) r++; else a++;
    byId.set(c.id, clean);
  }
  added += a;
  replaced += r;
  console.log(`  ${file.padEnd(30)} +${a} new, ${r} replaced`);
}

doc.chapters = [...byId.values()].sort(
  (a, b) => String(a.book).localeCompare(String(b.book)) || a.n - b.n);

const concepts = doc.chapters.reduce(
  (a, c) => a + c.sections.reduce((x, s) => x + s.concepts.length, 0), 0);

if (!DRY) writeFileSync(FILE, JSON.stringify(doc, null, 2), "utf8");

console.log(`\n  added ${added}, replaced ${replaced}`);
console.log(`  chapters ${doc.chapters.length}  (${concepts} concepts)\n`);
const byBook = {};
for (const c of doc.chapters) {
  byBook[c.book] = byBook[c.book] || { chapters: 0, concepts: 0 };
  byBook[c.book].chapters++;
  byBook[c.book].concepts += c.sections.reduce((x, s) => x + s.concepts.length, 0);
}
for (const [book, v] of Object.entries(byBook)) {
  console.log(`  ${book.padEnd(7)} ${String(v.chapters).padStart(3)} chapters  ${String(v.concepts).padStart(4)} concepts`);
}
console.log(DRY ? "\n  (dry run — nothing written)" : "\n  written");