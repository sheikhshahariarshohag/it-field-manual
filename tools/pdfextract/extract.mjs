#!/usr/bin/env node
/**
 * pdfextract — dev-only research tool.
 *
 * Extracts per-page text from PDFs into plain .txt so the field-manual build can
 * search, quote and cross-check the private book library without ever shipping
 * or copying copyrighted text into the public site.
 *
 * Usage:
 *   node extract.mjs <file.pdf>                 -> <file>.txt next to it
 *   node extract.mjs <file.pdf> -o out.txt
 *   node extract.mjs --probe <file.pdf>         -> metadata only, writes nothing
 *   node extract.mjs --batch <dir> <outdir>    -> extract every PDF in <dir>
 *
 * Exit codes: 0 ok, 1 usage/IO error, 2 unreadable/encrypted, 3 image-only (scan).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, basename, extname, resolve } from "node:path";

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

const args = process.argv.slice(2);

function parseArgs(argv) {
  const opts = { probe: false, batch: false, out: null };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--probe") opts.probe = true;
    else if (a === "--batch") opts.batch = true;
    else if (a === "-o") opts.out = argv[++i];
    else pos.push(a);
  }
  return { opts, pos };
}

async function loadDoc(file) {
  const bytes = new Uint8Array(readFileSync(file));
  return pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
}

/** Reconstruct reading-order text for one pdf.js text item, honouring font size. */
function itemText(it) {
  // pdf.js has already applied unicode mapping; `str` is the usable text.
  return typeof it.str === "string" ? it.str : "";
}

async function extractOne(file, outPath) {
  let doc;
  try {
    doc = await loadDoc(file);
  } catch (err) {
    return { ok: false, reason: "unreadable", error: String(err && err.message ? err.message : err) };
  }

  const pages = [];
  let charTotal = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let line = "";
    let lastY = null;
    const out = [];
    for (const it of content.items) {
      if (!("str" in it)) continue;
      const y = it.transform && it.transform[5];
      const t = itemText(it);
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
        out.push(line);
        line = "";
      }
      line += t;
      if (it.hasEOL) {
        out.push(line);
        line = "";
      }
      lastY = y;
    }
    if (line) out.push(line);
    const text = out.join("\n").replace(/[ \t]+$/gm, "");
    charTotal += text.replace(/\s/g, "").length;
    pages.push(text);
    page.cleanup();
  }

  const meta = await doc.getMetadata().catch(() => null);
  const info = meta && meta.info ? meta.info : {};
  const out = {
    file,
    pages: doc.numPages,
    chars: charTotal,
    title: (info.Title || "").trim(),
    author: (info.Author || "").trim(),
    creator: (info.Creator || "").trim(),
    producer: (info.Producer || "").trim(),
    creationDate: (info.CreationDate || "").trim(),
    scanned: charTotal < doc.numPages * 40,
    text: pages,
  };
  await doc.destroy();

  if (!outPath) return { ok: true, doc: out, written: null };

  writeFileSync(
    outPath,
    `<!-- source: ${file}\npages: ${out.pages}\nchars: ${out.chars}\nscanned: ${out.scanned}\n-->\n` +
      out.text.map((t, i) => `\n===== PAGE ${i + 1} =====\n${t}`).join("\n"),
    "utf8",
  );
  return { ok: true, doc: out, written: outPath };
}

function summary(d) {
  return {
    file: d.file,
    pages: d.pages,
    chars: d.chars,
    scanned: d.scanned,
    title: d.title || null,
    author: d.author || null,
    producer: d.producer || null,
  };
}

const { opts, pos } = parseArgs(args);

try {
  if (opts.batch) {
    const [dir, outdir] = pos;
    if (!dir || !outdir) throw new Error("usage: --batch <dir> <outdir>");
    mkdirSync(outdir, { recursive: true });
    const pdfs = readdirSync(dir).filter((f) => extname(f).toLowerCase() === ".pdf");
    const report = [];
    for (const f of pdfs) {
      const src = join(dir, f);
      if (!statSync(src).isFile()) continue;
      const dst = join(outdir, basename(f, ".pdf") + ".txt");
      try {
        const r = await extractOne(src, dst);
        report.push(r.ok ? summary(r.doc) : { file: src, ...r });
      } catch (e) {
        report.push({ file: src, ok: false, reason: "error", error: String(e && e.message ? e.message : e) });
      }
    }
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  const file = pos[0];
  if (!file) throw new Error("usage: extract.mjs <file.pdf> [-o out.txt] | --probe <file.pdf>");
  const r = await extractOne(resolve(file), opts.out || (opts.probe ? null : resolve(file.replace(/\.pdf$/i, "") + ".txt")));
  if (!r.ok) {
    console.error(JSON.stringify({ file, ...r }));
    process.exit(r.reason === "unreadable" ? 2 : 1);
  }
  if (opts.probe) console.log(JSON.stringify(summary(r.doc), null, 2));
  else console.log(JSON.stringify({ ...summary(r.doc), written: r.written }, null, 2));
  process.exit(0);
} catch (err) {
  console.error("ERROR:", err && err.message ? err.message : err);
  process.exit(1);
}