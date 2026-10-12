#!/usr/bin/env node
/**
 * build-study-manual.mjs
 *
 * Turns the three RHEL study guides into the app's Study Manual section.
 *
 * WHAT THIS IS
 * The guides (RH124 / RH134 / RH294 Complete Guide) are already personalised
 * study material — they carry exam markers, "why this matters" explanations,
 * labs and per-part quizzes. The job here is not to rewrite them. It is to:
 *
 *   1. split them into one unit per chapter/part, preserving ORIGINAL order;
 *   2. attach the 19 existing service profiles to the chapter they belong
 *      under, so "systemd" material sits with the services chapter instead of
 *      floating separately;
 *   3. link each unit to the verified RHCSA EX200 objectives it serves;
 *   4. record currency problems found while reading, rather than silently
 *      rewriting the source;
 *   5. expose all of it as data the app can render and track progress against.
 *
 * HONEST LIMITS, stated in the output as well as here
 *   - Step 1 of the brief (assess the LEARNER's understanding) cannot be done
 *     here: there is no assessment data yet. The mechanism exists (each part
 *     ships with its quiz, and progress is recorded), but nothing is claimed
 *     about the learner's current level.
 *   - Currency checking is targeted, not exhaustive. What is verified is
 *     listed in CURRENCY_NOTES below and shown in the app. What has not been
 *     checked is NOT claimed to have been checked.
 *
 *   node scripts/build-study-manual.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ROOT = join(HERE, "..");
const SRC = join(ROOT, "private", "extract");
const OUT = join(ROOT, "docs", "data", "study");
const INDEX = join(ROOT, "docs", "data", "study-manual.json");

/* ------------------------------------------------------- source documents */

const BOOKS = [
  {
    id: "rh124", slug: "rh124", code: "RH124", title: "Red Hat Enterprise Linux Administration I",
    file: "RH124_Complete_Guide.txt", style: "chapters",
    exam: "RHCSA (EX200)", blurb:
      "The foundations course. Shell, files, users, processes, services, SSH, logs, networking, packages, file systems.",
  },
  {
    id: "rh134", slug: "rh134", code: "RH134", title: "Red Hat Enterprise Linux Administration II",
    file: "RH134_Complete_Guide.txt", style: "parts",
    exam: "RHCSA (EX200)", blurb:
      "The advanced half. Scripting, scheduling, tuning, ACLs, SELinux, storage, LVM, Stratis, VDO, NFS, boot recovery, Kickstart.",
  },
  {
    id: "rh294", slug: "rh294", code: "RH294", title: "Red Hat Certified Engineer in Ansible Automation",
    file: "RH294_Complete_Guide.txt", style: "parts",
    exam: "RHCE (EX294)", blurb:
      "Automation. Inventories, playbooks, variables, Vault, facts, loops, conditionals, handlers, roles, and the systems it administers.",
  },
];

/* ------------------------------------------------------------- utilities */

const readBook = (b) => {
  const p = join(SRC, b.file);
  if (!existsSync(p)) throw new Error(`missing extract ${p} — run scripts/extract-docx.mjs --all`);
  return readFileSync(p, "utf8");
};

