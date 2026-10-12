#!/usr/bin/env node
/**
 * validate.mjs — content and privacy gate. Run before every commit and release.
 *
 *   node scripts/validate.mjs
 *
 * Checks:
 *   1. every data file is valid JSON and every item has the fields its kind needs
 *   2. ids are unique and unique *within* each kind
 *   3. every cross-reference (quiz, related, prerequisites, prerequisites in labs)
 *      resolves to an item that actually exists
 *   4. every command entry states a verification status and a source
 *   5. every risk value is one of the allowed set
 *   6. no command claims "execution-tested" without recording an environment
 *   7. the service worker precache list matches the files on disk
 *   8. privacy: no book filenames, no absolute user paths, no secrets in the app
 *   9. the app never calls innerHTML
 *
 * Exit 0 = pass. Exit 1 = failures printed. Warnings do not fail the build.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DATA = join(ROOT, "docs", "data");
const APP = join(ROOT, "docs");

const errors = [];
const warnings = [];
const fail = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

/* ------------------------------------------------------------- load corpus */

const KINDS = ["commands", "lessons", "scenarios", "quizzes", "projects"];

// A kind may be split across several files under docs/data/<kind>/.
// Mirrors app.js `groups` exactly — see the drift check further down.
const APP_GROUPS = {
  commands: ["commands/index", "commands/cisco", "commands/windows", "commands/mikrotik"],
  lessons: ["lessons/index", "lessons/services", "lessons/networking", "lessons/windows"],
  scenarios: ["scenarios/index"],
  quizzes: ["quizzes/index"],
  projects: ["projects/index"],
};

/** "lessons/services" -> "services.json" */
const fileNameOf = (p) => `${p.split("/").pop()}.json`;
const FILES = Object.fromEntries(
  Object.entries(APP_GROUPS).map(([k, paths]) => [k, paths.map(fileNameOf)]),
);

const corpus = {};
for (const k of KINDS) {
  corpus[k] = [];
  for (const file of FILES[k]) {
    const f = join(DATA, k, file);
    if (!existsSync(f)) {
      if (file === "index.json") fail(`missing data file: docs/data/${k}/${file}`);
      continue;
    }
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(f, "utf8"));
    } catch (e) {
      fail(`docs/data/${k}/${file} is not valid JSON: ${e.message}`);
      continue;
    }
    corpus[k] = corpus[k].concat(Array.isArray(parsed) ? parsed : (parsed.items || []));
  }
}

const REQUIRED = {
  commands:  ["id", "tech", "title", "task", "commands", "risk", "verification"],
  lessons:   ["id", "tech", "title", "summary", "verification"],
  scenarios: ["id", "tech", "title", "summary", "situation", "verification"],
  quizzes:   ["id", "tech", "title", "questions"],
  projects:  ["id", "title", "summary"],
};

const RISKS = new Set(["safe", "caution", "risk"]);
const VERIFICATIONS = new Set(["source-checked", "independently-reviewed", "execution-tested", "release-approved"]);

const byKind = {};
const allIds = new Set();

for (const [kind, items] of Object.entries(corpus)) {
  byKind[kind] = new Set();
  for (const [i, item] of items.entries()) {
    const where = `${kind}[${i}]${item.id ? ` (${item.id})` : ""}`;

    for (const field of REQUIRED[kind]) {
      if (item[field] === undefined || item[field] === null || item[field] === "") {
        fail(`${where}: missing required field "${field}"`);
      }
    }
    if (item.id) {
      if (byKind[kind].has(item.id)) fail(`${where}: duplicate id within ${kind}`);
      byKind[kind].add(item.id);
      // An id may repeat across kinds (a lesson and its quiz can share a name),
      // but the cross-reference resolver must then be explicit.
      allIds.add(`${kind}/${item.id}`);
    }
    if (item.risk !== undefined && !RISKS.has(item.risk)) {
      fail(`${where}: risk must be one of ${[...RISKS].join(", ")} — got "${item.risk}"`);
    }
    if (item.verification !== undefined) {
      for (const v of String(item.verification).split(/[,+]/).map((s) => s.trim())) {
        if (v && !VERIFICATIONS.has(v)) {
          fail(`${where}: unknown verification level "${v}"`);
        }
      }
    }
  }
}

const has = (id) =>
  typeof id === "string" &&
  KINDS.some((k) => byKind[k] && byKind[k].has(id));

/* ---------------------------------------------------- cross-reference check */

