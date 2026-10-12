/**
 * digest.mjs — authoring aid.
 *
 * Prints a compact view of extracted study sections so Simple Notes can be
 * written against what the source actually says, rather than from memory.
 * The full text is 30,000+ words per guide; this prints the shape plus a
 * sample of each section.
 *
 *   node scripts/digest.mjs rh124-02 120
 *   node scripts/digest.mjs rh294-01 160
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DIR = join(ROOT, "docs", "data", "study");

const args = process.argv.slice(2);
const width = Number(args[1] || 140);
const wanted = args.length
  ? args[0].split(",")
  : readdirSync(DIR).filter((f) => /^rh(124|294)-\d+\.json$/.test(f))
            .map((f) => f.replace(/\.json$/, ""))
            .sort();

for (const id of wanted) {
  const d = JSON.parse(readFileSync(join(DIR, `${id}.json`), "utf8"));
  console.log(`\n=== ${id}  ${d.display}`);
  for (const s of d.sections) {
    const text = s.content.map((c) => c.text).join(" | ").replace(/\s+/g, " ");
    console.log(`  [${s.title}] ${s.words}w`);
    console.log(`    ${text.slice(0, width)}`);
  }
}