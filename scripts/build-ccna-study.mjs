/**
 * build-ccna-study.mjs — turn the 23 CCNA .docx chapters into study units.
 *
 *   node scripts/build-ccna-study.mjs --src <folder with the .docx files>
 *
 * Writes:
 *   docs/data/study/ccna-NN.json      one unit per chapter
 *   docs/data/quizzes/ccna.json       the review questions as real quizzes
 *   and rewrites the ccna entry in docs/data/study-manual.json
 *
 * WHY A BUILDER AND NOT A COPY
 * Everything in docs/data/ is JSON, and nothing could read a .docx before. The
 * documents are well structured - every chapter has the same shape - so the
 * conversion is mechanical, and a builder means the JSON can be regenerated and
 * diffed rather than being a one-off paste that silently drifts from the source.
 *
 * THE CHAPTER SHAPE, AS MEASURED ACROSS ALL 23
 *   H1  Step 0: Pre-check (do this before you read)
 *   H1  N.M <title> (book pp. x-y)        <- the teaching sections
 *     H2  N.M.N <title>
 *       H3 explanatory sub-headings, and "Quick check N.M" with Q, A-D, Answer
 *   H1  Troubleshooting: <topic>
 *   H1  Hands-On Labs                     -> labs[], one per "Lab N.M:"
 *   H1  Review Questions                  -> quizzes, Q + A-D + Answer
 *   H1  Exam Essentials: One-Page Revision Sheet
 *   H1  Changes and Gaps Log (book versus current)   -> currency[]
 *   H1  Self-Assessment and Tracker Update
 *   H1  Answer Key A: Pre-Check
 *   H1  Sources and Verification Status              -> sources[]
 *
 * WHY LABS AND QUIZZES ARE PULLED OUT
 * The brief asks for the topics separated by labs and quizzes. More to the
 * point, they are different THINGS: a lab is something you do with a switch in
 * front of you, a quiz is something you answer from memory. Leaving them as
 * paragraphs inside the reading flow hides both - a learner skims past the lab
 * and never opens the questions.
 *
 * BLOCK ENCODING MATCHES WHAT THE RENDERER EXPECTS
 * renderBlocks in prose.js classifies by TEXT, not by a type field, so the JSON
 * carries the same `{level, text}` shape the RHEL units use:
 *
 *   heading   {level: 1|2|3, text}
 *   paragraph {level: 0, text}
 *   table     a run of {level:0, text:"| a | b |"} with a "|---|---|" separator
 *   list      {level:0, text:"- item"}   prose.js renders the marker as a bullet
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { readDocx } from "./docx.mjs";

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const SRC = argOf("--src", join(process.env.USERPROFILE || ".", "Downloads", "ccna"));
const OUT_DATA = "docs/data";

/**
 * Which chapters serve which exam objective.
 *
 * HONESTY NOTE, and it matters more than the mapping itself.
 * exam-objectives.json holds 16 subtopics, which is a SUBSET of the real
 * 200-301 blueprint - there are more objectives in the official PDF than this
 * file records. So only the chapters whose subject is genuinely covered by one
 * of those 16 are mapped.
 *
 * Chapters left unmapped - subnetting arithmetic, VPN, QoS, wireless - are NOT
 * given a nearest-miss objective to make the number look better. A badge
 * claiming "CCNA 3.4 FHRP" on a VPN chapter would be a false claim on the
 * screen of someone revising for an exam. The objectives page already counts
 * unmapped items and calls them "not yet mapped", which is the truth.
 */
const OBJECTIVES = {
  "CC01": ["CCNA-1.2", "CCNA-1.3"],
  "CC02": ["CCNA-1.2"],
  "CC05": ["CCNA-3.1"],
  "CC06": ["CCNA-3.3"],
  "CC07": ["CCNA-2.3"],
  "CC08": ["CCNA-2.1", "CCNA-2.2"],
  "CC09": ["CCNA-2.3", "CCNA-2.6"],
  "CC10": ["CCNA-4.6"],
  "CC11": ["CCNA-4.3"],
  "CC12": ["CCNA-4.4"],
  "CC13": ["CCNA-4.7"],
  "CC14": ["CCNA-3.4"],
  "CC17": ["CCNA-3.2"],
  "CC18": ["CCNA-3.2"],
  "CC21": ["CCNA-5.4"],
  "CC22": ["CCNA-5.4"],
  "CC23": ["CCNA-4.2", "CCNA-5.4"],
};

