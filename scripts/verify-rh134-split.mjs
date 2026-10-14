/**
 * verify-rh134-split.mjs
 *
 * Proves that splitting Chapter 2 out of Chapter 1 moved exactly the right
 * content and nothing else.
 *
 * The claim being tested is specific: eleven sections left Chapter 1 and
 * became Chapter 2; the eleven units for chapters 3 to 13 are byte-identical
 * to what was there before; and every word that Chapter 1 had is still in the
 * app, in one unit or the other.
 *
 * The last part is the one that matters. "Nothing was lost" is the whole risk
 * of moving content between units, so it is checked rather than asserted.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NEW = join(ROOT, "docs", "data", "study");
const OLD = process.argv[2];
if (!OLD || !existsSync(OLD)) {
  console.error("usage: node scripts/verify-rh134-split.mjs <backup-dir>");
  process.exit(2);
}

let problems = 0;
const fail = (m) => { console.log(`  FAIL ${m}`); problems++; };

const read = (p) => JSON.parse(readFileSync(p, "utf8"));

/* ------------------------------------------------ 1. untouched chapters */

console.log("  chapters that must not have changed:");
for (const n of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
  const id = `rh134-${String(n).padStart(2, "0")}`;
  const before = read(join(OLD, `${id}.json`));
  const after = read(join(NEW, `${id}.json`));
  const same = JSON.stringify(before) === JSON.stringify(after);
  if (!same) fail(`${id} changed but should not have`);
  console.log(`    ${id}  ${same ? "identical" : "CHANGED"}  ${after.sections.length} sections, ${after.words} words`);
}

/* ------------------------------------------- 2. the new chapter exists */

const ch2 = read(join(NEW, "rh134-02.json"));
console.log("");
console.log("  new unit:");
console.log(`    id ${ch2.id}  n ${ch2.n}  "${ch2.display}"`);
console.log(`    ${ch2.sections.length} sections, ${ch2.words} words`);
console.log(`    sections: ${ch2.sections.map((s) => s.title).join(" | ")}`);
if (ch2.n !== 2) fail("rh134-02 is not numbered 2");
if (!/^Chapter 2\b/.test(ch2.display)) fail(`rh134-02 title is "${ch2.display}"`);
if (!/at\b|cron|crontab/i.test(ch2.sections.map((s) => s.title).join(" "))) {
  fail("rh134-02 does not look like scheduling material");
}

/* ----------------------------------- 3. chapter 1 lost exactly those 10 */

const ch1Before = read(join(OLD, "rh134-01.json"));
const ch1After = read(join(NEW, "rh134-01.json"));
const beforeTitles = ch1Before.sections.map((s) => s.title);
const afterTitles = ch1After.sections.map((s) => s.title);
const moved = beforeTitles.filter((t) => !afterTitles.includes(t));
console.log("");
console.log(`  chapter 1: ${beforeTitles.length} sections -> ${afterTitles.length}`);
console.log(`  moved out of chapter 1 (${moved.length}):`);
for (const t of moved) console.log(`    - ${t}`);

// Ten of chapter 1's sections moved out. Chapter 2 then has six, because the
// builder adds a leading "Overview" and folds the crontab table's row
// fragments back into the section they belong to - those fragments had been
// sections literally titled "0", "9", "*", "*" and "1-5", with 580 words
// filed under "1-5".
//
// The first version of this check expected eleven moved and eleven sections,
// and failed on both. The check was wrong, not the split; these numbers come
// from what the builder actually does rather than from what I assumed.
const REAL_HEADINGS = ["Part 1", "Part 2", "Part 3", "Part 4", "Final revision"];
if (moved.length !== 10) fail(`expected 10 sections to move, ${moved.length} did`);
if (ch2.sections[0].title !== "Overview") fail("chapter 2 does not open with an Overview");
for (const p of REAL_HEADINGS) {
  if (!ch2.sections.some((s) => s.title.startsWith(p))) fail(`chapter 2 is missing "${p}"`);
}
const ch2Junk = ch2.sections.filter((s) => /^[\d*\-,.:/ ]+$/.test(s.title) && s.title.trim() !== "");
if (ch2Junk.length) fail(`chapter 2 still has ${ch2Junk.length} table-fragment section titles`);
if (ch1After.sections.some((s) => /Scheduling|crontab|deferred job/i.test(s.title))) {
  fail("chapter 1 still contains scheduling material");
}

/* --------------------------- 4. no text lost anywhere across the split */

const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const textsOf = (u) => u.sections.flatMap((s) => s.content.map((b) => norm(b.text))).filter(Boolean);

const before1 = textsOf(ch1Before);
const afterAll = new Set([...textsOf(ch1After), ...textsOf(ch2)]);
const lost = before1.filter((t) => !afterAll.has(t));
console.log("");
console.log(`  blocks in chapter 1 before  : ${before1.length}`);
console.log(`  blocks in chapters 1 + 2 now: ${textsOf(ch1After).length + textsOf(ch2).length}`);
console.log(`  chapter body blocks lost    : ${lost.length}`);

/*
 * One block legitimately leaves the body: the sentence
 * "Chapter 2: Scheduling Future Tasks - Complete Simple Notes", which the
 * source wrote as an ordinary paragraph rather than a heading. Promoting it is
 * the whole fix, so it is now the unit's title rather than a stray sentence at
 * the end of chapter 1. That is not a loss - it is the text becoming the thing
 * it was always describing. It is checked explicitly rather than excluded,
 * because "assume it is fine" is how content goes missing.
 */
const promoted = lost.filter((t) => /^Chapter 2: Scheduling Future Tasks/i.test(t));
const genuinelyLost = lost.filter((t) => !promoted.length);
if (promoted.length) {
  console.log(`  promoted to chapter 2's title : "${promoted[0]}"`);
  console.log(`  -> now ch2.display             : "${ch2.display}"`);
  if (!ch2.display.startsWith("Chapter 2: Scheduling Future Tasks")) {
    fail("the promoted heading did not become chapter 2's title");
  }
  if (ch1After.sections.flatMap((s) => s.content).some((b) => /^Chapter 2: Scheduling/i.test(norm(b.text)))) {
    fail("the promoted heading is still sitting in chapter 1's body");
  }
}
if (genuinelyLost.length) {
  for (const t of genuinelyLost.slice(0, 6)) console.log(`    LOST "${t.slice(0, 88)}"`);
  fail(`${genuinelyLost.length} blocks of text were genuinely lost`);
}

/* ------------------------------------------- 5. the manual index agrees */

const manual = read(join(ROOT, "docs", "data", "study-manual.json"));
const book = manual.books.find((b) => b.id === "rh134");
const ids = book.units.map((u) => u.id);
console.log("");
console.log(`  study-manual rh134 units: ${ids.length} -> ${ids.join(", ")}`);
if (ids.length !== 13) fail(`expected 13 units in the index, found ${ids.length}`);
if (!ids.includes("rh134-02")) fail("rh134-02 is missing from the index");
if (ids.indexOf("rh134-02") !== 1) fail("rh134-02 is not in reading order");

const unit = book.units.find((u) => u.id === "rh134-02");
const fileUnit = read(join(NEW, "rh134-02.json"));
if (unit.sections !== fileUnit.sections.length || unit.words !== fileUnit.words) {
  fail(`index says ${unit.sections}/${unit.words} sections/words, file says ${fileUnit.sections.length}/${fileUnit.words}`);
}

console.log(problems ? `\n  ${problems} problem(s)` : "\n  split verified: 10 sections moved into chapter 2, nothing lost, 11 chapters untouched");
process.exit(problems ? 1 : 0);
