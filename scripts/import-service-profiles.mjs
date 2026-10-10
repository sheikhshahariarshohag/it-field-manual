#!/usr/bin/env node
/**
 * import-service-profiles.mjs
 *
 * Converts the RHEL 10 service profiles (25-section Markdown) into the
 * manual's lesson JSON.
 *
 * WHY THIS EXISTS
 * The 21 .md files in the IT Infrastucture folder are already written in a
 * strong, consistent 25-section format with risk classification, labs and
 * troubleshooting. Re-typing them by hand would risk transcription errors and
 * drift. Converting mechanically keeps the source of truth in one place.
 *
 * The originals are READ ONLY. Nothing in the source folder is modified,
 * renamed or moved.
 *
 *   node scripts/import-service-profiles.mjs [sourceDir] [--dry-run]
 *
 * Output: app/data/lessons/services.json  (loaded by app.js as an extra file)
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where the author's private RHEL 10 service-profile notes live.
 *
 * Deliberately NOT hardcoded: this repository is public, and a developer's
 * real Windows account name should not be committed to it. Override with an
 * environment variable:
 *
 *   PowerShell:  $env:FIELD_MANUAL_SOURCE = 'C:\path\to\notes'
 *   bash:        FIELD_MANUAL_SOURCE=/path/to/notes node scripts/import-service-profiles.mjs
 *
 * On Windows the notes usually sit in the user's Desktop under a folder named
 * "IT Infrastructure". If you are cloning this and do not have the notes, the
 * script tells you and exits — it is a personal build step, not part of the app.
 */
const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ARGS = process.argv.slice(2);
const SRC = ARGS.find((a) => !a.startsWith("--")) || process.env.FIELD_MANUAL_SOURCE || "";
const DRY = ARGS.includes("--dry-run");
const OUT = join(HERE, "..", "docs", "data", "lessons", "services.json");

/* ------------------------------------------------------------------ parse */

const slug = (s) =>
  s.toLowerCase()
    .replace(/[^\w\s/-]/g, "")
    .trim()
    .replace(/[\s/]+/g, "-")
    .replace(/-+/g, "-");

/** Strip markdown emphasis/backticks; the app renders its own markup. */
function clean(text) {
  return String(text)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "`$1`")
    .replace(/\\\|/g, "|")
    .replace(/\s+$/g, "")
    .trim();
}

