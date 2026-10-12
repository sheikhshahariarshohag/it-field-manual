/**
 * add-rh134-notes.mjs
 *
 * Merges the RH134 Simple Notes chapters into docs/data/simple-notes.json.
 *
 * The chapter content is authored in scripts/rh134-notes-data.mjs (readable
 * JS, with comments) rather than being hand-edited into the JSON blob. This
 * script merges idempotently: a chapter with an id that already exists is
 * replaced, not duplicated, so re-running after an edit is safe.
 *
 *   node scripts/add-rh134-notes.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RH134_NOTES } from "./rh134-notes-data.mjs";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILE = join(ROOT, "docs", "data", "simple-notes.json");
const DRY = process.argv.includes("--dry-run");

const doc = JSON.parse(readFileSync(FILE, "utf8"));
const byId = new Map(doc.chapters.map((c) => [c.id, c]));
let added = 0;
let replaced = 0;

for (const c of RH134_NOTES) {
  // Strip undefined so JSON.stringify does not emit null placeholders.
  const clean = JSON.parse(JSON.stringify(c));
  if (byId.has(c.id)) replaced++;
  else added++;
  byId.set(c.id, clean);
}

doc.chapters = [...byId.values()].sort((a, b) =>
  String(a.book).localeCompare(String(b.book)) || a.n - b.n);

const concepts = doc.chapters.reduce(
  (a, c) => a + c.sections.reduce((x, s) => x + s.concepts.length, 0), 0);

if (!DRY) writeFileSync(FILE, JSON.stringify(doc, null, 2), "utf8");

console.log(`  added    : ${added}`);
console.log(`  replaced : ${replaced}`);
console.log(`  chapters : ${doc.chapters.length}  (${concepts} concepts)`);
for (const c of doc.chapters) {
  const n = c.sections.reduce((x, s) => x + s.concepts.length, 0);
  console.log(`    ${c.id.padEnd(10)} ch${String(c.n).padEnd(3)} ${String(n).padStart(3)} concepts  ${c.title}`);
}
console.log(DRY ? "  (dry run — nothing written)" : "  written");