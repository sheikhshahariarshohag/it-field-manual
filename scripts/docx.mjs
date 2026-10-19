/**
 * docx.mjs — read a .docx into an ordered list of blocks.
 *
 *   import { readDocx } from "./docx.mjs";
 *   const doc = await readDocx("path/to/file.docx");
 *   doc.blocks  // [{ kind: "heading"|"para"|"list"|"table", ... }]
 *   doc.title
 *
 * WHY THIS EXISTS
 * Everything in docs/data/ is JSON, and nothing in this project could read a
 * .docx before. `build-rh134-docx.mjs` goes the other way - plain text in,
 * .docx out - so there was no reader to borrow.
 *
 * A .docx is a zip. Rather than take a dependency on a package that would have
 * to be vendored into a zero-dependency, offline-first app, this reads the zip
 * through Node's own zlib and the central directory that `unzip -p` prints.
 *
 * PERFORMANCE NOTE, because the first attempt did not finish
 * Scanning for each paragraph's closing tag character by character is O(n^2) on
 * a 480KB document.xml, and it did not complete in ten minutes. Everything
 * here is a single non-greedy pass with a sort afterwards: O(n log n), about
 * 200ms for a chapter this size.
 *
 * WHAT IT DOES NOT DO
 * It does not resolve images, numbering definitions or styles beyond the name,
 * and it does not try to reconstruct what a list item "means". It reports the
 * structure as authored.
 */

import { execFileSync } from "node:child_process";

const XML_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
};

/** Decode the five XML entities plus numeric ones. Not a general XML parser. */
export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, n) => XML_ENTITIES[n]);
}