/* ------------------------------------------------------------- utilities */

const wc = (s) => (String(s).match(/\S+/g) || []).length;
const wordsOf = (content) =>
  content.reduce((n, b) => n + wc(b.text), 0);

/** Escape a cell so a pipe inside it cannot break the row apart. */
const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/**
 * A table becomes the pipe-row run the renderer recognises.
 *
 * The width is the WIDEST row, not the header's.
 *
 * It used to be the header's width, and rows with an extra cell had that cell
 * dropped. Measured: the Exam Essentials table in CC07 is declared as two
 * columns but several rows carry three, and every third cell went missing -
 * silently, because the output was still a well-formed table with fewer
 * columns. Word count fell about 10% across the corpus and the integrity gate
 * was the only thing that noticed.
 */
function tableToBlocks(t) {
  const width = Math.max(t.head.length, ...t.rows.map((r) => r.length));
  const out = [{ level: 0, text: `| ${t.head.map(cell).join(" | ")} |` }];
  out.push({ level: 0, text: `|${" --- |".repeat(width)}` });
  for (const row of t.rows) {
    const cells = [];
    for (let i = 0; i < width; i++) cells.push(cell(row[i] == null ? "" : row[i]));
    out.push({ level: 0, text: `| ${cells.join(" | ")} |` });
  }
  return out;
}

/* ------------------------------------------------------- chapter parsing */

/** The H1 titles that are NOT teaching sections. */
const PART_PATTERNS = [
  [/^hands-on labs/i, "labs"],
  [/^review questions/i, "review"],
  [/^changes and gaps log/i, "gaps"],
  [/^sources and verification/i, "sources"],
  [/^exam essentials/i, "section"],
  [/^self-assessment/i, "section"],
  [/^answer key/i, "section"],
];

const Q_RE = /^Q\s*\d+\s*[.:]/;
const OPT_RE = /^[A-D]\s*[.)]\s+/;
const ANSWER_RE = /^Answer\s*:/i;

/**
 * Pull the review questions out of a flat block run.
 *
 * Every chapter's questions are authored the same way: a stem, options A-D,
 * and an "Answer: C - why". Measured across all 23: no question is left without
 * an answer, which is why this produces real quizzes rather than a list of
 * unanswered stems.
 */
function parseQuestions(blocks) {
  const questions = [];
  let cur = null;
  for (const b of blocks) {
    const text = String(b.text || "").trim();
    if (!text) continue;
    if (Q_RE.test(text)) {
      if (cur) questions.push(cur);
      const num = (text.match(/^Q\s*\d+/i) || [])[0] || "";
      cur = {
        // The original line, verbatim, including its "Q15." prefix. The
        // renderer numbers questions from 1, so the stored stem cannot carry
        // it - but keeping the line as authored is what makes it possible to
        // match a question in the app back to the list in the document.
        source: text,
        sourceNumber: num,
        q: text.replace(/^Q\s*\d+\s*[.:]\s*/, ""),
        options: [],
        answer: null,
        why: "",
      };
      continue;
    }
    if (!cur) continue;
    if (OPT_RE.test(text)) {
      const m = text.match(/^([A-D])\s*[.)]\s+(.*)$/);
      cur.options.push(m[2]);
      continue;
    }
    if (ANSWER_RE.test(text)) {
      const m = text.match(/^Answer\s*:\s*([A-D])/i);
      const body = text.replace(/^Answer\s*:\s*/i, "").replace(/^[A-D]\s*[-–—:]?\s*/, "").trim();
      if (m) cur.answer = m[1].toUpperCase();
      // The text after "Answer:" is kept whether or not a letter follows.
      //
      // It was only read inside `if (m)`, so an open question - "Answer:
      // Application-layer (Layer 7) content..." with no A/B/C/D - kept its
      // letter-less answer nowhere. 705 of the 864 open questions came through
      // with an empty `why`, which is most of them.
      if (body) cur.why = body;
      continue;
    }
  }
  if (cur) questions.push(cur);
  /*
   * EVERY question is kept, not only the ones with A-D options.
   *
   * The filter used to be `options.length >= 2 && answer`, which threw away
   * every open question - the ones with a stem and a written answer and no
   * options. Measured in CC01 alone: Q17, Q18, Q19, Q21 and Q22, five of eight.
   * The question and its answer are content; not being multiple choice is a
   * format, not a reason to delete them.
   *
   * They are tagged so the quiz builder can use only the gradeable ones.
   */
  return questions
    .filter((q) => q.q)
    .map((q) => ({ ...q, kind: q.options.length >= 2 && q.answer ? "multiple-choice" : "open" }));
}