for (const [kind, items] of Object.entries(corpus)) {
  for (const item of items) {
    const where = `${kind}/${item.id}`;

    for (const rel of item.related || []) {
      if (!has(rel.id)) fail(`${where}: related -> "${rel.id}" does not exist`);
    }
    for (const p of item.prerequisites || []) {
      const pid = typeof p === "string" ? p : p.id;
      if (pid && !has(pid)) fail(`${where}: prerequisite -> "${pid}" does not exist`);
    }
    if (item.quiz && !has(item.quiz)) fail(`${where}: quiz -> "${item.quiz}" does not exist`);
  }
}

for (const q of corpus.quizzes || []) {
  if (!Array.isArray(q.questions) || !q.questions.length) {
    fail(`quiz/${q.id}: has no questions`);
    continue;
  }
  q.questions.forEach((qq, i) => {
    const at = `quiz/${q.id} q${i + 1}`;
    if (!Array.isArray(qq.options) || qq.options.length < 2) fail(`${at}: needs at least 2 options`);
    if (typeof qq.answer !== "number" || qq.answer < 0 || qq.answer >= (qq.options || []).length) {
      fail(`${at}: answer index ${qq.answer} is out of range`);
    }
    if (!qq.why) warn(`${at}: no "why" — a question without an explanation teaches less`);
  });
}

for (const s of corpus.scenarios || []) {
  if (!s.steps || !s.steps.inspect) fail(`scenario/${s.id}: missing steps.inspect`);
  if (s.steps && s.steps.solution && !s.steps.rootcause) {
    warn(`scenario/${s.id}: has a solution but no rootcause section`);
  }
}

/* --------------------------------------------- honesty rules (the important) */

for (const c of corpus.commands || []) {
  const where = `command/${c.id}`;
  const v = String(c.verification || "");

  if (!c.sources || !c.sources.length) {
    fail(`${where}: has no source — a command reference without a source is an assertion`);
  }
  // The core rule: an execution-tested claim must name the environment.
  if (v.includes("execution-tested") && !c.tested_on) {
    fail(`${where}: claims execution-tested but has no "tested_on" record (date + environment + version)`);
  }
  if (!c.changes) warn(`${where}: does not say whether it changes the system`);
  if (!c.undo && c.risk && c.risk !== "safe") {
    warn(`${where}: risk is "${c.risk}" but no undo/recovery is given`);
  }
  // A command that changes state with no privilege note is dangerous.
  if (c.risk && c.risk !== "safe" && !c.privilege) {
    warn(`${where}: state-changing command with no privilege note`);
  }
}

/* ----------------------------------------------------- service worker parity */

const swPath = join(APP, "sw.js");
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, "utf8");
  const grab = (name) => {
    const m = sw.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
    if (!m) return null;
    return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  };
  const shell = grab("SHELL");
  const data = grab("DATA");
  if (!shell) fail("sw.js: could not parse the SHELL precache list");
  if (!data) fail("sw.js: could not parse the DATA precache list");

  if (shell) {
    for (const p of shell) {
      if (!existsSync(join(APP, p))) fail(`sw.js precaches "${p}" but that file does not exist`);
    }
  }
  if (data) {
    for (const p of data) {
      if (!existsSync(join(APP, p))) fail(`sw.js precaches "${p}" but that file does not exist`);
    }
  }
  // And the reverse: anything in data/ must be precached or search breaks offline.
  if (data) {
    for (const k of KINDS) {
      for (const file of FILES[k] || ["index.json"]) {
        if (!existsSync(join(DATA, k, file))) continue;
        const p = `data/${k}/${file}`;
        if (!data.includes(p)) fail(`sw.js does not precache ${p} — search would break offline`);
      }
    }
    // Catch a data file that exists but is not listed in FILES above.
    for (const k of KINDS) {
      const dir = join(DATA, k);
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        if (!(FILES[k] || ["index.json"]).includes(f)) {
          fail(`docs/data/${k}/${f} exists but validate.mjs does not know about it — add it to FILES and to sw.js DATA`);
        }
      }
    }
  }
} else {
  fail("docs/sw.js is missing — the app would have no offline support");
}

/* ---------------------------------------------------------- privacy checks */

const PRIVACY_FILES = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else PRIVACY_FILES.push(full);
  }
})(APP);

