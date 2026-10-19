/**
 * check-doc-contrast.mjs - every colour a document uses must be readable.
 *
 *   node scripts/check-doc-contrast.mjs
 *
 * WHY THIS IS SEPARATE FROM check-prose-contrast.mjs
 * That one checks declared token pairs in app.css. The documents cannot use
 * that mechanism: across the 40 .docx files in scope there are 16 run colours
 * and 18 fills, they vary per document, and the colour that matters is not the
 * colour but the PAIR - a run against whatever it sits on.
 *
 * WHY A DOCUMENT IS NOT CHECKED PER THEME
 * A document is reproduced as a document: its own paper, its own colours, the
 * same in light and dark. That is what "as it is" means, and it is why this
 * check has one model rather than two. What still has to be checked per theme
 * is the paper against the app page behind it, because that edge is the only
 * part of a document the theme touches, and it is a non-text boundary.
 *
 * THE MODEL, AND WHERE IT CAME FROM
 *   run colour        the colour the run sets, or #000000 when it sets none
 *   paragraph fill    the <w:shd> inside <w:pPr>, or the paper
 *   character chip    the <w:shd> inside a run's <w:rPr>, drawn behind that
 *                     one run - the " BOOK " tag
 *
 * #000000 for an unset colour is Word's default and these documents do not
 * override it: measured across the corpus, styles.xml sets no docDefaults
 * colour, and every shaded paragraph carries an explicit colour on every run.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DATA = "docs/data";
const DIR = join(DATA, "docs");
const PAPER = "#FFFFFF";          // the document's own surface
const DEFAULT_INK = "#000000";    // Word's default text colour
const TEXT_AA = 4.5;              // WCAG AA, body text
const LARGE_AA = 3.0;             // WCAG AA, bold or >= 24px
const EDGE = 3.0;                 // WCAG 1.4.11, non-text boundary

function luminance(hex) {
  const h = String(hex).replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** The tokens a document meets from the app: the page and the border. */