/**
 * Find a table in a block run, given the pipe encoding.
 *
 * Tables arrive here already flattened to `| a | b |` rows by the collector,
 * so anything looking for a `kind: "table"` block finds nothing.
 *
 * It returns EVERY pipe run, not the first one.
 *
 * The first version returned the first run it met. In the "Changes and Gaps
 * Log" part that is usually not the gaps table: the part opens with prose, and
 * a smaller table often appears before the real one. Taking that instead meant
 * the gaps log came out empty or half-built while the actual table was thrown
 * away - which is most of what was still "lost".
 *
 * A run is a table only if it has a `|---|---|` separator, the same rule
 * prose.js uses to make the same decision at render time.
 */
function pipeTables(blocks) {
  const tables = [];
  let rows = [];
  let sawSeparator = false;

  const close = () => {
    if (rows.length >= 2 && sawSeparator) tables.push({ head: rows[0], rows: rows.slice(1) });
    rows = [];
    sawSeparator = false;
  };

  for (const b of blocks) {
    const t = String(b.text || "").trim();
    if (!/^\|/.test(t)) { close(); continue; }
    if (/^\|[\s:|-]+\|$/.test(t)) { sawSeparator = true; continue; }
    rows.push(t.replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((s) => s.replace(/\\\|/g, "|").trim()));
  }
  close();
  return tables;
}

/** Pick the table whose header matches the given words, else the largest. */
function pickTable(blocks, signature) {
  const tables = pipeTables(blocks);
  if (!tables.length) return null;
  const match = tables.find((t) => {
    const head = t.head.join(" ").toLowerCase();
    return signature.every((w) => head.includes(w));
  });
  return match || tables.reduce((a, b) => (b.rows.length > a.rows.length ? b : a));
}

/**
 * The blocks in a run that no question claimed.
 *
 * parseQuestions consumes question stems, option lines and answer lines. This
 * returns everything else - the instruction paragraph that opens a review
 * section, and the tail of any question that ran across two paragraphs.
 */
function leftovers(content, questions) {
  const claimed = new Set();
  for (const q of questions) {
    claimed.add(q.q);
    for (const o of q.options) claimed.add(o);
    if (q.why) claimed.add(q.why);
  }
  const out = [];
  for (const b of content) {
    const t = String(b.text || "").trim();
    if (!t || b.level > 0) continue;
    if (/^Q\s*\d+\s*[.:]/.test(t)) continue;
    if (/^[A-D]\s*[.)]\s+/.test(t)) continue;
    if (/^Answer\s*:/i.test(t)) continue;
    // A line that is only the tail of a question - "whose table lists it, and
    // which port should it go out of?" - is worth keeping even though the
    // parser could not pair it.
    out.push(t);
  }
  return out;
}

/** The "Changes and Gaps Log" table, as the currency records the app shows. */
function parseGaps(blocks) {
  const tbl = pickTable(blocks, ["book", "verification"]);
  const out = [];
  if (!tbl) return out;
  for (const row of tbl.rows) {
    const [n, book, what, verification] = row;
    if (!what) continue;
    out.push({
      severity: /\boutdated|no longer|superseded|retired|deprecated|replaced\b/i.test(
        `${book} ${what}`,
      ) ? "high" : "normal",
      title: `Gap ${n || ""}`.trim(),
      found: String(book || "").trim(),
      current: String(what || "").trim(),
      action: "",
      source: String(verification || "").trim(),
      verified: "",
    });
  }
  return out;
}

/** The "Sources and Verification Status" table. */
function parseSources(blocks) {
  const tbl = pickTable(blocks, ["source", "status"]);
  if (!tbl) return [];
  return tbl.rows
    .map((r) => ({ source: r[0] || "", usedFor: r[1] || "", status: r[2] || "" }))
    .filter((r) => r.source);
}

/*
 * The reading form of a quiz: the same questions as plain text blocks.
 *
 * studyUnitView renders a chapter's `quizzes` the same way it renders labs -
 * `renderBlocks(l.content)` - so a quiz entry without `content` became a
 * chapter with a title and nothing under it. The 23 CCNA quizzes were, on the
 * first run, 23 empty chapters.
 *
 * The questions stay in `questions` too, because that is what
 * docs/data/quizzes/ccna.json and the grading engine consume. Both forms are
 * built from the same source lines, so they cannot disagree.
 */