function splitSections(md) {
  const lines = md.split(/\r?\n/);
  const head = [];
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^#{2,3}\s+(.*)$/);
    if (m) {
      cur = { title: clean(m[1]), lines: [] };
      sections.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    } else {
      head.push(line);
    }
  }
  return { title: clean((md.match(/^#\s+(.*)$/m) || [, ""])[1]), head, sections };
}

function sectionNumber(title) {
  const m = title.match(/^(\d{1,2})[.\s]/);
  return m ? Number(m[1]) : null;
}

/** Convert a block of markdown lines into the app's section body. */
function toBody(lines) {
  const out = { p: [], code: [], list: [], where: null };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line.trim())) {
      const lang = line.trim().slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
      i++;
      const code = buf.join("\n").trimEnd();
      if (code) {
        // consecutive code blocks are merged with a blank line between
        out.code.push(out.code.length ? "\n" + code : code);
        out.where = out.where || mapWhere(lang);
      }
      continue;
    }

    // bullet list
    if (/^\s*[-*+]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        buf.push(clean(lines[i].replace(/^\s*[-*+]\s+/, "")));
        i++;
      }
      out.list.push(...buf);
      continue;
    }

    // numbered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        buf.push(clean(lines[i].replace(/^\s*\d+[.)]\s+/, "")));
        i++;
      }
      out.list.push(...buf);
      continue;
    }

    // markdown table -> flat list, the app renders real tables only in projects
    if (/^\s*\|/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => clean(c));
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c) || c === "")) rows.push(cells);
        i++;
      }
      for (const r of rows) out.list.push(r.filter(Boolean).join(" — "));
      continue;
    }

    if (line.trim() === "") { i++; continue; }

    // paragraph: consume until blank line or a block starter
    const buf = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^```/.test(lines[i].trim()) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+[.)]\s+/.test(lines[i]) &&
      !/^\s*\|/.test(lines[i]) &&
      !/^#{2,3}\s+/.test(lines[i])
    ) { buf.push(lines[i]); i++; }
    const text = clean(buf.join(" "));
    if (text) out.p.push(text);
  }
  return out;
}

function mapWhere(lang) {
  const l = String(lang || "").toLowerCase();
  if (l.includes("powershell") || l.includes("ps1")) return "PowerShell";
  if (l.includes("sql")) return "PostgreSQL";
  if (l.includes("xml")) return "config file";
  if (l.includes("ini") || l.includes("conf")) return "config file";
  return "RHEL shell";
}

/* ---------------------------------------------------------------- convert */

const files = existsSync(SRC)
  ? readdirSync(SRC).filter((f) => /^\d{2}-.*\.md$/.test(f)).sort()
  : [];

if (!files.length) {
  console.error(
    "Could not read the RHEL service-profile notes.\n" +
    "Set FIELD_MANUAL_SOURCE to the folder containing the numbered .md files, e.g.\n" +
    '  PowerShell:  $env:FIELD_MANUAL_SOURCE = "C:\\path\\to\\IT Infrastructure"\n' +
    "  bash:        FIELD_MANUAL_SOURCE=/path/to/notes node scripts/import-service-profiles.mjs\n\n" +
    "This is a personal build step. The generated app/data/lessons/services.json\n" +
    "is committed, so you do not need the source notes to run the app.",
  );
  process.exit(1);
}

const lessons = [];
const skipped = [];

for (const file of files) {
  const name = basename(file, ".md");
  const md = readFileSync(join(SRC, file), "utf8");
  const { title, head, sections } = splitSections(md);

  // 00-master-index.md and 21-final-* are not single services.
  if (/^00-/.test(name) || /^21-/.test(name)) { skipped.push(`${file} — index/cross-service file, not a service profile`); continue; }

  const byNum = new Map();
  for (const s of sections) {
    const n = sectionNumber(s.title);
    if (n !== null) byNum.set(n, s);
  }
  if (!byNum.size) { skipped.push(`${file} — no numbered sections found`); continue; }

  const id = `rhel-service-${slug(name.replace(/^\d{2}-/, ""))}`;

  // Build the display sections from the parts that teach.
  const outSections = [];
  const section = (n, heading) => {
    const s = byNum.get(n);
    if (!s) return;
    const body = toBody(s.lines);
    if (!body.p.length && !body.code.length && !body.list.length) return;
    const entry = { h: heading || s.title.replace(/^\d{1,2}[.\s]+/, ""), p: body.p };
    if (body.list.length) entry.list = body.list;
    if (body.code.length) { entry.code = body.code.join("\n"); entry.where = body.where; entry.risk = "caution"; }
    outSections.push(entry);
  };

  section(3, "How it is put together");
  section(4, "Installing it");
  section(5, "Managing the service");
  section(6, "Configuration files");
  section(7, "Ports and protocols");
  section(8, "Dependencies");
  section(9, "Day-to-day administration");
  section(10, "Security");
  section(11, "SELinux");
  section(12, "firewalld");
  section(13, "Logging");
  section(14, "Verifying it");
  section(18, "Production considerations");
  section(21, "Performance");

  // Beginner mental model -> analogy
  let analogy = null;
  const bm = byNum.get(2);
  if (bm) {
    const body = toBody(bm.lines);
    analogy = body.p[0] || body.list[0] || null;
  }

  // Practical labs
  const labs = [];
  const labSec = byNum.get(22);
  if (labSec) {
    for (const item of toBody(labSec.lines).list) labs.push({ text: item });
  }

  // Common administrator mistakes -> failures
  const failures = [];
  const mis = byNum.get(16);
  if (mis) {
    for (const item of toBody(mis.lines).list) {
      failures.push({ why: "Common mistake.", fix: item });
    }
  }

  // Troubleshooting chain
  const trouble = [];
  const tr = byNum.get(15);
  if (tr) {
    const body = toBody(tr.lines);
    for (const p of body.p) trouble.push(p);
    for (const l of body.list) trouble.push(l);
  }

  // Emergency quick reference -> a distinct section at the end
  const quick = byNum.get(25);

  lessons.push({
    id,
    kind: "lesson",
    tech: "rhel",
    title: title.replace(/^Profile\s*\d+\s*[—–-]\s*/i, "").trim() || name,
    summary: clean((head.join(" ").match(/\*\*What it is:\*\*\s*(.+)/) || [, ""])[1]) ||
             clean((head.join(" ").match(/\*\*Classification:\*\*\s*(.+)/) || [, ""])[1]) ||
             `RHEL 10 service profile for ${name}.`,
    verification: "source-checked",
    time: "",
    tags: ["rhel", "service", "systemd", name.replace(/^\d{2}-/, "")],
    analogy,
    sections: outSections,
    lab: labs,
    failures,
    trouble,
    quickRef: quick ? toBody(quick.lines).code.join("\n") : null,
    source: `Adapted from the author's own RHEL 10 service-profile notes (private study material; not redistributed). Verification status inherited from that source: source-checked, not execution-tested.`,
  });
}

lessons.sort((a, b) => a.title.localeCompare(b.title));

/* ------------------------------------------------------------------ write */

if (DRY) {
  console.log(`DRY RUN — would convert ${lessons.length} profiles\n`);
  for (const l of lessons) {
    console.log(`  ${l.id}`);
    console.log(`    title      ${l.title}`);
    console.log(`    sections   ${l.sections.length}   labs ${l.lab.length}   failures ${l.failures.length}   trouble ${l.trouble.length}`);
  }
  if (skipped.length) { console.log("\nSkipped:"); for (const s of skipped) console.log("  - " + s); }
  process.exit(0);
}

writeFileSync(OUT, JSON.stringify(lessons, null, 2), "utf8");

console.log(`Converted ${lessons.length} service profiles -> app/data/lessons/services.json\n`);
for (const l of lessons) {
  console.log(`  ${l.id.padEnd(42)} ${String(l.sections.length).padStart(2)} sec  ${String(l.lab.length).padStart(2)} lab  ${String(l.failures.length).padStart(2)} fail`);
}
if (skipped.length) {
  console.log("\nSkipped:");
  for (const s of skipped) console.log("  - " + s);
}
console.log("\nOriginals were read only. Nothing in the source folder was modified.");