function pageTokens() {
  const css = readFileSync("docs/assets/app.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const darkAt = css.indexOf('[data-theme="dark"]');
  const light = css.slice(0, darkAt > -1 ? darkAt : css.length);
  const dark = darkAt > -1 ? css.slice(darkAt) : "";
  const pick = (blk, name) => {
    const m = blk.match(new RegExp(name + "\\s*:\\s*(#[0-9a-fA-F]{3,8})"));
    return m ? m[1] : null;
  };
  const out = {};
  for (const [theme, blk] of [["light", light], ["dark", dark]]) {
    const bg = pick(blk, "--bg");
    const line = pick(blk, "--line");
    if (!bg || !line) {
      console.error(`  FAIL   could not read --bg/--line from app.css for the ${theme} theme`);
      process.exit(1);
    }
    out[theme] = { bg, line };
  }
  return out;
}

if (!existsSync(DIR)) {
  console.log("  no docs/data/docs directory - nothing to check");
  process.exit(0);
}

/* ---------------------------------------------------- collect the pairs */

const pairs = new Map();

function note(fg, bg, file, large) {
  const key = `${fg}|${bg}`;
  const r = ratio(fg, bg);
  const need = large ? LARGE_AA : TEXT_AA;
  const rec = pairs.get(key) || { fg, bg, count: 0, worst: r, need, where: file };
  rec.count++;
  if (r < rec.worst) { rec.worst = r; rec.where = file; }
  rec.need = Math.min(rec.need, need);
  pairs.set(key, rec);
}

/** A run's ink on a background: its own colour, a character chip, or the page. */
function inkOn(run, background, file) {
  const fg = run.c || DEFAULT_INK;
  /*
   * A character-shaded run sits on its OWN shading. That shading is opaque, so
   * whatever the paragraph is behind it does not reach the glyphs, and the
   * paragraph must not be counted as a background for that run.
   *
   * There used to be a second note() here, recording the same run against the
   * paragraph too. That invented pairs the reader never sees: the 1,359 white
   * "BOOK" tags were reported as #FFFFFF on #FFFFFF, because the tag's own
   * dark chip was ignored and only the white paper behind the paragraph was
   * considered. 3,862 chips in the corpus, every one of them a false alarm.
   */
  note(fg, run.sh || background, file, !!run.b);
}

const files = readdirSync(DIR).filter((f) => /^[a-z]+-\d+\.json$/.test(f)).sort();
let docs = 0, runs = 0, boxes = 0, chips = 0;

for (const f of files) {
  const j = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  docs++;
  runs += j.runs || 0;
  for (const b of j.blocks || []) {
    if (b.k === "box") {
      boxes++;
      for (const p of b.paras) for (const r of p.runs || []) { chips += r.sh ? 1 : 0; inkOn(r, b.fill, f); }
      continue;
    }
    if (b.k === "tbl") {
      for (const row of b.rows) for (const c of row) {
        const bg = c.fill || PAPER;
        for (const r of c.runs || []) inkOn(r, bg, f);
      }
      continue;
    }
    const bg = b.fill || PAPER;
    for (const r of b.runs || []) inkOn(r, bg, f);
  }
}

/* --------------------------------------------------------------- report */

console.log(`\n  ${docs} documents, ${runs} runs, ${boxes} shaded boxes, ${chips} character chips`);
console.log(`  ${pairs.size} distinct ink-on-background pairs`);
console.log("    ink            on            uses   worst    needs");

let fails = 0;
for (const r of [...pairs.values()].sort((a, b) => a.worst - b.worst)) {
  const ok = r.worst >= r.need;
  if (!ok) fails++;
  console.log(
    `    ${r.fg} on ${r.bg}`.padEnd(26) +
    `${String(r.count).padStart(6)} ${r.worst.toFixed(2).padStart(6)}:1  ` +
    (ok ? "ok" : `FAIL  ${r.need}:1 needed  (${r.where})`),
  );
}

/*
 * The one part of a document the app theme does touch: its edge against the
 * page behind it.
 *
 * This checks the BORDER, not the paper. White paper on the light theme's
 * near-white page is 1.05:1 - the document would have no visible outline at
 * all - and the fix is a 1px var(--line) border, which is already a declared,
 * passing pair in check-prose-contrast.mjs ("border on page"). Measuring the
 * border is measuring what the reader actually sees; measuring the paper would
 * fail on a surface that is never adjacent to the page, because the border is
 * always between them.
 */
console.log("\n  document edge against the app page");
const tokens = pageTokens();
let edgeFails = 0;
for (const [theme, t] of Object.entries(tokens)) {
  const r = ratio(t.line, t.bg);
  // 1.3:1, not 3:1. That is this project's documented floor for a 1px rule -
  // see the THRESHOLDS block in check-prose-contrast.mjs: "below which a 1px
  // rule simply is not visible at all", chosen after shipping separators that
  // measured 1.10:1. 3.0:1 is WCAG 1.4.11's target for non-text indicators and
  // --line does not meet it, so both numbers are printed rather than only the
  // one that passes.
  const visible = r >= 1.3;
  const aa = r >= 3.0;
  if (!visible) edgeFails++;
  console.log(
    `    ${t.line} on ${t.bg}  ${theme}`.padEnd(34) +
    `${r.toFixed(2).padStart(6)}:1  ` +
    (visible ? (aa ? "ok, and meets 3:1" : "visible, below the 3:1 target") : "NOT VISIBLE"),
  );
}

/* The index must describe the files that are actually there. */
const indexPath = join(DATA, "documents.json");
if (existsSync(indexPath)) {
  const index = JSON.parse(readFileSync(indexPath, "utf8"));
  let listed = 0;
  for (const set of Object.values(index.sets || {})) {
    for (const d of set.docs || []) {
      const p = join(DIR, `${d.id}.json`);
      if (!existsSync(p)) {
        console.log(`    FAIL   ${d.id} is listed in documents.json but the file is missing`);
        fails++;
        continue;
      }
      const j = JSON.parse(readFileSync(p, "utf8"));
      if (j.blocks.length !== d.blocks || j.words !== d.words || j.tbl !== d.tables || j.boxes !== d.boxes) {
        console.log(`    FAIL   ${d.id}: index says ${d.blocks}blk/${d.words}w/${d.tables}tbl/${d.boxes}box, file has ${j.blocks.length}/${j.words}/${j.tbl}/${j.boxes}`);
        fails++;
      }
      listed++;
    }
  }
  console.log(`\n  ${listed} listed documents match their files`);
}

const total = fails + edgeFails;
console.log(total
  ? `\n  ${total} problem(s)`
  : "\n  every ink a document uses is readable, and the paper edge is visible in both themes");
process.exit(total ? 1 : 0);