/** Strip tags and decode, collapsing whitespace. */
export function textOf(xml) {
  return decodeEntities(xml.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/**
 * Pull one member out of a .docx.
 *
 * Uses `unzip -p` rather than a zip library: it is present on every machine
 * this has been developed on, and it keeps the dependency count at zero, which
 * is the point of the app.
 */
function zipMember(file, member) {
  try {
    return execFileSync("unzip", ["-p", file, member], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
  } catch (err) {
    // unzip is absent on some Windows installs. PowerShell is the fallback,
    // and it is present wherever this app is developed.
    if (err && err.code === "ENOENT") return zipMemberViaPowerShell(file, member);
    throw new Error(`could not read ${member} from ${file}: ${err.message}`);
  }
}

function zipMemberViaPowerShell(file, member) {
  const esc = String(file).replace(/'/g, "''");
  const mem = String(member).replace(/'/g, "''");
  const ps =
    `Add-Type -AssemblyName System.IO.Compression.FileSystem;` +
    `$z=[IO.Compression.ZipFile]::OpenRead('${esc}');` +
    `$e=$z.Entries|Where-Object{$_.FullName -eq '${mem}'};` +
    `if($e){$s=New-Object IO.StreamReader($e.Open());$x=$s.ReadToEnd();$s.Close()};` +
    `$z.Dispose();$x`;
  return execFileSync(
    "powershell",
    ["-NoProfile", "-Command", ps],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
}

const HEADING_RE = /^Heading(\d)$/;

/**
 * Parse a .docx into ordered blocks.
 *
 * Block shapes:
 *   heading  { kind, level, text }
 *   para     { kind, text, style }
 *   list     { kind, items: string[] }        one run of consecutive list items
 *   table    { kind, head: string[], rows: string[][] }
 */
export function parseDocxXml(xml) {
  const body = (xml.match(/<w:body>[\s\S]*<\/w:body>/) || [xml])[0];

  // One pass for each element type, then merge by position. Non-greedy so the
  // cost is linear in the document size.
  const found = [];

  // Tables first, so their byte ranges are known before paragraphs are tested
  // against them.
  const tableRanges = [];
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)) {
    found.push({ at: m.index, end: m.index + m[0].length, xml: m[0], tag: "tbl" });
    tableRanges.push([m.index, m.index + m[0].length]);
  }
  for (const m of body.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
    // A paragraph inside a table cell is part of that table's cell text. It is
    // NOT also a standalone paragraph.
    //
    // Emitting both duplicated every table in the corpus: the Exam Essentials
    // table in CC01 came through as a 14-row table AND fourteen paragraphs
    // reading "Topic", "Remember", "Switch vs router"... which would have
    // written the same content into the JSON twice.
    if (tableRanges.some(([a, b]) => m.index >= a && m.index < b)) continue;
    found.push({ at: m.index, end: m.index + m[0].length, xml: m[0], tag: "p" });
  }
  found.sort((a, b) => a.at - b.at);

  const blocks = [];
  for (const node of found) {
    if (node.tag === "tbl") {
      const rows = [];
      for (const tr of node.xml.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)) {
        const cells = [...tr[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)]
          .map((tc) => textOf(tc[0]));
        if (cells.some((c) => c !== "")) rows.push(cells);
      }
      if (rows.length) {
        // A single-column table is a layout box, not data. Word emits these
        // constantly for callouts and they are not worth carrying into JSON.
        const width = Math.max(...rows.map((r) => r.length));
        if (width > 1) {
          blocks.push({ kind: "table", head: rows[0], rows: rows.slice(1) });
          continue;
        }
      }
      // Fall through: treat a one-column table as its paragraphs.
      for (const p of node.xml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
        const t = textOf(p[0]);
        if (t) blocks.push({ kind: "para", text: t, style: "" });
      }
      continue;
    }

    const p = node.xml;
    const style = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
    const numPr = /<w:numPr>/.test(p);
    const text = textOf(p);
    if (!text) continue;

    const h = HEADING_RE.exec(style);
    if (h) {
      blocks.push({ kind: "heading", level: Number(h[1]), text });
      continue;
    }
    if (/Title/i.test(style)) {
      blocks.push({ kind: "heading", level: 1, text });
      continue;
    }
    if (numPr || /ListParagraph/i.test(style)) {
      const last = blocks[blocks.length - 1];
      if (last && last.kind === "list") last.items.push(text);
      else blocks.push({ kind: "list", items: [text] });
      continue;
    }
    blocks.push({ kind: "para", text, style });
  }

  // Merge adjacent single-item lists so a 40-bullet run is one block.
  const merged = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (b.kind === "list" && last && last.kind === "list") last.items.push(...b.items);
    else merged.push(b);
  }
  return merged;
}

/** Read and parse a .docx, with its core properties when it has them. */
export function readDocx(file) {
  const xml = zipMember(file, "word/document.xml");
  let core = {};
  try {
    const cx = zipMember(file, "docProps/core.xml");
    const pick = (tag) => {
      const m = cx.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decodeEntities(m[1]).trim() : "";
    };
    core = {
      title: pick("dc:title"),
      creator: pick("dc:creator"),
      created: pick("dcterms:created"),
    };
  } catch (_) { /* core properties are optional */ }

  return { file, core, blocks: parseDocxXml(xml) };
}
/* ==========================================================================
   FORMAT-PRESERVING PARSE
   ==========================================================================

   parseDocxXml above throws the formatting away and returns `{level, text}`.
   That is right for the study-manual renderer and wrong for "show the document
   as it is": these .docx files are heavily formatted and none of it survives.

   Measured across the 40 documents in scope:

     16 distinct run colours, the most common being #FFFFFF - white TEXT
     18 distinct paragraph fills, of which five are dark
     54 shaded paragraphs per chapter forming 35 separate boxes
     1,470 tables

   The dark fills paired with white text is the important one: colour cannot be
   checked per colour, only per (text colour, fill) pair. See
   scripts/check-doc-contrast.mjs.

   BLOCK SHAPES
     heading  { k:"h",  lvl, runs }
     para     { k:"p",  runs, fill? }
     list     { k:"li", runs, fill? }
     table    { k:"tbl", rows: [[{runs, fill?}]], headRow: bool }

   RUN SHAPE
     { t, b?, i?, c? }   b = bold, i = italic, c = #rrggbb
   Absent keys mean "the document did not set it", which is not the same as
   setting it to false, so the renderer can leave the default alone.

   WHY CONSECUTIVE SHADED PARAGRAPHS ARE ONE BOX
   In these documents a note is several paragraphs sharing a fill - "Main
   idea:", "Simple explanation:", "Example:" and so on. Measured in RHEL
   chapter 1: 54 shaded paragraphs forming 35 groups, so 19 of them are
   continuations. Word would draw each paragraph's own border with a gap
   between them; grouping them draws the note as the single box the author
   meant, which is what "as it is" has to mean for a note.
*/

const FILL_SKIP = /^(auto|ffffff)$/i;
const HEADING_STYLE = /^Heading(\d)$/i;

/** Pull the runs out of one <w:p>, keeping bold, italic and colour. */
function runsOf(pXml) {
  const out = [];
  for (const m of pXml.matchAll(/<w:r>([\s\S]*?)<\/w:r>/g)) {
    const body = m[1];
    const rpr = (body.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [""])[0];
    const parts = [...body.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)];
    if (!parts.length) continue;
    const text = decodeEntities(parts.map((x) => x[1]).join(""));
    if (!text) continue;
    const run = { t: text };
    if (/<w:b\/>/.test(rpr) || /<w:b [^>]*\/>/.test(rpr)) run.b = true;
    if (/<w:i\/>/.test(rpr) || /<w:i [^>]*\/>/.test(rpr)) run.i = true;
    const col = (rpr.match(/<w:color w:val="([^"]+)"/) || [])[1];
    if (col && !/^auto$/i.test(col)) run.c = "#" + col.toUpperCase();
    // Character shading - the coloured chip behind a single word, as in the
    // " BOOK " tag. It looks like a background but belongs to the run, and it is
    // a different element from the paragraph fill, so it is carried separately
    // rather than merged into one "fill".
    const shd = (rpr.match(/<w:shd[^>]*w:fill="([^"]+)"/) || [])[1];
    if (shd && !FILL_SKIP.test(shd)) run.sh = "#" + shd.toUpperCase();
    out.push(run);
  }
  return out;
}

/**
 * The paragraph's own background, or null.
 *
 * It must come from `<w:pPr>` and nowhere else.
 *
 * `<w:shd>` also appears inside a RUN's `<w:rPr>`, where it is CHARACTER
 * shading - Word's way of drawing a small coloured tag inside a line of text.
 * The documents use it heavily: a run reading " BOOK " carries
 * `<w:shd w:fill="1F3864"/>`, a white-on-dark-blue chip, in an otherwise
 * unshaded paragraph.
 *
 * Reading the first `<w:shd>` anywhere in the paragraph took that chip and
 * painted the whole paragraph dark. Every following run in it is uncoloured,
 * and an uncoloured run is the document default - black - so the sentence after
 * the tag rendered as black text on dark blue. Measured: 719 of 1014 boxes
 * shaded this way contained at least one uncoloured run, which is not a
 * document with a colour scheme, it is a parser that grabbed the wrong element.
 *
 * A single-column table carries the same pattern, hence the pPr-scoped helper
 * is used for cells too.
 */
function fillOfP(pXml) {
  const ppr = (pXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [""])[0];
  const m = ppr.match(/<w:shd[^>]*w:fill="([^"]+)"/);
  if (!m || FILL_SKIP.test(m[1])) return null;
  return "#" + m[1].toUpperCase();
}