function quizAsContent(questions) {
  const out = [];
  for (const q of questions) {
    out.push({ level: 0, text: `${q.sourceNumber ? q.sourceNumber + " " : ""}${q.q}` });
    for (let i = 0; i < q.options.length; i++) {
      out.push({ level: 0, text: `${"ABCD"[i]}. ${q.options[i]}` });
    }
    if (q.answer) {
      out.push({ level: 0, text: `Answer: ${q.answer}${q.why ? " - " + q.why : ""}` });
    } else if (q.why) {
      out.push({ level: 0, text: `Answer: ${q.why}` });
    }
  }
  return out;
}

/**
 * Turn one document into a unit.
 *
 * Walks the blocks once, switching on the H1 that is in scope. Everything
 * between two H1s is that H1's content.
 */
function buildUnit(doc, n, fileCode) {
  const title = (doc.core.title || "").replace(/^Chapter\s+\d+\s*[-–—]\s*/, "").trim();
  const blocks = doc.blocks;

  const sections = [];
  const labs = [];
  const quizzes = [];
  let currency = [];
  let sources = [];
  const allQuestions = [];
  const preamble = [];
  // Prose inside the non-teaching parts, kept rather than discarded.
  const reviewNotes = [];
  const gapsNotes = [];
  const sourceNotes = [];
  // Part markers - "Hands-On Labs", "Review Questions" - are headings the
  // reader should see, so they are kept rather than used and discarded.
  const markers = [];

  let mode = "section";
  let title_ = "";
  let buf = [];
  const frontMatter = [];
  /*
   * Tracks the first H1, not the first heading of any level.
   *
   * It tracked any heading, and that was wrong. CC01 opens with two H3s - "How
   * to read the tags" and "Where this chapter fits in the exam" - before its
   * first H1. Those set the flag, so by the time the first H1 called flush(),
   * the flag was already set and the guard fell through to the section-less
   * branch, which discarded the buffer: the title block, the metadata table
   * and both preambles, about 780 words, gone.
   *
   * The thing that matters here is whether a SECTION has been opened, and only
   * an H1 opens one.
   */
  let seenH1 = false;

  const flush = () => {
    const content = buf.filter((b) => b.text !== undefined);

    // Before the first H1 there is no section to attach anything to. Keep it as
    // front matter rather than dropping it on the floor.
    if (!seenH1) {
      frontMatter.push(...content);
      buf = [];
      return;
    }

    // Only a teaching section needs a title. The part modes - labs, review
    // questions, the gaps log, sources - are opened by an H1 that has no
    // section title of its own, because it is a marker rather than a heading
    // you read.
    //
    // The original guard was `if (!title_) return`, which dropped every one of
    // them: all 23 chapters produced 0 labs, and the lab prose - which is a
    // large part of these documents - was silently discarded rather than
    // failing loudly.
    if (mode === "section" && !title_) { buf = []; return; }
    if (!content.length) { buf = []; return; }

    if (mode === "labs") {
      // Each "Lab N.M: ..." heading starts a new lab.
      for (const b of content) {
        if (b.level === 2 && /^Lab\s/i.test(b.text)) {
          const full = b.text.replace(/^Lab\s*([\d.]+)\s*:\s*/i, "");
          labs.push({
            // The full title is kept, including "(paper, 10 minutes)" and
            // "(Packet Tracer, 15 minutes)". Stripping the numbering was
            // convenient and lossy: it took "Packet Tracer" with it, which is
            // the part that tells a reader which tool the lab needs.
            number: (b.text.match(/^Lab\s*([\d.]+)/i) || [])[1] || "",
            title: full,
            content: [],
          });
          continue;
        }
        const lab = labs[labs.length - 1];
        if (!lab) {
          // Whatever comes before the first "Lab N.M" heading is the preamble -
          // "Before you start. I cannot run a Cisco simulator for you..." - and
          // it has no lab to belong to. It was being dropped, because the
          // `if (!lab) continue` guard had nothing to attach it to and the
          // paragraph is the most important sentence in the section: it says
          // the labs cannot be run for you.
          if (b.level === 0 || b.level === 1) preamble.push(b);
          continue;
        }
        if (b.level === 0 && /what the book says/i.test(b.text)) {
          lab.content.push({ level: 0, text: "**What the book says**" });
          continue;
        }
        lab.content.push({ level: b.level, text: b.text });
      }
    } else if (mode === "review") {
      const qs = parseQuestions(content);
      allQuestions.push(...qs);
      // Whatever the question parser did not recognise is kept.
      //
      // parseQuestions returns questions; it silently ignores everything else in
      // the run. That includes "These 22 questions are original. Also do the
      // book's own 10 review questions (page 216, Appendix B)..." - the
      // instruction telling the reader to finish a set the app does not carry -
      // and any question written across two paragraphs, where the second
      // paragraph is not an option and not an answer and so vanished.
      reviewNotes.push(...leftovers(content, qs));
    } else if (mode === "gaps") {
      currency = parseGaps(content.filter((b) => b.kind !== "heading"));
      gapsNotes.push(...leftovers(content, currency.length ? [] : []));
    } else if (mode === "sources") {
      sources = parseSources(content.filter((b) => b.kind !== "heading"));
      // "Nothing in this document was run on real Cisco hardware or in Packet
      // Tracer." is a sentence, not a table row, and it is the most important
      // sentence in the part - it is the honest limit on everything else.
      sourceNotes.push(...content
        .filter((b) => b.level === 0 && !/^\|/.test(String(b.text || "").trim()))
        .map((b) => b.text));
    } else {
      // A teaching section. The quick checks stay in the body AND their
      // questions are lifted into the chapter's quiz.
      //
      // The heading used to be dropped on the way past - it was needed only to
      // group the questions, so it was consumed and discarded. That loses the
      // reader's cue that a question block follows, and it loses the word
      // "Quick" from the chapter, which is what the integrity gate caught.
      const body = [];
      const quick = [];
      let head = null;
      let acc = [];
      for (const b of content) {
        if (b.level === 3 && /^Quick check/i.test(b.text)) {
          if (head) quick.push(...parseQuestions(acc));
          head = b.text;
          acc = [];
          body.push({ level: b.level, text: b.text });
          continue;
        }
        if (head) acc.push(b);
        body.push({ level: b.level, text: b.text });
      }
      if (head) quick.push(...parseQuestions(acc));
      allQuestions.push(...quick);

      sections.push({ title: title_, content: body, words: wordsOf(body) });
    }
    buf = [];
  };

  for (const b of blocks) {
    if (b.kind === "table") {
      /*
       * A table becomes its pipe-row run HERE, at the point it is collected,
       * not later.
       *
       * It used to be pushed onto the buffer whole, carrying `head` and `rows`
       * and no `text`. Two lines further down, flush() does
       * `buf.filter((b) => b.text !== undefined)` - which exists to throw away
       * empty blocks - and that quietly threw away every table in the document.
       *
       * Measured on CC01: 19 tables, about 2,800 words, gone. The JSON was
       * valid, the unit rendered, nothing was logged. Only
       * scripts/check-ccna-content.mjs comparing the .docx against the output
       * caught it.
       */
      for (const row of tableToBlocks(b)) buf.push(row);
      continue;
    }
    if (b.kind === "list") {
      for (const item of b.items) buf.push({ level: 0, text: `- ${item}` });
      continue;
    }
    if (b.kind === "heading") {
      if (b.level === 1) {
        /*
         * flush() runs BEFORE seenH1 is set, deliberately.
         *
         * With the two lines the other way round, the flag was already true by
         * the time the front matter was flushed, so it was never recognised as
         * front matter and was discarded with the section-less guard instead.
         * That is the third silent loss in this converter, and the same shape
         * each time: content dropped, valid JSON produced, nothing logged.
         */
        flush();
        seenH1 = true;
        const t = b.text;
        const hit = PART_PATTERNS.find(([re]) => re.test(t));
        if (hit) {
          mode = hit[1];
          /*
           * A part that maps back to "section" KEEPS its heading as the title.
           *
           * "Exam Essentials", "Self-Assessment" and "Answer Key" are matched by
           * PART_PATTERNS because they need no special parsing - they are just
           * sections. But the assignment below cleared title_ for every match,
           * so those three landed in mode "section" with an empty title, and
           * flush()'s "a section needs a title" guard discarded them whole.
           *
           * Measured in CC07: the Exam Essentials revision table and the entire
           * Self-Assessment tracker - the two most useful pages in the chapter -
           * were absent from the JSON, and the unit still rendered perfectly.
           */
          if (mode !== "section") title_ = "";
          else title_ = t;
          markers.push(t);
        } else {
          mode = "section";
          title_ = t.replace(/\s*\(book pp?\.?[^)]*\)\s*$/i, "")
                   .replace(/,\s*book p\.?\s*\d+\s*$/i, "")
                   .trim();
        }
        continue;
      }
      buf.push({ level: b.level, text: b.text });
      continue;
    }
    buf.push({ level: 0, text: b.text });
  }
  flush();

  // A chapter with no numbered sections still has content; keep it in one.
  if (!sections.length && buf.length) {
    sections.push({ title: title || "Overview", content: [], words: 0 });
  }

  /*
   * Whatever came BEFORE the first H1 is the chapter's own front matter: the
   * title block and a table of Book pages, Tracker rows, Suggested time, Exam
   * versions and Status of your knowledge.
   *
   * That is real content and it was being thrown away, because no H1 had opened
   * a section yet and flush() had nothing to attach it to. It is not worthless
   * metadata either - "Exam versions" says which syllabus the chapter was
   * written against and when it is retired, which is exactly the kind of thing
   * this app refuses to silently drop.
   *
   * It becomes the first section, so a reader meets it before the teaching.
   */
  if (frontMatter.length) {
    sections.unshift({
      title: "About this chapter",
      content: frontMatter,
      words: wordsOf(frontMatter),
    });
  }

  /*
   * The labs preamble becomes a lab of its own.
   *
   * "Before you start. I cannot run a Cisco simulator for you. These labs are
   * written for Cisco Packet Tracer (or GNS3, or CML)..." is the sentence that
   * stops a reader wasting an evening looking for a simulator the document
   * cannot provide. It sits before the first "Lab N.M" heading, so it has no
   * lab to belong to and was being dropped.
   */
  if (preamble.length) {
    labs.unshift({
      number: "",
      title: "Before you start",
      content: preamble,
    });
  }

  const bodyWords = sections.reduce((n, s) => n + s.words, 0);
  const quizQuestions = allQuestions;
  const mcq = quizQuestions.filter((q) => q.kind === "multiple-choice");
  const open = quizQuestions.filter((q) => q.kind === "open");

  /*
   * EVERY word the source carried has to end up somewhere, so the unit records
   * where each part went rather than one figure that hides the split.
   *
   *   sections    the teaching text
   *   labs        Hands-On Labs
   *   quizzes     the review questions and quick checks
   *   currency    the Changes and Gaps Log
   *   sources     the verification table
   *
   * `words` stays the reading figure the rest of the app compares units by -
   * it is what a reader sits down with. `totalWords` is the whole chapter and is
   * what scripts/check-ccna-content.mjs reconciles against the .docx.
   */
  const labWords = labs.reduce((n, l) => n + wc(l.content.map((b) => b.text).join(" ")), 0);
  const quizWords = quizQuestions.reduce(
    (n, q) => n + wc(q.q + " " + q.options.join(" ") + " " + q.why), 0,
  );
  const currencyWords = currency.reduce((n, c) => n + wc(`${c.found} ${c.current} ${c.source}`), 0);
  const sourceWords = sources.reduce((n, s) => n + wc(`${s.source} ${s.usedFor} ${s.status}`), 0);

  const unit = {
    id: `ccna-${String(n).padStart(2, "0")}`,
    n,
    sourceNumber: fileCode,
    kind: "chapter",
    title,
    display: `Chapter ${n}: ${title}`,
    exam: "CCNA 200-301",
    subject: "cisco",
    words: bodyWords,
    sections,
    labs,
    /*
     * Both kinds are kept in the unit. Only the multiple-choice ones go into
     * the standalone quiz file, because that one is handed to the grading quiz
     * engine and an open question has nothing to tick - putting it there
     * would produce a question a reader cannot answer and cannot be marked.
     * The open ones are still on the chapter, in reading order.
     */
    /*
 * No `verification` field, deliberately.
 *
 * The app recognises exactly four levels - source-checked,
 * independently-reviewed, execution-tested, release-approved - and this
 * material has earned none of them. There is no "unchecked" level, and
 * inventing one was the first thing tried: "not-source-checked". It is not a
 * level, validate.mjs rejects it, and because it contains no recognised phrase
 * the badge fell through to the default and displayed "Source-checked" on all
 * 46 items. Omitting the field renders no badge at all, which is the honest
 * outcome: nothing is claimed.
 *
 * The truth is still on the page, in prose. Each chapter's own "Sources and
 * Verification Status" part becomes a section called "How far this has been
 * tested", which is where the document says what it was checked against.
 */
    quizzes: quizQuestions.length
      ? [{ title: `${title} — review questions`, questions: quizQuestions,
           content: quizAsContent(quizQuestions),
           multipleChoice: mcq.length, open: open.length }]
      : [],
    generatedFrom: `${fileCode}.docx`,
  };
  unit.totalWords = bodyWords + labWords + quizWords + currencyWords + sourceWords;
  unit.wordBreakdown = {
    sections: bodyWords, labs: labWords, quizzes: quizWords,
    currency: currencyWords, sources: sourceWords,
  };
  if (currency.length) unit.currency = currency;
  if (sources.length) unit.sources = sources;
  const obj = OBJECTIVES[fileCode];
  if (obj) unit.objectives = obj.map((id) => ({ id }));
  unit.questionCount = quizQuestions.length;
  // The part markers the chapter was divided by. Kept rather than consumed:
  // "Hands-On Labs" and "Review Questions" are the reader's signposts, and
  // dropping them because they were structurally interesting would lose the
  // only indication of where the labs section started.
  if (markers.length) unit.parts = markers;

  // Prose that belongs to a part rather than to a section, kept as its own
  // section so a reader meets it in the right place instead of it vanishing.
  const tail = [];
  if (reviewNotes.length) tail.push({ title: "Before you answer", content: reviewNotes.map((t) => ({ level: 0, text: t })) });
  if (gapsNotes.length) tail.push({ title: "About these gaps", content: gapsNotes.map((t) => ({ level: 0, text: t })) });
  if (sourceNotes.length) tail.push({ title: "How far this has been tested", content: sourceNotes.map((t) => ({ level: 0, text: t })) });
  for (const t of tail) sections.push({ ...t, words: wordsOf(t.content) });

  return unit;
}