// Block parser: the extractor emits "[H1] text" / "[H2] text" / plain text,
// blank-line separated.
function blocks(text) {
  return text
    .split(/\r?\n\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((raw) => {
      const m = raw.match(/^\[H(\d)\]\s+([\s\S]*)$/);
      if (m) return { level: Number(m[1]), text: m[2].trim() };
      return { level: 0, text: raw.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim() };
    });
}

/* --------------------------------------------------------------- parsing */

// RH124: "PART 0 - TITLE", "CHAPTER 1 - TITLE" at H1. Preamble H1s
// (TABLE OF CONTENTS, HOW TO USE, DOCUMENT STATUS) are skipped.
function parseChapters(blocksIn) {
  const units = [];
  let cur = null;
  for (const b of blocksIn) {
    if (b.level === 1) {
      const t = b.text.replace(/\s+/g, " ").trim();
      const isChapter = /^(?:CHAPTER|CH)\s+(\d+)\s*[-–—:]/i.test(t);
      const isPart = /^PART\s+(\d+)\s*[-–—:]/i.test(t);
      if (!isChapter && !isPart) { cur = null; continue; }   // preamble sections
      const num = Number(t.match(/(\d+)/)[1]);
      cur = {
        n: units.length + 1,
        sourceNumber: num,
        kind: isChapter ? "chapter" : "part",
        title: t.replace(/^(?:CHAPTER|CH|PART)\s+\d+\s*[-–—:]\s*/i, "").trim(),
        blocks: [],
      };
      units.push(cur);
      continue;
    }
    if (cur) cur.blocks.push(b);
  }
  return units;
}

// RH134 / RH294: sections are "N.M Title" at H1, grouped into parts by N.
// "Lab: ..." and "Quiz: ..." become their own labelled block lists.
function parseParts(blocksIn) {
  const parts = new Map();
  let cur = null;
  for (const b of blocksIn) {
    if (b.level === 1) {
      const t = b.text.replace(/\s+/g, " ").trim();
      const sec = t.match(/^(\d+)\.(\d+)\s+(.*)$/);
      if (sec) {
        const partNo = Number(sec[1]);
        if (!parts.has(partNo)) {
          parts.set(partNo, {
            n: parts.size + 1, sourceNumber: partNo, kind: "part",
            title: `Part ${partNo}`, blocks: [], sections: [],
          });
        }
        cur = { kind: "section", index: Number(sec[2]), title: sec[3].trim(), blocks: [] };
        parts.get(partNo).sections.push(cur);
        continue;
      }
      if (/^(Lab|Quiz|Capstone)\b/i.test(t)) {
        if (!parts.size) continue;
        const last = [...parts.values()].pop();
        cur = { kind: /^Lab/i.test(t) ? "lab" : /^Quiz/i.test(t) ? "quiz" : "capstone", title: t, blocks: [] };
        last.sections.push(cur);
        continue;
      }
      cur = null;
      continue;
    }
    if (cur) cur.blocks.push(b);
  }
  return [...parts.values()];
}

/* ------------------------------------------- existing service profiles */

// The 19 service lessons already in the app belong UNDER these chapters rather
// than standing alone. This is the "nest them" instruction from the brief.
//
// Placement is by NUMBER, not by matching the display title. The earlier
// version regex-matched "CHAPTER 9" against a title from which the prefix had
// already been stripped, so it silently matched nothing and every unit came
// back with zero services attached.
const SERVICE_PLACEMENT = {
  "rhel-service-systemd-systemctl": { book: "rh124", chapter: 9,  why: "Controlling Services and Daemons" },
  "rhel-service-cron-crond":        { book: "rh124", chapter: 9,  why: "Controlling Services and Daemons" },
  "rhel-service-systemd-journald":  { book: "rh124", chapter: 11, why: "Analyzing and Storing Logs" },
  "rhel-service-rsyslog":           { book: "rh124", chapter: 11, why: "Analyzing and Storing Logs" },
  "rhel-service-openssh-sshd":      { book: "rh124", chapter: 10, why: "Configuring and Securing SSH" },
  "rhel-service-bind-named":        { book: "rh124", chapter: 12, why: "Managing Networking — name resolution" },
  "rhel-service-dhcp":              { book: "rh124", chapter: 12, why: "Managing Networking" },
  "rhel-service-selinux":           { book: "rh134", part: 3,    why: "ACLs and SELinux Troubleshooting" },
  "rhel-service-auditd":            { book: "rh134", part: 3,    why: "ACLs and SELinux Troubleshooting — audit rules" },
  "rhel-service-firewalld":         { book: "rh134", part: 6,    why: "Boot Recovery + Firewall/SELinux Port" },
  "rhel-service-nfs":               { book: "rh134", part: 5,    why: "Advanced Storage + Automounted NFS" },
  "rhel-service-samba-smb":         { book: "rh134", part: 5,    why: "Advanced Storage — network file services" },
  "rhel-service-autofs":            { book: "rh134", part: 5,    why: "Advanced Storage + Automounted NFS" },
  "rhel-service-libvirt-kvm-qemu":  { book: "rh134", part: 7,    why: "Installing and Configuring Virtual Machines" },
  "rhel-service-apache-httpd":      { book: "rh294", part: 8,    why: "Provision a Complete Web Server — End to End" },
  "rhel-service-postgresql":        { book: "rh294", part: 8,    why: "Provision a Complete Web Server — End to End" },
  "rhel-service-sssd":              { book: "rh294", part: 8,    why: "Managing Users and Authentication" },
  "rhel-service-podman":            { book: "rh294", part: 9,    why: "Automation skill checklist and capstone" },
  "rhel-service-chronyd":           { book: "rh134", part: 2,    why: "Scheduling and Performance — time sync runs as a managed service" },
};

/* -------------------------------------------------------- currency notes */

// Verified against Red Hat documentation. Each of these is a REAL difference
// between the guides and current practice, surfaced rather than edited away.
const CURRENCY_NOTES = {
  rh124: [{
    id: "rhel8-lab",
    severity: "high",
    title: "The lab is specified as RHEL 8, not RHEL 10",
    found: "Part 0 builds the practice environment on VMware Workstation with a four-machine RHEL 8 topology.",
    current: "Red Hat Enterprise Linux 8 left mainstream support on 2024-05-31 and is in extended support until 2029-05-31. RHEL 10 is the current major release and is the basis of the RHCSA EX200 exam.",
    action: "Build the lab on RHEL 10. Every command in these guides still applies, but package names, default service enablement and some paths differ between major releases. Keep an RHEL 8 machine only if you specifically need to practise the older behaviour.",
    verified: "2026-10-12",
    source: "redhat.com lifecycle pages",
  }],
  rh134: [{
    id: "stratis-vdo",
    severity: "medium",
    title: "Stratis and VDO are still taught, but they are not on the RHCSA exam",
    found: "Part 5 covers Stratis layered storage and VDO compression/deduplication in depth.",
    current: "Stratis remains available in RHEL and is a reasonable way to manage layered storage, but the EX200 objective wording is about local storage, LVM, and mounting by UUID or label. VDO is niche and largely absent from enterprise datacentres today.",
    action: "Learn these for understanding, but prioritise the LVM objectives — pvcreate, vgcreate, lvcreate, and mounting by UUID — which are directly examined.",
    verified: "2026-10-12",
    source: "EX200 objectives, read 2026-10-10",
  }],
  rh294: [{
    id: "rhce-ansible",
    severity: "medium",
    title: "EX294 remains the current RHCE exam, but the ecosystem has moved to Ansible Automation Platform",
    found: "The guide configures Ansible from the repository with ansible.cfg and static inventories.",
    current: "EX294 is still the exam for Red Hat Certified Engineer in Ansible Automation. Red Hat has since steered large-scale automation toward Ansible Automation Platform (AAP), which adds a web interface, job scheduling and a controller. The underlying modules and playbook syntax used here are unchanged.",
    action: "Everything in these guides remains valid for EX294. AAP knowledge is useful in industry but is not required for the exam and is not covered here.",
    verified: "2026-10-12",
    source: "Red Hat EX294 certification page",
  }],
};

/* ---------------------------------------------------------------- build */

function titleFor(book, unit) {
  if (book.style === "chapters") {
    return unit.kind === "chapter"
      ? `Ch ${unit.sourceNumber} — ${unit.title}`
      : `Part ${unit.sourceNumber} — ${unit.title}`;
  }
  // Parts have no title of their own in the source; name them from their
  // topics, which is what a learner actually navigates by.
  const topics = (unit.sections || []).filter((s) => s.kind === "section").map((s) => s.title);
  const named = topics.length ? `Part ${unit.sourceNumber} — ${topics.slice(0, 3).join("; ")}` : `Part ${unit.sourceNumber}`;
  return named.length > 70 ? `${named.slice(0, 68)}…` : named;
}

function renderBlocks(blocksIn) {
  return (blocksIn || []).map((b) => ({ level: b.level, text: b.text }));
}

const manual = {
  note:
    "Personal study manual built from the three RHEL Complete Guides. Structure and chapter order follow " +
    "the guides exactly. Section text is theirs, carried over as written. Service profiles from the field " +
    "manual are attached to the chapter they belong under. Currency notes flag verified differences from " +
    "current practice — they are surfaced, not silently rewritten.",
  built: new Date().toISOString().slice(0, 10),
  assessment:
    "NOT YET ASSESSED. Step 1 of the brief requires evaluating the learner's own understanding from their " +
    "answers and practical work. No such data exists yet, so nothing here is personalised to a measured " +
    "level. Each part ships with its quiz, and completing one records progress, but no inference about " +
    "ability has been made.",
  books: [],
};

let totalUnits = 0;
let totalWords = 0;

const DRY = process.argv.includes("--dry-run");

// Clean slate: a stale file from a previous parse would otherwise be served
// by the app as if it were current.
if (!DRY) {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
} else {
  mkdirSync(OUT, { recursive: true });
}

for (const book of BOOKS) {
  const raw = readBook(book);
  const bs = blocks(raw);
  const units = book.style === "chapters" ? parseChapters(bs) : parseParts(bs);

  const wordsOf = (arr) => (arr || []).reduce((a, b) => a + String(b.text || "").split(/\s+/).length, 0);

  const outUnits = units.map((u, i) => {
    const id = `${book.slug}-${String(i + 1).padStart(2, "0")}`;
    // For parts-mode the body lives on the sub-sections, not on u.blocks, so
    // counting u.blocks alone reported 0 words for RH134 and RH294.
    const words = book.style === "chapters"
      ? wordsOf(u.blocks)
      : (u.sections || []).reduce((a, s) => a + wordsOf(s.blocks), 0);
    totalWords += words;
    totalUnits++;

    let sections = [];
    let labs = [];
    let quizzes = [];

    if (book.style === "chapters") {
      // Split the chapter body into its H2 sections.
      const heads = [];
      let current = { title: "Overview", level: 1, blocks: [] };
      for (const b of u.blocks) {
        if (b.level === 2) { heads.push(current); current = { title: b.text, level: 2, blocks: [] }; }
        else current.blocks.push(b);
      }
      heads.push(current);
      sections = heads.map((s) => ({
        title: s.title,
        content: renderBlocks(s.blocks),
        words: s.blocks.reduce((a, b) => a + b.text.split(/\s+/).length, 0),
      }));
    } else {
      sections = (u.sections || [])
        .filter((s) => s.kind === "section")
        .map((s) => ({
          title: `${s.index}. ${s.title}`,
          content: renderBlocks(s.blocks),
          words: s.blocks.reduce((a, b) => a + b.text.split(/\s+/).length, 0),
        }));
      labs = (u.sections || []).filter((s) => s.kind === "lab")
        .map((s) => ({ title: s.title, content: renderBlocks(s.blocks) }));
      quizzes = (u.sections || []).filter((s) => s.kind === "quiz")
        .map((s) => ({ title: s.title, content: renderBlocks(s.blocks) }));
    }

    // Attach service profiles that belong under this chapter, matched by the
    // chapter/part number carried in the source document.
    const services = Object.entries(SERVICE_PLACEMENT)
      .filter(([, p]) => p.book === book.slug && p.why && (p.chapter ?? p.part) === u.sourceNumber)
      .map(([sid, p]) => ({ id: sid, why: p.why }));

    const record = {
      id, n: i + 1, sourceNumber: u.sourceNumber, kind: u.kind,
      title: u.title, display: titleFor(book, u),
      exam: book.exam, words,
      sections, labs, quizzes,
      services,
      currency: CURRENCY_NOTES[book.slug] && i === 0 ? CURRENCY_NOTES[book.slug] : [],
    };

    if (!DRY) {
      writeFileSync(join(OUT, `${id}.json`), JSON.stringify(record, null, 2), "utf8");
    }
    return {
      id, n: i + 1, sourceNumber: u.sourceNumber, kind: u.kind,
      title: record.display, display: record.display,
      sections: sections.length, labs: labs.length, quizzes: quizzes.length,
      words, services: services.length, hasCurrency: record.currency.length > 0,
    };
  });

  manual.books.push({
    id: book.id, slug: book.slug, code: book.code, title: book.title,
    exam: book.exam, blurb: book.blurb,
    units: outUnits,
    currency: CURRENCY_NOTES[book.slug] || [],
  });
}

if (process.argv.includes("--dry-run")) {
  for (const b of manual.books) {
    console.log(`\n${b.code} — ${b.units.length} units`);
    b.units.forEach((u) => console.log(
      `  ${String(u.n).padStart(2)}. ${u.display.padEnd(46)} ${String(u.sections).padStart(2)} sec` +
      `${String(u.labs).padStart(3)} lab${String(u.quizzes).padStart(3)} quiz` +
      `${String(u.services).padStart(3)} svc ${String(u.words).padStart(7)}w`));
  }
  console.log(`\nTOTAL: ${totalUnits} units, ${totalWords.toLocaleString()} words`);
  process.exit(0);
}

writeFileSync(INDEX, JSON.stringify(manual, null, 2), "utf8");
console.log(`Wrote ${INDEX}`);
for (const b of manual.books) {
  console.log(`  ${b.code}: ${b.units.length} units, ${b.units.reduce((a, u) => a + u.words, 0).toLocaleString()} words`);
}
console.log(`  total: ${totalUnits} units, ${totalWords.toLocaleString()} words`);