/** Parse a .docx into ordered blocks that keep their formatting. */
export function parseDocxRich(xml) {
  const body = (xml.match(/<w:body>[\s\S]*<\/w:body>/) || [xml])[0];

  const found = [];
  const tableRanges = [];
  for (const m of body.matchAll(/<w:tbl>[\s\S]*?<\/w:tbl>/g)) {
    found.push({ at: m.index, tag: "tbl", xml: m[0] });
    tableRanges.push([m.index, m.index + m[0].length]);
  }
  for (const m of body.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
    // A paragraph inside a table cell belongs to that cell, as established in
    // parseDocxXml. Emitting both wrote every table into the data twice.
    if (tableRanges.some(([a, b]) => m.index >= a && m.index < b)) continue;
    found.push({ at: m.index, tag: "p", xml: m[0] });
  }
  found.sort((a, b) => a.at - b.at);

  const blocks = [];
  for (const node of found) {
    if (node.tag === "tbl") {
      const rows = [];
      for (const tr of node.xml.matchAll(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g)) {
        const cells = [];
        for (const tc of tr[0].matchAll(/<w:tc>([\s\S]*?)<\/w:tc>/g)) {
          const runs = runsOf(tc[1]);
          /*
           * Cell shading, and it must be bounded to the cell properties.
           *
           * The pattern was /<w:tcPr>[\s\S]*?<w:shd.../ with no closing tag, so
           * the lazy match ran straight past </w:tcPr> into the paragraph and
           * picked up the first run's CHARACTER shading. The cell in CC01 that
           * reads "All BOOK content" has a tcPr holding only a width, borders
           * and margins - no fill at all - and was being given the BOOK chip's
           * #1F3864, so its uncoloured black text was reported as black on dark
           * navy at 1.81:1. Same class of mistake as fillOfP, and the same
           * fix: match the whole element, then look inside it.
           */
          const tcPr = (tc[1].match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [""])[0];
          const shd = (tcPr.match(/<w:shd[^>]*w:fill="([^"]+)"/) || [])[1];
          const fill = shd && !FILL_SKIP.test(shd) ? "#" + shd.toUpperCase() : fillOfP(tc[1]);
          if (!runs.length && !fill) continue;
          cells.push(fill ? { runs, fill } : { runs });
        }
        if (cells.length) rows.push(cells);
      }
      if (rows.length) {
        const width = Math.max(...rows.map((r) => r.length));
        while (rows[0].length < width) rows[0].push({ runs: [] });
        for (const r of rows) while (r.length < width) r.push({ runs: [] });
        // A header row is one the document itself set apart - shaded, or every
        // cell bold. Guessing from position alone would mark the first row of
        // a plain two-column reference table as a heading it is not.
        const first = rows[0];
        const shaded = first.every((c) => c.fill);
        const allBold = first.every((c) => c.runs.length && c.runs.every((r) => r.b));
        blocks.push({ k: "tbl", rows, headRow: shaded || allBold });
      }
      continue;
    }

    const p = node.xml;
    const runs = runsOf(p);
    if (!runs.length) continue;
    const fill = fillOfP(p);
    const style = (p.match(/<w:pStyle w:val="([^"]+)"/) || [])[1] || "";
    const h = HEADING_STYLE.exec(style);

    if (h) { blocks.push({ k: "h", lvl: Number(h[1]), runs, ...(fill ? { fill } : {}) }); continue; }
    if (/^Title$/i.test(style)) { blocks.push({ k: "h", lvl: 1, runs, ...(fill ? { fill } : {}) }); continue; }
    if (/<w:numPr>/.test(p) || /ListParagraph/i.test(style)) {
      blocks.push({ k: "li", runs, ...(fill ? { fill } : {}) });
      continue;
    }
    blocks.push({ k: "p", runs, ...(fill ? { fill } : {}) });
  }

  // Group consecutive same-fill paragraphs into one shaded block. See the note
  // at the top of this section.
  const out = [];
  for (const b of blocks) {
    if (b.fill && b.k !== "tbl") {
      const last = out[out.length - 1];
      if (last && last.k === "box" && last.fill === b.fill) { last.paras.push(b); continue; }
      out.push({ k: "box", fill: b.fill, paras: [b] });
      continue;
    }
    out.push(b);
  }
  return out;
}