const SECRET_PATTERNS = [
  [/(?:api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["'][^"']{6,}["']/i, "looks like a hardcoded credential"],
  [/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/, "private key"],
  [/gh[pousr]_[A-Za-z0-9]{20,}/, "GitHub token"],
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
];

// Windows profile paths leak a developer's real account name and break on
// every other machine. This repository is public, so there is deliberately no
// allowlist — not even for the machine the author develops on.
//
// Only Windows paths are checked. `/home/someuser` and `/Users/you` appear
// legitimately inside the *documentation* as examples, and flagging those
// would train people to ignore this check.
const HOME_RE = /[A-Za-z]:\\Users\\[^"'\s\\]+/g;

for (const f of PRIVACY_FILES) {
  if (!/\.(js|mjs|json|css|html|webmanifest|svg)$/.test(f)) continue;
  const text = readFileSync(f, "utf8");
  const rel = f.slice(ROOT.length + 1);

  for (const [re, why] of SECRET_PATTERNS) {
    if (re.test(text)) fail(`${rel}: ${why} — must never be committed`);
  }

  for (const hit of text.match(HOME_RE) || []) {
    fail(`${rel}: contains an absolute Windows profile path ("${hit}") — a real account name does not belong in a public repository`);
  }

  if (/\.innerHTML\b/.test(text)) fail(`${rel}: uses innerHTML — the manual never injects markup as a string`);
  if (/\bdocument\.write\b/.test(text)) fail(`${rel}: uses document.write`);
  if (/https?:\/\/(?:cdn|unpkg|jsdelivr|fonts\.googleapis)/i.test(text)) {
    fail(`${rel}: references a third-party CDN or web font — offline is a hard requirement`);
  }
}

// No book or private filenames anywhere in the shipped app.
const BOOK_MARKERS = [
  "Networking-with-MikroTik", "Red Hat System Administration", "Windows 11 Inside Out",
  "Dummies", "IT Infrastucture", "mkerrisk", "NSpersonal", "Life OS",
  "Sheikh_Shahariar", "Sheikh Shahariar", "DAG_", "omarchy",
];
for (const f of PRIVACY_FILES) {
  if (!/\.(js|mjs|json|css|html|webmanifest|svg)$/.test(f)) continue;
  const text = readFileSync(f, "utf8");
  for (const marker of BOOK_MARKERS) {
    if (text.includes(marker)) fail(`${f.slice(ROOT.length + 1)}: references private material "${marker}"`);
  }
}

/* --------------------------------------- hidden-vs-display regression guard */

// An author rule like `.sheet-host { display: grid }` outranks the UA's
// `[hidden] { display: none }`. The element keeps `hidden` in the HTML, looks
// invisible to a reader, and still covers the page — silently swallowing every
// click. It shipped once already, so it is now a build failure rather than
// something a user has to discover.
const css = readFileSync(join(APP, "assets", "app.css"), "utf8");
const html = readFileSync(join(APP, "index.html"), "utf8");

const hasGlobalHiddenGuard = /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/.test(css);
if (!hasGlobalHiddenGuard) {
  fail("app.css must contain `[hidden] { display: none !important; }` — without it any class with a display rule silently defeats the hidden attribute");
} else {
  // With the global guard in place `[hidden]` always wins, so an element that
  // also has a `display` in its class rule is safe. Only warn about the ones
  // that would be dangerous without it, to keep the signal useful.
  for (const m of html.matchAll(/<[^>]*\bclass="([^"]+)"[^>]*\bhidden\b[^>]*>/g)) {
    for (const cls of m[1].split(/\s+/)) {
      const rule = css.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`));
      if (rule && /(^|;)\s*display\s*:/.test(rule[1]) && /position:\s*fixed|inset:\s*0|z-index/.test(rule[1])) {
        warn(`docs/index.html: .${cls} carries \`hidden\` and has a display plus overlay properties — currently safe because of the global [hidden] rule, but fragile if that rule is ever removed`);
      }
    }
  }
}

