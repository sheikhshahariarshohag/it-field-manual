/**
 * lint-notes.mjs
 *
 * Catches authoring mistakes in the Simple Notes data modules before they
 * reach a commit. These are JS modules, so a stray missing quote is a hard
 * syntax error rather than a subtle content bug — but it aborts the whole
 * merge with an unhelpful message, so it is worth catching directly.
 *
 * Checks:
 *   - unbalanced quotes on short string fields (remember/main/title/warning)
 *   - concepts missing any of the six required parts
 *   - duplicate concept numbers within a chapter
 *   - concept numbering that does not run 1..N
 *
 *   node scripts/lint-notes.mjs           report
 *   node scripts/lint-notes.mjs --fix     also add missing opening quotes
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SCRIPTS = join(ROOT, "scripts");
const FIX = process.argv.includes("--fix");

const files = readdirSync(SCRIPTS)
  .filter((f) => /^notes-data-.*\.mjs$/.test(f))
  .sort();

// Fields that should always be present on a concept.
const REQUIRED = ["n", "title", "main", "simple", "remember"];

let problems = 0;

for (const f of files) {
  const p = join(SCRIPTS, f);
  let text = readFileSync(p, "utf8");

  // 1. missing opening quote on the short fields: `remember: some text."`
  if (FIX) {
    let fixed = 0;
    text = text.replace(
      /^(\s*(?:remember|main|warning):\s+)(?!")([^\n]*?)"(,?)[ \t]*$/gm,
      (_m, pre, body, comma) => { fixed++; return `${pre}"${body}"${comma}`; });
    if (fixed) { writeFileSync(p, text); console.log(`  ${f}: fixed ${fixed} missing opening quote(s)`); }
  }

  let mod;
  try {
    // Cache-bust so --fix re-imports the file it just rewrote.
    mod = await import(pathToFileURL(p).href + (FIX ? `?t=${Date.now()}` : ""));
  } catch (e) {
    console.log(`  ${f}: SYNTAX ERROR — ${e.message.split("\n")[0]}`);
    problems++;
    continue;
  }

  const chapters = Object.values(mod).find(Array.isArray);
  if (!chapters) { console.log(`  ${f}: exports no array`); problems++; continue; }

  for (const c of chapters) {
    const nums = [];
    for (const s of c.sections || []) {
      for (const q of s.concepts || []) {
        nums.push(q.n);
        const missing = REQUIRED.filter((k) => q[k] === undefined || q[k] === null);
        if (missing.length) {
          console.log(`  ${c.id} #${q.n} "${q.title || "?"}" — missing: ${missing.join(", ")}`);
          problems++;
        }
      }
    }
    const expected = nums.map((_, i) => i + 1);
    if (JSON.stringify(nums) !== JSON.stringify(expected)) {
      console.log(`  ${c.id} — numbering is ${nums.join(",")}, expected ${expected.join(",")}`);
      problems++;
    }
  }
}

console.log(problems ? `\n  ${problems} problem(s) found` : "\n  clean");
process.exit(problems ? 1 : 0);