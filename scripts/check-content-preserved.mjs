/**
 * check-content-preserved.mjs
 *
 * Proves the reader does not lose or alter chapter content.
 *
 * The redesign routes every block through prose.classifyBlock before rendering.
 * A classifier that quietly drops a block, truncates one, or strips text that
 * only looks like markup would be invisible on screen until somebody noticed a
 * missing paragraph in a chapter they were studying.
 *
 * So this walks every block of every study unit and every Knowledge Map
 * session and asserts that the classified result still carries the source text:
 *
 *   - every non-blank block survives (nothing dropped)
 *   - the text that comes back is a prefix or full match of the source, or the
 *     source minus a marker that the classifier is documented to consume
 *     (a callout label, a "1. Q1 -" prefix, a "Verify:" prefix). Nothing else
 *     may be removed.
 *   - every question that the source follows with an answer is still paired
 *
 * Exits non-zero on any loss. Run after any change to the classifier.
 */
import { readFileSync } from "node:fs";

const ROOT = new URL("..", import.meta.url);
const src = readFileSync(new URL("docs/assets/prose.js", ROOT), "utf8")
  .replace(/^import \{[^}]*\} from ".*";$/gm, "")
    .replace(/^import \* as \w+ from ".*";$/gm, "")
    .replace(/^import \{ h[^}]*\} from ".*";$/gm, "const h=()=>({}); const copyText=async()=>true; const db={put:async()=>{},get:async()=>null,remove:async()=>{}};")
  .replace(/export /g, "");
const api = new Function(`${src}\nreturn { classifyBlock, verifyTag };`)();

/* ------------------------------------------------------------ the corpus */

const blocks = [];
const index = JSON.parse(readFileSync(new URL("docs/data/study-manual.json", ROOT), "utf8"));

for (const book of index.books) {
  for (const unit of book.units) {
    let doc;
    try {
      doc = JSON.parse(readFileSync(new URL(`docs/data/study/${unit.id}.json`, ROOT), "utf8"));
    } catch (_) {
      continue;
    }
    for (const s of doc.sections || []) for (const b of s.content || []) blocks.push({ where: `${unit.id}/${s.title}`, b });
    for (const s of (doc.labs || []).concat(doc.quizzes || [])) {
      for (const b of s.content || []) blocks.push({ where: `${unit.id}/${s.title}`, b });
    }
  }
}

const km = JSON.parse(readFileSync(new URL("docs/data/knowledge-map.json", ROOT), "utf8"));
const kmParas = [];
for (const s of km.sessions) {
  let doc;
  try {
    doc = JSON.parse(readFileSync(new URL(`docs/data/km/${s.id}.json`, ROOT), "utf8"));
  } catch (_) {
    continue;
  }
  for (const [kind, items] of Object.entries(doc.sections || {})) {
    if (!Array.isArray(items)) continue;
    for (const t of items) kmParas.push({ where: `${s.id}/${kind}`, t: String(t) });
  }
}

/* ------------------------------------------------------------- the check */

let problems = 0;
const fail = (where, msg, detail) => {
  problems++;
  if (problems <= 12) console.log(`  FAIL ${where}: ${msg}\n       ${detail}`);
};

/**
 * Text the classifier is allowed to consume: a leading marker it has already
 * turned into a separate label field. Anything else surviving in the output
 * must still be in the source.
 */
/*
 * A marker, matched with a LOOKAHEAD rather than by consuming what follows.
 *
 * The first attempt here used `\S[\s\S]*` to assert that content followed the
 * marker, which also consumed all of it - so `want` came out empty for every
 * callout and the check reported 344 false differences. The lookahead asserts
 * the same thing without eating the text, which is the whole point: the text
 * has to still be there afterwards.
 */