// Fixed-position elements that cover the viewport are a click-blocking hazard.
// They must be hidden by default.
const viewportCoverers = [...css.matchAll(/([.#][\w-]+)\s*\{([^}]*)\}/g)].filter(([, , body]) => {
  const hasFixed = /position:\s*fixed/.test(body);
  const covers = /inset:\s*0/.test(body) || /top:\s*0/.test(body) && /left:\s*0/.test(body);
  const highZ = /z-index:\s*(5\d|[6-9]\d|\d{3,})/.test(body);
  return hasFixed && covers && highZ;
});
for (const [, sel] of viewportCoverers) {
  const cls = sel.replace(/^[.#]/, "");
  const guardedByHiddenRule = new RegExp(`${sel.replace('.', '\\.')}\\[hidden\\]`) || false;
  if (!guardedByHiddenRule) {
    warn(`app.css: ${sel} is position:fixed, covers the viewport and has a high z-index — confirm it is hidden by default or it will block clicks`);
  }
}

// Every data file must actually be loaded by the app, and every file the app
// loads must exist. Drift here means content silently missing from the manual.
for (const [kind, paths] of Object.entries(APP_GROUPS)) {
  for (const p of paths) {
    if (!existsSync(join(DATA, `${p}.json`))) {
      fail(`app.js will fetch data/${p}.json but that file does not exist`);
    }
  }
}

// And the reverse: a JSON file on disk that nothing loads is dead content.
for (const k of KINDS) {
  const dir = join(DATA, k);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    if (!(FILES[k] || []).includes(f)) {
      fail(`docs/data/${k}/${f} exists but nothing loads it — add it to app.js groups and sw.js DATA, or delete it`);
    }
  }
}

// Single-object data files loaded outside the per-kind groups.
const EXTRA_DATA = ["data/exam-objectives.json"];

for (const p of EXTRA_DATA) {
  const full = join(APP, p);
  if (!existsSync(full)) {
    fail(`${p} is missing — the app loads it separately from the per-kind groups`);
    continue;
  }
  try {
    const parsed = JSON.parse(readFileSync(full, "utf8"));
    if (!Array.isArray(parsed.exams)) fail(`${p} has no "exams" array`);
  } catch (e) {
    fail(`${p} is not valid JSON: ${e.message}`);
  }
}

// Every objective code referenced by content must exist in the objectives file,
// and every objectives file must be precached or the view breaks offline.
{
  const objPath = join(APP, "data", "exam-objectives.json");
  if (existsSync(objPath)) {
    let known = new Set();
    try {
      const o = JSON.parse(readFileSync(objPath, "utf8"));
      for (const ex of o.exams || []) {
        for (const d of ex.domains || []) known.add(d.id);
        for (const s of ex.subtopics || []) known.add(s.id);
        if (!ex.verified) {
          warn(`exam objectives: "${ex.title}" is marked unverified — do not quote it as an exam fact`);
        }
      }
    } catch (_) { /* reported above */ }

    for (const [kind, items] of Object.entries(corpus)) {
      for (const item of items) {
        for (const o of item.objectives || []) {
          if (!known.has(o.id)) {
            fail(`${kind}/${item.id}: objective "${o.id}" is not defined in data/exam-objectives.json`);
          }
        }
      }
    }

    const swSrc = readFileSync(join(APP, "sw.js"), "utf8");
    if (!swSrc.includes("data/exam-objectives.json")) {
      fail("sw.js does not precache data/exam-objectives.json — the objectives view would break offline");
    }
  }
}

/* ------------------------------------- route/link integrity (plural vs singular) */

// Content `kind` is singular ("command"); route segments are plural ("commands").
// Mixing them produces links that look right and navigate nowhere — which is
// exactly what happened with bookmarks, progress links and related links.
const ROUTES = {
  command: "commands",
  lesson: "lessons",
  scenario: "scenarios",
  quiz: "quizzes",
  project: "projects",
};

{
  const appSrc = readFileSync(join(APP, "assets", "views.js"), "utf8");
  // No raw `${something.kind}/` may appear inside an href() call.
  for (const m of appSrc.matchAll(/href\(`\$\{[^}]*\.kind\}/g)) {
    fail(`views.js builds a link from \`.kind\` (${m[0]}) — kind is singular but routes are plural; use contentHref(doc)`);
  }
  if (!/function contentHref/.test(appSrc)) {
    fail("views.js is missing contentHref() — every content link must go through it");
  }
  // Every doc's kind must map to a route the router actually registers.
  const appJs = readFileSync(join(APP, "assets", "app.js"), "utf8");
  for (const [kind, seg] of Object.entries(ROUTES)) {
    // Routes are registered in a loop, so check the segment is referenced at
    // all rather than looking for a literal `route("x"` call.
    if (!appJs.includes(`"${seg}"`)) fail(`router never references the "${seg}" route segment (kind "${kind}")`);
    if (!appJs.includes(`case "${seg}":`)) fail(`render() has no case for "${seg}"`);
  }
  for (const item of Object.values(corpus).flat()) {
    if (item.kind && !ROUTES[item.kind]) fail(`${item.kind}: unknown content kind on "${item.id}"`);
  }
}

/* --------------------------------------------------- knowledge map integrity */

{
  const kmPath = join(APP, "data", "knowledge-map.json");
  if (!existsSync(kmPath)) {
    fail("data/knowledge-map.json is missing — run scripts/extract-knowledge-map.mjs then scripts/tag-knowledge-map.mjs");
  } else {
    let km = null;
    try {
      km = JSON.parse(readFileSync(kmPath, "utf8"));
    } catch (e) {
      fail(`data/knowledge-map.json is not valid JSON: ${e.message}`);
    }

    if (km) {
      const sessions = km.sessions || [];

      if (!Array.isArray(sessions) || !sessions.length) {
        fail("knowledge-map.json has no sessions");
      } else {
        // The document claims 146 sessions; a short list means the TOC parse
        // silently regressed.
        if (sessions.length !== 146) {
          fail(`knowledge map has ${sessions.length} sessions, expected 146 — the extraction is incomplete`);
        }
        // Every session must carry a hand-written summary, not just a title.
        for (const s of sessions) {
          if (!s.summary || s.summary.length < 12) {
            fail(`knowledge map ${s.id} ("${s.title}") has no summary — run scripts/tag-knowledge-map.mjs`);
          }
        }
        // Numbers must be contiguous 1..N with no gaps or duplicates.
        const nums = sessions.map((s) => s.n).sort((a, b) => a - b);
        const dupes = nums.filter((n, i, a) => a.indexOf(n) !== i);
        if (dupes.length) fail(`knowledge map has duplicate session numbers: ${[...new Set(dupes)].join(", ")}`);
        for (let i = 0; i < nums.length; i++) {
          if (nums[i] !== i + 1) {
            fail(`knowledge map session numbering has a gap: expected ${i + 1}, found ${nums[i]}`);
            break;
          }
        }
        // Every manual link must resolve to a real document.
        const ids = new Set(Object.values(corpus).flat().map((d) => d.id));
        for (const s of sessions) {
          for (const id of s.manual || []) {
            if (!ids.has(id)) fail(`knowledge map ${s.id} links to "${id}", which is not in the manual`);
          }
        }
      }

      // It must be precached, or the Knowledge Map breaks offline.
      const swSrc = readFileSync(join(APP, "sw.js"), "utf8");
      if (!swSrc.includes("data/knowledge-map.json")) {
        fail("sw.js does not precache data/knowledge-map.json — the Knowledge Map would break offline");
      }

      // Every session must have its prose file, or the chips open an empty panel.
      const kmDir = join(APP, "data", "km");
      if (!existsSync(kmDir)) {
        fail("data/km/ is missing — run scripts/export-knowledge-content.mjs, or the section chips open nothing");
      } else {
        let missing = 0;
        let empty = 0;
        let bytes = 0;
        for (const s of sessions) {
          const p = join(kmDir, `${s.id}.json`);
          if (!existsSync(p)) {
            missing++;
            if (missing <= 5) fail(`data/km/${s.id}.json is missing (session ${s.n}, "${s.title}")`);
            continue;
          }
          bytes += statSync(p).size;
          try {
            const rec = JSON.parse(readFileSync(p, "utf8"));
            const kinds = Object.keys(rec.sections || {});
            if (!kinds.length) {
              empty++;
              if (empty <= 5) fail(`data/km/${s.id}.json has no section text`);
            }
            // Every kind the outline advertises must actually be in the file,
            // or a chip opens a panel saying "this session has no ...".
            for (const k of (s.sectionKinds || [])) {
              if (!kinds.includes(k)) {
                fail(`data/km/${s.id}.json lacks "${k}" but session ${s.n} advertises it`);
              }
            }
          } catch (e) {
            fail(`data/km/${s.id}.json is not valid JSON: ${e.message}`);
          }
        }
        if (!missing && !empty) {
          console.log(`  knowledge prose  ${sessions.length} files, ${(bytes / 1024 / 1024).toFixed(2)} MB, avg ${(bytes / sessions.length / 1024).toFixed(1)} KB`);
        }
      }

      // The source PDF must never be committed. private/ is gitignored and
      // *.pdf is ignored, but this catches someone adding one by another route.
      const pdfs = [];
      (function walkAll(dir) {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          if (e.name === "node_modules" || e.name === ".git") continue;
          const full = join(dir, e.name);
          if (e.isDirectory()) walkAll(full);
          else if (full.toLowerCase().endsWith(".pdf")) pdfs.push(full);
        }
      })(ROOT);
      for (const p of pdfs) {
        fail(`${p.slice(ROOT.length + 1)} — a PDF must never be committed to this repository`);
      }
    }
  }
}

/* ------------------------------------------------------ study manual */

{
  const idxPath = join(APP, "data", "study-manual.json");
  if (!existsSync(idxPath)) {
    fail("data/study-manual.json is missing — run scripts/extract-docx.mjs --all then scripts/build-study-manual.mjs");
  } else {
    let m = null;
    try { m = JSON.parse(readFileSync(idxPath, "utf8")); } catch (e) {
      fail(`data/study-manual.json is not valid JSON: ${e.message}`);
    }
    if (m) {
      const dir = join(APP, "data", "study");
      if (!existsSync(dir)) {
        fail("data/study/ is missing — the study manual renders nothing without it");
      } else {
        const onDisk = new Set(readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, "")));
        const inIndex = new Set();
        let words = 0;
        for (const b of m.books || []) {
          for (const u of b.units || []) {
            inIndex.add(u.id);
            words += u.words || 0;
            const p = join(dir, `${u.id}.json`);
            if (!existsSync(p)) { fail(`data/study/${u.id}.json is missing but the index lists "${u.display}"`); continue; }
            try {
              const rec = JSON.parse(readFileSync(p, "utf8"));
              if (!rec.sections || !rec.sections.length) fail(`data/study/${u.id}.json has no sections`);
              // The order in the index must match the file, or "next chapter"
              // navigates somewhere the learner has not reached.
              if (rec.id !== u.id) fail(`data/study/${u.id}.json declares id "${rec.id}"`);
            } catch (e) {
              fail(`data/study/${u.id}.json is not valid JSON: ${e.message}`);
            }
          }
        }
        for (const f of onDisk) if (!inIndex.has(f)) fail(`data/study/${f}.json is orphaned — not listed in the index`);
        const total = (m.books || []).reduce((a, b) => a + b.units.length, 0);
        console.log(`  study manual   ${m.books.length} courses, ${total} units, ${(words / 1000).toFixed(0)}k words`);

        // Every service profile must be nested under a chapter, per the brief.
        const placed = new Set();
        for (const b of m.books || []) {
          for (const u of b.units || []) {
            const p = join(dir, `${u.id}.json`);
            if (existsSync(p)) {
              for (const s of (JSON.parse(readFileSync(p, "utf8")).services || [])) placed.add(s.id);
            }
          }
        }
        const svcFile = join(APP, "data", "lessons", "services.json");
        if (existsSync(svcFile)) {
          for (const s of JSON.parse(readFileSync(svcFile, "utf8"))) {
            if (!placed.has(s.id)) warn(`service profile "${s.id}" is not nested under any study chapter`);
          }
        }
      }
    }
  }
}

/* ------------------------------------------------- repo-level privacy guard */

const gi = join(ROOT, ".gitignore");
if (!existsSync(gi)) {
  fail(".gitignore is missing — private material could be committed");
} else {
  const g = readFileSync(gi, "utf8");
  for (const must of ["private/", "*.pdf", ".env", "node_modules"]) {
    if (!g.includes(must)) fail(`.gitignore must contain "${must}"`);
  }
}

/* ------------------------------------------------------------------ report */

const counts = Object.fromEntries(KINDS.map((k) => [k, (corpus[k] || []).length]));

console.log("IT Field Manual — content validation\n");
console.log(`  commands  ${counts.commands}`);
console.log(`  lessons   ${counts.lessons}`);
console.log(`  scenarios ${counts.scenarios}`);
console.log(`  quizzes   ${counts.quizzes}`);
console.log(`  projects  ${counts.projects}`);
console.log(`  files checked for privacy: ${PRIVACY_FILES.length}\n`);

if (warnings.length) {
  console.log(`WARNINGS (${warnings.length}) — these do not block a release:`);
  for (const w of warnings) console.log(`  ~ ${w}`);
  console.log("");
}

if (errors.length) {
  console.log(`FAILED — ${errors.length} error(s):`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}

console.log("PASS — content is structurally valid and no private material is present.");