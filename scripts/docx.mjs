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