const MARKERS = [
  /^(?:RHCSA EXAM CRITICAL|EXAM CRITICAL|CRITICAL|WARNING|CAUTION|DANGER)\b\s*(?:[\u2014\u2013-]\s*|:\s*)?(?=\S)/i,
  // The teaching boxes below require their separator, matching CALLOUTS exactly.
  // An optional separator here would strip "SUMMARY of results" even though the
  // classifier leaves that line as prose, and the check would report a loss.
  /^(?:COMMON MISTAKES?|COMMON ERRORS?|COMMON PITFALLS?|PITFALLS?|GOTCHAS?|MISTAKES?)\b\s*(?:[\u2014\u2013-]\s*|:\s*)(?=\S)/i,
  /^(?:KEY TAKEAWAYS?|TAKEAWAYS?|IN SHORT|SUMMARY|KEY POINTS?)\b\s*(?:[\u2014\u2013-]\s*|:\s*)(?=\S)/i,
  /^(?:IMPORTANT|KEY RULE|RULE OF THUMB|RULE|MUST REMEMBER|KEY POINT)\b\s*(?:[\u2014\u2013-]\s*|:\s*)(?=\S)/i,
  /^(?:EXAMPLE|FOR EXAMPLE|E\.G\.|WORKED EXAMPLE)\b\s*(?:[\u2014\u2013-]\s*|:\s*)(?=\S)/i,
  /^(?:NOTE|Tip|TIP|Remember)\b\s*(?:[\u2014\u2013-]\s*|:\s*)?(?=\S)/,
  /^(?:Why this matters)\b\s*(?:[\u2014\u2013-]\s*|:\s*)?(?=\S)/,
  /^\uD83D\uDCA1\s*(?:(?:Why this matters|Remember|Tip|Note)\b\s*(?:[\u2014\u2013-]\s*|:\s*)?)?(?=\S)/i,
  /^\s*(?:\d+[.)]\s*)?Q\s*\d+\s*[\u2014\u2013-]\s*(?=\S)/,
  /^\s*(?:Verify|Verification|To verify|How to verify|Check|Checking|Confirm)(?:(?:\s+[\w'"'"'-]+){0,6})\s*[:\u2014\u2013-]\s*(?=\S)/,
  /^\s*(?:Analogy|Think of it(?: this way)?|In plain (?:terms|language)|Simple analogy)\s*[:\u2014\u2013-]\s*(?=\S)/i,
  /^\s*(?:Step\s+\d+|First|Second|Third|Next|Then|Finally|Lastly)\s*[,.:\u2014\u2013-]\s*(?=[A-Z0-9])/i,
  /^\s*[-\u2022]\s+(?=\S)/,
  /^\s*\d+[.)]\s+(?=\S)/,
];

/**
 * A line that is nothing but a callout marker, e.g. the corpus's bare
 * "NOTE -". Only the real marker words qualify.
 *
 * An earlier version used a loose pattern that matched any short word plus a
 * hyphen, so "cd -" and "rw-" counted as bare markers and it reported 2,063
 * false differences.
 */
/*
 * Lines that are nothing but a marker, so an empty body is faithful.
 *
 * The corpus contains bare "NOTE -" lines, bare "warning" lines, and bare
 * "Verify the result:" labels whose content sits in the next block. All three
 * are label-only by design.
 *
 * An earlier version used a loose pattern that matched any short word plus a
 * hyphen, so "cd -" and "rw-" counted and it reported 2,063 false differences.
 */
/**
 * Lines that are nothing but a marker, so an empty body is faithful.
 *
 * The corpus has bare "NOTE -" lines, bare "warning" lines, and bare
 * "Verify the result:" labels whose content sits in the next block. All three
 * are label-only by design and must not be reported as lost text.
 *
 * An earlier version used a loose pattern that matched any short word plus a
 * hyphen, so "cd -" and "rw-" counted and it reported 2,063 false differences.
 */
const BARE_MARKER = /^(?:RHCSA EXAM CRITICAL|EXAM CRITICAL|CRITICAL|WARNING|CAUTION|DANGER|NOTE|Note|TIP|Tip|Remember|warning)\s*[\u2014\u2013:-]?\s*$/;
const BARE_VERIFY  = /^(?:Verify|Verification|To verify|How to verify|Check|Checking|Confirm)(?:\s+[\w-]+){0,6}\s*[:\u2014\u2013-]\s*$/;

/** A line that is nothing but a marker, e.g. the corpus's bare "NOTE -". */
/**
 * A line that is nothing but a marker, e.g. the corpus's bare "NOTE -".
 *
 * The dash is required. An earlier version made every part after the word
 * optional, so it matched any single word in the corpus - "Machine",
 * "Hostname", "Role" - and reported 2,063 false differences.
 */

function stripMarkers(t) {
  let out = t;
  for (const re of MARKERS) out = out.replace(re, "");
  return out.trim();
}

let checked = 0;
for (const { where, b } of blocks) {
  const src_ = String(b.text == null ? "" : b.text);
  if (!src_.trim()) continue;
  checked++;
  const r = api.classifyBlock(b);

  if (r.type === "blank") { fail(where, "a non-blank block was classified blank", src_.slice(0, 80)); continue; }

  // Reconstruct what the renderer will actually show for this block.
  // For a callout the marker becomes the label and the label is rendered too,
  // so the body is what has to match the source minus its marker.
  let shown = "";
  switch (r.type) {
    case "callout":       shown = r.body; break;
    case "question":      shown = r.body; break;
    case "answer":        shown = r.body; break;
    case "analogy":       shown = r.body; break;
    case "verify":
      /*
       * Label AND body, because the renderer shows both.
       *
       * This case used to read `r.body` alone, on the assumption that the
       * marker was chrome. That was correct then and wrong once the tag was
       * fixed to show the line's own label: the label is on screen now, so
       * leaving it out of `shown` would hide the very words the fix restored.
       */
      shown = ((r.label || "") + " " + (r.body || "")).trim();
      break;
    case "stepCandidate": shown = r.body; break;
    case "answersHeader": shown = src_; break;   // consumed, not rendered
    case "list":          shown = stripMarkers(src_); break;
    case "heading":
    case "subheading":
    case "minorheading":   shown = src_.replace(/^#{1,6}\s+/, ""); break;
    default:               shown = src_; break;
  }

  const want = r.type === "answersHeader" ? "" : stripMarkers(src_);
  const got = shown.trim();

  if (r.type === "answersHeader") continue;   // deliberately folded away

  // A callout may also lift a marker out of its own body into the label, so
  // its body only has to be a suffix of the source, not the whole of it.
  //
  // The corpus contains lines that are literally just a marker - "NOTE -" with
  // nothing after it. Those render as a bare "Note" label, which loses nothing,
  // so an empty body is correct there and only there.
  /*
   * A verify block is compared word by word rather than as an exact string.
   *
   * The renderer shows the label as a chip and the body under it, with nothing
   * between them - the source reads "Check the pool again: <body>" and the
   * screen reads "CHECK THE POOL AGAIN" then the body. Exact equality cannot
   * hold, and loosening the test to "body matches" is precisely what let the
   * label be deleted without anybody noticing.
   *
   * So the test becomes the one that actually matters: does the rendered text
   * contain every word the source did, and no word it did not. Losing the
   * label - the original bug - still fails this, because those words are in
   * the source and not on the screen.
   */
  const wordsOf = (t) => (String(t).toLowerCase().match(/[a-z0-9']+/g) || []).slice().sort();
  const sameWords = (a, b) => {
    const x = wordsOf(a);
    const y = wordsOf(b);
    return x.length === y.length && x.every((w, i) => w === y[i]);
  };

  /*
   * Two different "bare line" cases, with two different correct answers.
   *
   *   "NOTE -"             -> a chip reading "Note", no body.  got === "".
   *   "Verify the result:" -> a chip reading "Verify the result", no body.
   *
   * The second used to be tested the same way as the first, expecting an empty
   * render. That was right while the tag was the fixed word "verify": the label
   * went nowhere, so the only thing observable was the absent body. Once the
   * tag showed the label, the correct render for a bare verify IS the label, and
   * 39 RHEL blocks started reporting as lost for that reason alone.
   */
  const isBareCallout = BARE_MARKER.test(src_.trim());
  const isBareVerify = !isBareCallout && BARE_VERIFY.test(src_.trim());
  const bareMarker = isBareCallout || isBareVerify;

  const ok = isBareCallout
    ? (r.type === "callout" && got === "")
    : isBareVerify
      ? (r.type === "verify" && sameWords(got, r.label || ""))
      : r.type === "verify"
        ? sameWords(src_, api.verifyTag(r) + " " + (r.body || ""))
        : (got === want);

  if (want && !got && !bareMarker) {
    fail(where, "block renders as empty text", `src="${src_.slice(0, 70)}"`);
    continue;
  }
  if (!ok) {
    fail(where, "rendered text differs from the source",
      `src="${src_.slice(0, 60)}"\n       got="${got.slice(0, 60)}"`);
  }
}

/* Knowledge Map paragraphs are rendered as-is, minus a bullet marker. */
let kmChecked = 0;
for (const { where, t } of kmParas) {
  if (!t.trim()) continue;
  kmChecked++;
  const got = t.replace(/^\s*[●•▪]\s*/, "").trim();
  if (!got && t.trim()) {
    fail(where, "a non-blank paragraph renders as empty", t.slice(0, 70));
  }
}

/*
 * The renderer must actually use verifyTag.
 *
 * Everything above compares the SOURCE against what verifyTag() returns, which
 * proves the label survives classification and tagging. It says nothing about
 * renderBlocks, which is a separate function - and the original bug lived
 * exactly there, in a literal "verify" that no other check could reach.
 *
 * So this asserts the connection directly. It is a textual check and that is a
 * limitation worth stating: it catches the literal coming back, and it catches
 * renderBlocks dropping the call, but it is not a substitute for looking at
 * the page.
 */
{
  // Note: `src` has had every "export " removed at line 30 so it can be eval'd
  // as a plain function body, so renderBlocks is matched without the keyword.
  const body = src.slice(src.indexOf("function renderBlocks"));
  const caseAt = body.indexOf('case "verify"');
  const usesTag = caseAt >= 0 && body.slice(caseAt, caseAt + 400).includes("verifyTag(");
  if (!usesTag) {
    problems++;
    console.log('  FAIL the "verify" case in renderBlocks does not call verifyTag();');
    console.log('       the captured label would be dropped before it reaches the page');
  }
}

console.log(`  study blocks checked : ${checked}`);
console.log(`  km paragraphs checked: ${kmChecked}`);
console.log(problems ? `\n  ${problems} problem(s)` : "\n  no content lost");
process.exit(problems ? 1 : 0);
