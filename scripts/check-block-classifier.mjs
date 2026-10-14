/**
 * check-block-classifier.mjs
 *
 * Runs the real classifier from prose.js over the real corpus and prints what
 * it classified. This exists so the learning-element rules are measured rather
 * than asserted: if a future content change makes "analogy" jump from 7 blocks
 * to 700, that is a content change, not a renderer change, and it should be
 * noticed rather than discovered by a learner.
 *
 * The DOM is stubbed so the pure classification logic can run under node with
 * no browser. Only the classification functions are exercised here - rendering
 * is verified in the browser, not here.
 */
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const src = readFileSync(new URL("docs/assets/prose.js", ROOT), "utf8")
  // Stub the browser dependencies. `h` returns a chainable stub so the module
  // body evaluates; only classifyBlock/classify are called below.
  .replace(/^import .*$/m, "const h = () => ({}); const copyText = async () => true;")
  .replace(/export /g, "");

const api = new Function(`${src}\nreturn { classifyBlock, classify };`)();

/* ---------------------------------------------------- gather the corpus */

const texts = [];
const index = JSON.parse(readFileSync(new URL("docs/data/study-manual.json", ROOT), "utf8"));
let unitsRead = 0;
for (const book of index.books) {
  for (const unit of book.units) {
    let doc;
    try {
      doc = JSON.parse(readFileSync(new URL(`docs/data/study/${unit.id}.json`, ROOT), "utf8"));
    } catch (_) {
      continue;
    }
    unitsRead++;
    for (const s of doc.sections || []) for (const b of s.content || []) texts.push(b);
    for (const s of (doc.labs || []).concat(doc.quizzes || [])) {
      for (const b of s.content || []) texts.push(b);
    }
  }
}

/* ------------------------------------------------------------- classify */

const counts = new Map();
const examples = new Map();
for (const b of texts) {
  const r = api.classifyBlock(b);
  counts.set(r.type, (counts.get(r.type) || 0) + 1);
  if (!examples.has(r.type)) examples.set(r.type, String(b.text).slice(0, 72));
}

const total = texts.length;
console.log(`  units read : ${unitsRead}`);
console.log(`  blocks     : ${total}`);
console.log("");

const order = [...counts.entries()].sort((a, b) => b[1] - a[1]);
for (const [k, v] of order) {
  const pct = ((100 * v) / total).toFixed(2).padStart(6);
  console.log(`  ${k.padEnd(15)} ${String(v).padStart(5)}  ${pct}%`);
  console.log(`      e.g. ${examples.get(k)}`);
}

/* --------------------------------------------------------------- assert */

// A type that matches a large share of the corpus would mean the rules are
// promoting ordinary prose into cards. That is the failure this whole design
// is trying to avoid, so it is a hard failure rather than a warning.
// Caps are percentages of all blocks, measured against the 2026-10-14 corpus.
const CAP_PCT = {
  question: 3, answer: 3, analogy: 1, verify: 2, callout: 6, stepCandidate: 3,
};
let failed = 0;
for (const [type, cap] of Object.entries(CAP_PCT)) {
  const v = counts.get(type) || 0;
  const pct = (100 * v) / total;
  if (pct > cap) {
    console.log(`\n  FAIL ${type}: ${v} blocks (${pct.toFixed(2)}%) exceeds the ${cap}% cap`);
    failed++;
  }
}

// The knowledge check is only useful if questions and answers actually pair.
const q = counts.get("question") || 0;
const a = counts.get("answer") || 0;
if (q > 0 && a === 0) {
  console.log(`\n  WARN ${q} questions but 0 answers - every knowledge check will show "no answer given"`);
}
if (q > 0 && a > 0) console.log(`  pairing: ${q} questions / ${a} answers detected`);

console.log(failed ? `\n  ${failed} check(s) FAILED` : "\n  all caps respected");
process.exit(failed ? 1 : 0);
