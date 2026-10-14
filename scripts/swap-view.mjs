/**
 * swap-view.mjs — replace one exported view function in views.js.
 *
 * Used instead of a text edit because views.js is 2,000+ lines of UTF-8 with
 * em dashes in the prose, and an exact-match edit keeps failing on encoding
 * that the file on disk and the editor disagree about. This locates the
 * function by its signature and the next top-level marker, and swaps the whole
 * span. It fails loudly if either boundary is not found exactly once, so it can
 * never silently truncate the file.
 *
 *   node scripts/swap-view.mjs <fnName> <nextMarker> <replacementFile>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [fn, nextMarker, file] = process.argv.slice(2);
if (!fn || !nextMarker || !file) {
  console.error("usage: swap-view.mjs <fnName> <nextMarker> <replacementFile>");
  process.exit(2);
}

const path = new URL("../docs/assets/views.js", import.meta.url);
const src = readFileSync(path, "utf8");
const lines = src.split(/\r?\n/);

const startRe = new RegExp(`^export (?:async )?function ${fn}\\b`);
const starts = [];
lines.forEach((l, i) => { if (startRe.test(l)) starts.push(i); });
if (starts.length !== 1) {
  console.error(`FAIL: found ${starts.length} definitions of ${fn}, expected exactly 1`);
  process.exit(1);
}

const start = starts[0];

/*
 * The boundary must be a TOP-LEVEL section banner: column 0, `/* ===`. The
 * first attempt at this script matched a plain substring, and "library"
 * matched the banner at line 2104 - 780 lines past the function - silently
 * deleting studyUnitView and notesChapterView along the way. Requiring
 * column 0 plus the banner shape makes that impossible: every real boundary in
 * this file is a banner.
 */
const bannerRe = /^\/\* =+/;
const markerAt = lines.findIndex((l, i) => i > start && bannerRe.test(l) && l.includes(nextMarker));
if (markerAt < 0) {
  console.error(`FAIL: no top-level banner containing "${nextMarker}" after line ${start + 1}`);
  process.exit(1);
}

/*
 * And the removed region must contain exactly one exported function: the one
 * being replaced. Anything else means the boundary is too far away, and the
 * swap would take unrelated views with it.
 */
const removed = lines.slice(start, markerAt);
const otherExports = removed
  .map((l, i) => ({ l, n: start + i + 1 }))
  .filter(({ l }) => /^export (?:async )?function /.test(l))
  .filter(({ l }) => !startRe.test(l));
if (otherExports.length) {
  console.error(`FAIL: boundary at line ${markerAt + 1} would also delete:`);
  for (const { l, n } of otherExports) console.error(`  L${n}  ${l.trim()}`);
  console.error("  Pick a nearer section marker.");
  process.exit(1);
}

const before = lines.slice(0, start);
const after = lines.slice(markerAt);
const replacement = readFileSync(file, "utf8").replace(/\s+$/, "").split(/\r?\n/);

const out = [...before, ...replacement, "", ...after];
writeFileSync(path, out.join("\n"), "utf8");

console.log(`  replaced ${fn}: ${markerAt - start} lines -> ${replacement.length} lines`);
console.log(`  boundary: ${lines[markerAt].trim()}`);
console.log(`  views.js now ${out.length} lines`);
