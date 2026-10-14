/** Guards the chapter-title contract so it cannot regress silently. */
import { readFileSync } from "node:fs";
const { chapterTitle } = await import("../docs/assets/titles.js");
const m = JSON.parse(readFileSync(new URL("../docs/data/study-manual.json", import.meta.url), "utf8"));
let bad = 0;
const rows = [];
for (const b of m.books) {
  const titles = b.units.map((u) => chapterTitle(u.display));
  rows.push({ book: b.code, titles });
  titles.forEach((t, i) => {
    const src = b.units[i].display;
    if (/^(Ch|Part) \d+ \u2014 [A-Z]/.test(t)) { console.log(`  RAW  ${b.code} ${t}`); bad++; }
    if (/\u2026|\.\.\.\s*$/.test(t))        { console.log(`  TRUNC ${b.code} ${t}`); bad++; }
    if (/^Part 0\b/.test(t))               { console.log(`  PART0 ${b.code} ${t}`); bad++; }
    if (!/^(Chapter|Part) \d+: |How to Build the Lab$/.test(t)) {
      console.log(`  SHAPE ${b.code} "${src}" -> "${t}"`); bad++;
    }
  });
}
for (const r of rows) console.log(`  ${r.book}: ${r.titles.length} titles, first="${r.titles[0]}"`);
console.log(bad ? `\n  ${bad} problem(s)` : "\n  every title matches Chapter N: Title, or the lab preamble");
process.exit(bad ? 1 : 0);