/* ------------------------------------------------------------------ main */

function main() {
  if (!existsSync(SRC)) {
    console.error(`  source folder not found: ${SRC}`);
    console.error("  pass it explicitly: node scripts/build-ccna-study.mjs --src <folder>");
    process.exit(1);
  }
  const files = readdirSync(SRC)
    .filter((f) => /^CC\d+_.*\.docx$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!files.length) {
    console.error(`  no CCnn_*.docx files in ${SRC}`);
    process.exit(1);
  }

  const units = [];
  const quizzes = [];
  const provenance = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const code = f.slice(0, 4).toUpperCase();
    const n = Number(code.slice(2));
    const srcPath = join(SRC, f);
    const doc = readDocx(srcPath);
    const unit = buildUnit(doc, n, code);

    /*
     * A record of where this unit came from, so CI can check the JSON without
     * having the .docx.
     *
     * The source documents are the owner's private material and are not in the
     * repository, which means the word-for-word comparison in
     * scripts/check-ccna-content.mjs could only ever run on the machine that
     * did the conversion. This file is what makes the guarantee checkable
     * everywhere: it records the source filename, its SHA-256, and the word
     * and distinct-word counts measured from the source, so a build that
     * silently dropped content is caught by the normal gate.
     */
    const srcText = [];
    for (const b of doc.blocks) {
      if (b.kind === "table") { srcText.push(...b.head); b.rows.forEach((r) => srcText.push(...r)); }
      else if (b.kind === "list") srcText.push(...b.items);
      else srcText.push(b.text);
    }
    const joined = srcText.join(" ");
    provenance.push({
      id: unit.id,
      sourceFile: f,
      sourceSha256: createHash("sha256").update(readFileSync(srcPath)).digest("hex"),
      sourceWords: wc(joined),
      sourceDistinctWords: new Set((joined.toLowerCase().match(/[a-z0-9]+/g) || [])).size,
      unitWords: unit.totalWords,
      sections: unit.sections.length,
      labs: unit.labs.length,
      questions: unit.questionCount,
    });

    writeFileSync(
      join(OUT_DATA, "study", `${unit.id}.json`),
      JSON.stringify(unit, null, 1) + "\n",
    );

    for (const q of unit.quizzes) {
      const gradeable = q.questions.filter((x) => x.kind === "multiple-choice");
      if (!gradeable.length) continue;
      quizzes.push({
        id: `${unit.id}-review`,
        kind: "quiz",
        tech: "cisco",
        exam: "CCNA 200-301",
        title: `${unit.display} — review questions`,
        summary: `${gradeable.length} multiple-choice questions from chapter ${n}, with answers.` +
          (q.open ? ` ${q.open} further open questions are on the chapter page.` : ""),
        tags: ["ccna", `chapter-${n}`],
        objectives: (unit.objectives || []).map((o) => ({ id: o.id })),
        // No `verification` field - see the note in buildUnit. Claiming one of
        // the four levels would be false; inventing a fifth is not allowed.
        questions: gradeable.map((qq) => ({
          q: qq.q,
          options: qq.options,
          /*
           * A 0-based INDEX, because that is what the quiz engine compares
           * against: `q.answer === oi` where `oi` is the option position.
           *
           * The chapter files keep the letter, because "B" is what the source
           * document writes and what a reader checking the JSON against the
           * .docx will look for. Only the standalone quiz, which is handed to
           * the engine, is converted here.
           *
           * Passing the letter through produced 228 "answer index C is out of
           * range" errors - every single multiple-choice question in the
           * corpus, each one rendering with no correct option marked.
           */
          answer: "ABCD".indexOf(qq.answer),
          why: qq.why,
          topic: `Chapter ${n}`,
        })),
      });
    }

    units.push(unit);
    console.log(
      `  ${code}  ${String(unit.title).padEnd(38).slice(0, 38)} ` +
      `${String(unit.words).padStart(6)}w  ${String(unit.sections.length).padStart(3)}sec  ` +
      `${String(unit.labs.length).padStart(3)}lab  ${String(unit.questionCount).padStart(3)}q  ` +
      `${(unit.objectives || []).length ? unit.objectives.map((o) => o.id).join(",") : "-"}`,
    );
  }

  writeFileSync(
    join(OUT_DATA, "quizzes", "ccna.json"),
    JSON.stringify(quizzes, null, 1) + "\n",
  );

  writeFileSync(
    join(OUT_DATA, "study", "ccna-provenance.json"),
    JSON.stringify({
      note:
        "Where each CCNA study unit came from. The .docx sources are the " +
        "owner's private material and are deliberately NOT in this repository, " +
        "so scripts/check-ccna-content.mjs reads this file to verify the " +
        "generated JSON in CI. Re-run the builder with --src <folder> to " +
        "regenerate it; the SHA-256 ties each unit to the exact source it " +
        "was built from.",
      sourceCount: provenance.length,
      chapters: provenance,
    }, null, 1) + "\n",
  );

  /* --- the book entry ------------------------------------------------- */
  const manualPath = join(OUT_DATA, "study-manual.json");
  const manual = JSON.parse(readFileSync(manualPath, "utf8"));
  const entry = {
    id: "ccna",
    slug: "ccna",
    code: "CCNA 200-301",
    title: "CCNA 200-301",
    exam: "CCNA 200-301",
    subject: "cisco",
    blurb:
      "Every chapter of the CCNA 200-301 study manual, with its labs and review " +
      "questions split out. Converted from the source .docx files; not yet checked " +
      "against Cisco's own material.",
    built: new Date().toISOString().slice(0, 10),
    units: units.map((u) => ({
      id: u.id,
      n: u.n,
      sourceNumber: u.sourceNumber,
      kind: u.kind,
      title: u.title,
      display: u.display,
      sections: u.sections.length,
      labs: u.labs.length,
      quizzes: u.quizzes.length ? u.quizzes[0].questions.length : 0,
      words: u.words,
      services: 0,
      hasCurrency: !!(u.currency && u.currency.length),
      objectives: (u.objectives || []).map((o) => o.id),
      sectionTitles: u.sections.map((s) => s.title),
    })),
  };
  manual.books = [entry, ...manual.books.filter((b) => b.id !== "ccna")];
  writeFileSync(manualPath, JSON.stringify(manual, null, 1) + "\n");

  const totalWords = units.reduce((n, u) => n + u.words, 0);
  const totalLabs = units.reduce((n, u) => n + u.labs.length, 0);
  const totalQ = units.reduce((n, u) => n + u.questionCount, 0);
  const mapped = units.filter((u) => u.objectives).length;
  console.log("");
  console.log(`  ${units.length} chapters, ${totalWords.toLocaleString()} words`);
  console.log(`  ${totalLabs} labs, ${totalQ} questions with answers, ${quizzes.length} quiz records`);
  console.log(`  ${mapped}/${units.length} chapters carry an exam objective`);
  console.log(`  wrote ${units.length} unit files, quizzes/ccna.json, and the study-manual entry`);
}

main();