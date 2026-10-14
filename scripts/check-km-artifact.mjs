/**
 * check-km-artifact.mjs — word-level integrity for the Knowledge Map export.
 *
 * Changing how the exporter reassembles PDF lines is exactly the kind of edit
 * that loses a sentence without anyone noticing, so this compares the whole
 * corpus before and after, word by word.
 *
 * Two things are asserted:
 *
 *   1. No word disappears. Every alphanumeric token of three characters or more
 *      that was in the previous export is still in the new one, in that same
 *      session file. Multi-line diagrams count word for word, so recovering a
 *      diagram cannot hide a deletion.
 *
 *   2. Diagrams keep their shape. Any item containing a newline must look like
 *      a drawing - several lines, at least one of which carries box geometry or
 *      a box-drawing character. That catches a sentence that got wrapped rather
 *      than a diagram that got preserved.
 *
 *   node scripts/check-km-artifact.mjs <previous-export-dir>
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const OLD = process.argv[2];
if (!OLD || !existsSync(OLD)) {
  console.error("usage: node scripts/check-km-artifact.mjs <previous-export-dir>");
  process.exit(2);
}
const NEW = "docs/data/km";

const wordSet = (obj) => {
  const s = new Set();
  for (const items of Object.values(obj.sections || {})) {
    for (const t of items) {
      for (const w of String(t).toLowerCase().match(/[a-z0-9]{3,}/g) || []) s.add(w);
    }
  }
  return s;
};

const GEOMETRY = /(?:\+[-=]{2,}|\|[-=]{2,}|[-=]{2,}[+|]|<[-=]{2,}>|\+-|[-=]{3,})/;
const BOX = /[\u2500-\u257F\u2550-\u256C]/;

let lostWords = 0, totalBefore = 0, totalAfter = 0, sessions = 0;
const badArt = [];
let artItems = 0;

for (const f of readdirSync(NEW).filter((x) => x.endsWith(".json"))) {
  const before = JSON.parse(readFileSync(join(OLD, f), "utf8"));
  const after = JSON.parse(readFileSync(join(NEW, f), "utf8"));
  sessions++;

  const bw = wordSet(before), aw = wordSet(after);
  totalBefore += bw.size; totalAfter += aw.size;
  const gone = [...bw].filter((w) => !aw.has(w));
  if (gone.length) {
    lostWords += gone.length;
    if (lostWords <= 5) console.log(`  LOST in ${f}: ${gone.slice(0, 12).join(" ")}`);
  }

  for (const items of Object.values(after.sections || {})) {
    for (const t of items) {
      if (!String(t).includes("\n")) continue;
      artItems++;
      const lines = String(t).split("\n").filter((l) => l.trim());
      const shaped = lines.some((l) => GEOMETRY.test(l) || BOX.test(l));
      if (!shaped || lines.length < 2) {
        if (badArt.length < 6) badArt.push({ f, sample: String(t).slice(0, 80) });
      }
    }
  }
}

console.log(`  sessions compared        : ${sessions}`);
console.log(`  distinct words before/after: ${totalBefore} / ${totalAfter}`);
console.log(`  words lost                : ${lostWords}`);
console.log(`  multi-line diagram blocks : ${artItems}`);
console.log(`  blocks that are not diagrams: ${badArt.length}`);
for (const b of badArt) console.log(`    ${b.f}: ${JSON.stringify(b.sample)}`);

const ok = lostWords === 0 && badArt.length === 0;
console.log(ok ? "\n  knowledge map export verified" : "\n  problems found");
process.exit(ok ? 1 * 0 : 1);
