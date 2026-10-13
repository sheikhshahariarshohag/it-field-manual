/**
 * backfill-section-titles.mjs
 *
 * Copies each study unit's section titles into study-manual.json.
 *
 * WHY
 * The unit bodies live in separate files under docs/data/study/, fetched on
 * demand when a unit is opened. That keeps the initial payload small, but it
 * also means the search index cannot see any section name.
 *
 * search.js now indexes the Study Manual, and a chapter you can only find by
 * its unit title is barely findable — a learner searching for a section name
 * like "Changing the SELinux Enforcement Mode" would get nothing. The titles
 * are duplicated into study-manual.json so they are available up front.
 *
 * The duplication is deliberate and bounded: section titles are short, there
 * are a few hundred of them, and the full body text is still only fetched when
 * a unit is actually opened.
 *
 * Idempotent. Safe to re-run after rebuilding any book.
 *
 *   node scripts/backfill-section-titles.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const MANUAL = join(ROOT, "docs", "data", "study-manual.json");
const UNIT_DIR = join(ROOT, "docs", "data", "study");
const DRY = process.argv.includes("--dry-run");

const manual = JSON.parse(readFileSync(MANUAL, "utf8"));
let filled = 0;
let missing = 0;

for (const book of manual.books || []) {
  for (const u of book.units || []) {
    const p = join(UNIT_DIR, `${u.id}.json`);
    if (!existsSync(p)) {
      missing++;
      console.log(`  MISSING body: ${u.id} (listed in study-manual but no file)`);
      continue;
    }
    const unit = JSON.parse(readFileSync(p, "utf8"));
    const titles = (unit.sections || []).map((s) => s.title).filter(Boolean);
    if (!titles.length) { missing++; continue; }
    if (JSON.stringify(u.sectionTitles) !== JSON.stringify(titles)) {
      u.sectionTitles = titles;
      filled++;
    }
    // Keep the count honest while we are here.
    u.sections = titles.length;
    if (unit.words !== undefined) u.words = unit.words;
  }
}

if (!DRY) writeFileSync(MANUAL, JSON.stringify(manual, null, 2), "utf8");

console.log(`  units with titles written : ${filled}`);
console.log(`  units missing a body      : ${missing}`);
console.log(DRY ? "  (dry run)" : "  written");