/**
 * views.js — screen rendering.
 *
 * Each view is (params, query) -> Node. The shell owns the main element; views
 * only build and return content.
 */

import { h, clear, icon, codeBlock, more, sheet, toast, copyText, add } from "./ui.js";
import * as search from "./search.js";
import * as db from "./db.js";
import { href } from "./router.js";
import * as prose from "./prose.js";

export const TECH = {
  aplus:    { label: "CompTIA A+",     varName: "--tech-aplus" },
  cisco:    { label: "Cisco / CCNA",   varName: "--tech-cisco" },
  mikrotik: { label: "MikroTik",       varName: "--tech-mikrotik" },
  win11:    { label: "Windows 11",     varName: "--tech-win11" },
  winserver:{ label: "Windows Server", varName: "--tech-winserver" },
  rhel:     { label: "RHEL 10",        varName: "--tech-rhel" },
  cross:    { label: "Cross-domain",   varName: "--tech-cross" },
};

/** Resolve a subject colour to a CSS variable, never a literal hex inline. */
export function techColor(id) {
  const t = TECH[id];
  return t ? `var(${t.varName})` : "var(--text-faint)";
}

const RISK = {
  safe:    { label: "Read-only",  cls: "badge--safe" },
  caution: { label: "Changes state", cls: "badge--caution" },
  risk:    { label: "Disruptive / destructive", cls: "badge--risk" },
};

const VERIFY_LABEL = {
  "source-checked": "Source-checked",
  "independently-reviewed": "Independently reviewed",
  "execution-tested": "Execution-tested",
  "release-approved": "Release-approved",
};

export function techBadge(techId) {
  const t = TECH[techId];
  if (!t) return null;
  return h("span.badge", { style: { color: `var(${t.varName})` } }, t.label);
}

export function verifyBadge(status) {
  if (!status) return null;
  const s = String(status);
  const known = ["execution-tested", "release-approved", "independently-reviewed", "source-checked"];
  const best = known.find((k) => s.includes(k)) || "source-checked";
  return h("span.vlevel", {
    class: `vlevel v-${best}`,
    title: `Verification: ${s}`,
  }, VERIFY_LABEL[best]);
}

/**
 * Content `kind` values are singular ("command", "lesson"); route segments are
 * plural ("commands", "lessons"). Getting this wrong produces links that look
 * right and navigate nowhere, so every link goes through here.
 */
const ROUTE_FOR_KIND = {
  command: "commands",
  lesson: "lessons",
  scenario: "scenarios",
  quiz: "quizzes",
  project: "projects",
  session: "km",          // Knowledge Map sessions are search results too
  unit: "study",          // Study Manual chapters
  notes: "notes",         // Simple Notes chapters
  library: "library",     // Book locators
};

/** The label shown on a search result row. */
const KIND_LABEL = {
  command: "Command", lesson: "Lesson", scenario: "Scenario",
  quiz: "Quiz", project: "Project", session: "Knowledge Map",
  unit: "Study chapter", notes: "Simple Notes", library: "Book",
};

/** The canonical URL for any content item. */
export function contentHref(doc) {
  if (!doc) return "#/";
  const seg = ROUTE_FOR_KIND[doc.kind] || doc.kind;
  return href(`${seg}/${encodeURIComponent(doc.id)}`);
}

/* ================================================================== home */

export function homeView() {
  const st = search.searchStats();
  const wrap = h("div");

  wrap.appendChild(h("header.page-head",
    h("h1", "Field manual"),
    h("p", "A working reference for the six subjects, plus labs and troubleshooting you can run in a spare virtual machine. Everything here works offline once the app has been opened once."),
  ));

  wrap.appendChild(h("div.stat-row",
    h("div.stat", h("div.stat__n", String(st.commands)), h("div.stat__l", "commands")),
    h("div.stat", h("div.stat__n", String(st.lessons)), h("div.stat__l", "lessons")),
    h("div.stat", h("div.stat__n", String(st.scenarios)), h("div.stat__l", "scenarios")),
    h("div.stat", h("div.stat__n", String(st.quizzes)), h("div.stat__l", "quizzes")),
    h("div.stat", h("div.stat__n", String(st.projects)), h("div.stat__l", "projects")),
  ));

  wrap.appendChild(h("div.cards",
    h("a.card", { href: href("search?q=systemctl") },
      h("div.card__k", "Quick reference"), h("div.card__t", "Find a command"),
      h("div.card__d", "Search by command, task or error text. Every entry says where to run it, what it changes, and how to undo it.")),
    h("a.card", { href: href("subjects") },
      h("div.card__k", "Learning"), h("div.card__t", "Subjects"),
      h("div.card__d", "A+ → CCNA → MikroTik → Windows 11 → Windows Server → RHEL 10, with labs and checks along the way.")),
    h("a.card", { href: href("scenarios") },
      h("div.card__k", "Practice"), h("div.card__t", "Troubleshooting scenarios"),
      h("div.card__d", "Real-shaped faults. Gather evidence first; hints and the investigation path stay hidden until you ask.")),
    h("a.card", { href: href("progress") },
      h("div.card__k", "You"), h("div.card__t", "Progress and weak areas"),
      h("div.card__d", "What you have marked done, and which questions you keep getting wrong.")),
    h("a.card", { href: href("verify") },
      h("div.card__k", "Honesty"), h("div.card__t", "Verification status"),
      h("div.card__d", "What has actually been run versus what has only been read in documentation. Source-checked is not execution-tested.")),
    h("a.card", { href: href("bookmarks") },
      h("div.card__k", "You"), h("div.card__t", "Bookmarks"),
      h("div.card__d", "Anything you starred, kept on this device only.")),
  ));

  wrap.appendChild(h("div.note",
    h("strong", "How to trust a page here"),
    h("span", "Each entry carries a verification badge. “Source-checked” means the syntax was compared with current vendor documentation. “Execution-tested” means it was actually run in a lab. Those are not the same claim, and the manual never blurs them."),
  ));

  return wrap;
}

/* ================================================================== browse */

export function browseView(params, query) {
  const kind = params.kind;
  const pool = (search.CORPUS[kind] || []).slice();
  const wrap = h("div");

  const titles = {
    commands: "Commands", lessons: "Lessons", scenarios: "Scenarios",
    quizzes: "Quizzes", projects: "Projects",
  };
  wrap.appendChild(h("header.page-head",
    h("h1", titles[kind] || "Browse"),
    h("p", kind === "commands"
      ? "Filter by subject, risk and verification status."
      : "Each item opens into its own page."),
  ));

  // filters
  const techSel = query.tech || "";
  const verSel = query.verification || "";
  const riskSel = query.risk || "";

  const mkChip = (label, value, current, onPick) => {
    const b = h("button.chip", { type: "button", "aria-pressed": String(value === current) }, label);
    b.addEventListener("click", () => onPick(value === current ? "" : value));
    return b;
  };

  const go = (patch) => {
    const q = { ...query, ...patch };
    for (const k of Object.keys(q)) if (!q[k]) delete q[k];
    const qs = Object.keys(q).length ? "?" + new URLSearchParams(q).toString() : "";
    location.hash = href(`${kind}`) + qs;
  };

  const techBar = h("div.filters", h("span.filters__label", "Subject"));
  const present = [...new Set(pool.map((d) => d.tech))].filter(Boolean);
  for (const t of present) {
    techBar.appendChild(mkChip(TECH[t] ? TECH[t].label : t, t, techSel, (v) => go({ tech: v })));
  }

  const riskBar = h("div.filters", h("span.filters__label", "Risk"));
  for (const [k, v] of Object.entries(RISK)) riskBar.appendChild(mkChip(v.label, k, riskSel, (x) => go({ risk: x })));

  const verBar = h("div.filters", h("span.filters__label", "Verification"));
  for (const k of Object.keys(VERIFY_LABEL)) verBar.appendChild(mkChip(VERIFY_LABEL[k], k, verSel, (x) => go({ verification: x })));

  wrap.appendChild(techBar);
  if (kind === "commands") { wrap.appendChild(riskBar); wrap.appendChild(verBar); }

  const filtered = pool.filter((d) => {
    if (techSel && d.tech !== techSel) return false;
    if (riskSel && (d.risk || "safe") !== riskSel) return false;
    if (verSel && !(d.verification || "").includes(verSel)) return false;
    return true;
  });

  if (!filtered.length) {
    wrap.appendChild(h("div.empty", h("h2", "Nothing matches these filters"),
      h("p", "Clear a filter, or search instead — search matches command text, aliases and error messages.")));
    return wrap;
  }

  const list = h("div.resultlist");
  for (const d of filtered) list.appendChild(resultRow(d, kind));
  wrap.appendChild(list);
  return wrap;
}

function resultRow(d, kind) {
  // Knowledge Map sessions arrive with kind "session" and must route to the km
  // segment; everything else is passed in already pluralised by the caller.
  const seg = ROUTE_FOR_KIND[d.kind] || kind;
  const a = h("a.result", { href: href(`${seg}/${encodeURIComponent(d.id)}`) },
    h("div.result__t", d.title,
      h("span.kindtag", KIND_LABEL[d.kind] || d.kind),
      techBadge(d.tech),
      d.kind === "command" ? verifyBadge(d.verification) : null,
      d.risk && RISK[d.risk] && d.risk !== "safe"
        ? h("span.badge", { class: `badge ${RISK[d.risk].cls}` }, RISK[d.risk].label) : null),
    d.task ? h("div.result__m", d.task) : null,
    d.summary ? h("div.result__m", d.summary) : null,
    d.commands ? h("div.result__x", firstLine(d.commands)) : null,
  );
  return a;
}

function firstLine(cmds) {
  const t = typeof cmds === "string" ? cmds : cmds.text || "";
  const l = t.split("\n").map((x) => x.trim()).filter((x) => x && !x.startsWith("#"));
  return l[0] || "";
}

/* ================================================================== search page */

export function searchView(params, query) {
  const q = query.q || "";
  const wrap = h("div");
  wrap.appendChild(h("header.page-head",
    h("h1", "Search"),
    h("p", "Matches command text, common aliases, task phrasing and error messages. Works with no network."),
  ));

  if (!q || q.trim().length < 2) {
    wrap.appendChild(h("div.empty",
      h("h2", "Type at least two characters"),
      h("p", "Try a command name, a task like “client can’t get an IP address”, or part of an error message."),
    ));
    return wrap;
  }

  const { results, total, expanded } = search.search(q);
  wrap.appendChild(h("p.srcref", h("strong", String(total)), " result" + (total === 1 ? "" : "s"),
    expanded ? " · no exact match, showing partial matches" : "",
    // Never let the list look complete when it is not.
    total > results.length ? ` · showing the top ${results.length}` : ""));

  if (!results.length) {
    wrap.appendChild(h("div.empty", h("h2", "No matches"),
      h("p", "Nothing matched. Search covers every command, lesson, lab step, troubleshooting entry, quiz question and Knowledge Map session — so try a shorter fragment, or a word you can see on a page.")));
    return wrap;
  }

  const list = h("div.resultlist");
  for (const { doc } of results) list.appendChild(resultRow(doc, doc.kind));
  wrap.appendChild(list);
  return wrap;
}

/* ================================================================== command detail */

export async function commandView(params) {
  const d = search.docById(params.id);
  if (!d || d.kind !== "command") return notFound();

  const risk = RISK[d.risk || "safe"];
  const wrap = h("div");

  wrap.appendChild(h("header.page-head",
    h("h1", d.title),
    h("p", d.task || d.summary),
    h("div.card__meta", techBadge(d.tech),
      h("span.badge", { class: `badge ${risk.cls}` }, risk.label),
      verifyBadge(d.verification),
      d.version ? h("span.badge", d.version) : null),
    objectiveBadges(d),
    kmBacklinks(d),
  ));

  const facts = [];
  if (d.where) facts.push(["Run on", d.where]);
  if (d.privilege) facts.push(["Privilege", d.privilege]);
  if (d.prereq) facts.push(["Prerequisites", d.prereq]);
  if (d.changes) facts.push(["Changes state?", d.changes]);
  if (d.undo) facts.push(["Undo", d.undo]);
  if (d.risks) facts.push(["Risks", d.risks]);
  if (facts.length) {
    const dl = h("dl.facts");
    for (const [k, v] of facts) { dl.appendChild(h("dt", k)); dl.appendChild(h("dd", v)); }
    wrap.appendChild(dl);
  }

  wrap.appendChild(bookmarkBtn(d));

  wrap.appendChild(h("h2", "Command"));
  wrap.appendChild(codeBlock(d.commands, {
    where: d.where || "shell",
    risk: d.risk || "safe",
    tag: d.platform || "command",
  }));

  if (d.explain) wrap.appendChild(more("What each part does", h("div.prose", ...d.explain.map((p) => h("p", p)))));
  if (d.example) add(wrap, h("h2", "Worked example"), h("div.prose", ...d.example.map((p) => h("p", ...paraTokens(p)))));
  if (d.output) add(wrap, h("h2", "Expected result"), codeBlock(d.output, { where: "output", tag: "expected" }));
  if (d.verify && d.verify.length) {
    wrap.appendChild(h("h2", "Confirm it worked"));
    // Real recorded output deserves a heading that says so. A placeholder and
    // a transcript from a live host must not look alike.
    for (const v of d.verify) {
      wrap.appendChild(codeBlock(v, {
        where: d.where || "shell",
        tag: d.tested_on ? "recorded output" : "verify",
      }));
    }
    if (d.tested_on) {
      const t = d.tested_on;
      wrap.appendChild(h("p.srcref",
        `Actually executed on ${t.date} · ${t.os} · kernel ${t.kernel} · ${t.arch} · ` +
        `exit code ${t.exit}. This is recorded output from a live host, not an example.`));
    }
  }
  if (d.errors && d.errors.length) {
    const wrapE = h("div");
    for (const e of d.errors) {
      wrapE.appendChild(h("div.entry",
        h("div.entry__top", h("h3.entry__title", e.message)),
        h("p.entry__sum", e.means),
        e.fix ? codeBlock(e.fix, { where: d.where || "shell", risk: "caution", tag: "fix" }) : null,
      ));
    }
    wrap.appendChild(h("h2", "Common errors"));
    wrap.appendChild(wrapE);
  }
  if (d.sources && d.sources.length) {
    const ul = h("ul.prose");
    for (const s of d.sources) ul.appendChild(h("li",
      s.title ? h("span", h("strong", s.title), " — ") : null,
      s.url ? h("a", { href: s.url, target: "_blank", rel: "noopener noreferrer" }, s.url) : (s.note || ""),
      s.checked ? h("span.srcref", ` (checked ${s.checked})`) : null));
    wrap.appendChild(h("h2", "Sources"));
    wrap.appendChild(ul);
  }
  add(wrap,
    h("h2", "How much to trust this"),
    h("p", h("a", { href: href("verify") }, "See what execution-tested actually means →")),
    h("h2", "Your notes"),
    noteEditor(d.id));

  return wrap;
}

/* ================================================================== lesson */

/* ============================================================= study mode */

/**
 * Read / Recall mode.
 *
 * READ is the ordinary reading experience. RECALL hides every explanation and
 * command behind a "Reveal" control, so the learner has to produce the answer
 * from memory first — which is the part that actually moves retention. The
 * choice is remembered across lessons because it is a study preference, not a
 * per-page one.
 *
 * State lives in localStorage, not IndexedDB: it is a preference, not study
 * progress, and it must work before the database opens.
 */
const STUDY_KEY = "field-manual:study-mode";
let STUDY_MODE = "read";

try { STUDY_MODE = localStorage.getItem(STUDY_KEY) === "recall" ? "recall" : "read"; } catch (_) {}

function setStudyMode(mode) {
  STUDY_MODE = mode === "recall" ? "recall" : "read";
  try { localStorage.setItem(STUDY_KEY, STUDY_MODE); } catch (_) {}
  location.reload(); // the simplest correct re-render; the corpus is already cached
}

/**
 * Content that recall mode hides. `label` describes what the learner should be
 * able to say or type BEFORE revealing, so the prompt is itself the test.
 */
function recallBox(label, ...nodes) {
  if (STUDY_MODE !== "recall") {
    return h("div", ...nodes);
  }
  const body = h("div.recall__body", ...nodes);
  const btn = h("button.btn.recall__btn", { type: "button" }, "Reveal");
  const box = h("div.recall", body, btn);
  btn.addEventListener("click", () => {
    const open = box.hasAttribute("data-open");
    if (open) { box.removeAttribute("data-open"); body.hidden = true; btn.textContent = "Reveal"; }
    else { box.setAttribute("data-open", ""); body.hidden = false; btn.textContent = "Hide"; }
  });
  body.hidden = true;
  return h("div",
    label ? h("p.recall__prompt", h("span.recall__q", "Before you look: "), label) : null,
    box);
}

/** The Read / Recall switch, shown once per lesson. */
function studyControls() {
  const mk = (mode, label, hint) => h("button.seg__btn", {
    type: "button",
    "aria-pressed": STUDY_MODE === mode ? "true" : "false",
    title: hint,
    onclick: () => setStudyMode(mode),
  }, label);
  return h("div.studybar",
    h("div.studybar__label", h("strong", "Mode"),
      h("span", STUDY_MODE === "recall" ? "Recall — explanations hidden until you reveal them" : "Read — everything visible")),
    h("div.seg", mk("read", "Read", "Show everything"),
                mk("recall", "Recall", "Hide explanations until you recall them")),
  );
}

/**
 * Learning objectives for a lesson, derived from the exam objectives it is
 * mapped to. If a lesson has no mapping, this says so honestly rather than
 * inventing objectives.
 */
function learningObjectives(d) {
  const defs = objectiveIndex();
  const items = (d.objectives || []).map((o) => defs.get(o.id)).filter(Boolean);
  if (!items.length) return null;
  const unverified = (d.objectives || []).map((o) => (defs.get(o.id) || {}).exam)
    .filter((e) => e && !e.verified);

  return h("div.objectives",
    h("h2.objectives__h", "What this is for"),
    h("ul",
      items.map((def) => h("li",
        h("span.objectives__code", def.id),
        h("span", (def.text || def.name) + "."),
        def.exam ? h("span.objectives__exam", def.exam.title) : null,
      )),
    ),
    unverified.length
      ? h("p.srcref", "Objective list not verified against the publisher — treat as a coverage hint, not an exam fact.")
      : null,
  );
}

export function lessonView(params) {
  const d = search.docById(params.id);
  if (!d || d.kind !== "lesson") return notFound();
  const wrap = h("div");

  wrap.appendChild(h("header.page-head",
    h("h1", d.title),
    h("p", d.summary),
    h("div.card__meta", techBadge(d.tech),
      verifyBadge(d.verification),
      d.time ? h("span.badge", d.time + " read") : null),
    objectiveBadges(d),
    kmBacklinks(d),
  ));

  wrap.appendChild(studyControls());
  wrap.appendChild(progressBar(d.id));

  const objs = learningObjectives(d);
  if (objs) wrap.appendChild(objs);

  wrap.appendChild(noteEditor(d.id));

  if (d.analogy) wrap.appendChild(h("div.note", h("strong", "In one sentence"), h("span", d.analogy)));

  const sections = d.sections || [];
  if (d.prerequisites && d.prerequisites.length) {
    const ul = h("ul.prose");
    for (const p of d.prerequisites) {
      const target = search.docById(p.id);
      ul.appendChild(h("li", target ? h("a", { href: href(`lessons/${target.id}`) }, p.label || target.title) : (p.label || String(p))));
    }
    add(wrap, h("h2", "Before you start"), ul);
  }

  // Numbered sections so the shape of every lesson is predictable: idea, then
  // the command, then the thing that trips people up.
  sections.forEach((s, i) => {
    wrap.appendChild(h("h2.sec", h("span.sec__n", String(i + 1)), s.h));
    const body = h("div.prose");
    const paras = (s.p || []).map((para) => h("p", ...paraTokens(para)));
    const list = s.list ? h("ul", s.list.map((li) => h("li", ...paraTokens(li)))) : null;
    const code = s.code ? codeBlock(s.code, { where: s.where || d.where || "shell", risk: s.risk || "safe" }) : null;

    const prompt = s.h + " — can you explain it without looking?";
    if (paras.length || list) {
      body.appendChild(recallBox(prompt, ...paras, list));
    }
    if (code) body.appendChild(recallBox("What command or configuration does this need?", code));
    wrap.appendChild(body);
  });

  if (d.lab) {
    wrap.appendChild(h("h2.sec", h("span.sec__n", "L"), "Lab"));
    const steps = h("div.prose");
    d.lab.forEach((step, i) => {
      steps.appendChild(h("p", h("strong", `${i + 1}. `), ...paraTokens(step.text)));
      if (step.cmd) steps.appendChild(h("div",
        recallBox("What would you run for step " + (i + 1) + "?",
          codeBlock(step.cmd, { where: step.where || d.where || "shell", risk: step.risk || "safe" }))));
      if (step.expect) steps.appendChild(h("p.srcref", "Expected: ", ...paraTokens(step.expect)));
    });
    wrap.appendChild(steps);
  }

  if (d.trouble && d.trouble.length) {
    // Converted service profiles carry an investigation chain. Rendered as a
    // walk-through rather than prose, because that is how it is used.
    const steps = h("div.prose");
    d.trouble.forEach((step, i) => {
      steps.appendChild(h("p", h("strong", `${i + 1}. `), ...paraTokens(step)));
    });
    add(wrap, h("h2", "Troubleshooting"), steps);
  }

  if (d.failures && d.failures.length) {
    const ul = h("ul.prose");
    for (const f of d.failures) {
      ul.appendChild(h("li", h("strong", f.why + " "), recallBox("How do you fix it?", paraTokens(f.fix))));
    }
    add(wrap, h("h2", "When it goes wrong"), ul);
  }

  // Emergency quick reference from the converted service profiles.
  if (d.quickRef) {
    add(wrap, h("h2", "Quick reference"),
      recallBox("Recite the commands for this service without looking.",
        codeBlock(d.quickRef, { where: "RHEL shell", risk: "safe", tag: "cheat sheet" })));
  }
  if (d.source) wrap.appendChild(h("p.srcref", d.source));
  // Set when a profile was corrected against a live system rather than
  // documentation — worth showing, because it changes how much the text can
  // be trusted.
  if (d.verifiedNote) wrap.appendChild(h("p.srcref", ...paraTokens(d.verifiedNote)));
  if (d.tested_on && d.tested_on.observed) {
    wrap.appendChild(h("p.srcref", h("strong", "Observed on the host: "), ...paraTokens(d.tested_on.observed)));
  }

  add(wrap, bookmarkBtn(d), noteEditor(d.id));
  wrap.appendChild(h("div.btnrow",
    h("button.btn.btn--primary", { onclick: () => markDone(d) }, "Mark this done"),
    relatedLinks(d),
  ));

  const quizId = d.quiz;
  if (quizId && search.docById(quizId)) {
    wrap.appendChild(h("p.srcref", "Knowledge check: ", h("a", { href: href(`quizzes/${quizId}`) }, search.docById(quizId).title)));
  }
  return wrap;
}

/** `backticks` become <code>, and the text is never interpreted as markup. */
function paraTokens(text) {
  const parts = String(text).split(/`([^`]+)`/g);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) out.push(h("code.inline", parts[i]));
    else out.push(parts[i]);
  }
  return out;
}

function relatedLinks(d) {
  const ids = (d.related || []).map((r) => ({ ref: search.docById(r.id), label: r.label })).filter((x) => x.ref);
  if (!ids.length) return null;
  const box = h("div", h("span.srcref", "Related: "));
  for (const { ref, label } of ids) {
    box.appendChild(h("a", { href: contentHref(ref), style: { marginRight: "12px" } }, label || ref.title));
  }
  return box;
}

async function markDone(d) {
  await db.store.setProgress(d.id, { status: "done" });
  toast(`Marked “${d.title}” done`);
}

/* ================================================================== scenario */

export function scenarioView(params) {
  const d = search.docById(params.id);
  if (!d || d.kind !== "scenario") return notFound();
  const wrap = h("div");

  wrap.appendChild(h("header.page-head",
    h("h1", d.title),
    h("p", d.summary),
    h("div.card__meta", techBadge(d.tech), h("span.badge", d.difficulty || "Intermediate"),
      verifyBadge(d.verification)),
  ));

  wrap.appendChild(h("div.note",
    h("strong", "The situation"),
    h("span", d.situation),
  ));
  if (d.simulated) {
    wrap.appendChild(h("div.note", { style: { borderColor: "var(--text-faint)", background: "var(--surface-2)" } },
      h("strong", "This is a teaching scenario"),
      h("span", d.simulated)));
  }

  wrap.appendChild(h("h2", "Work through it in this order"));
  const steps = h("div.steps");
  const defs = [
    { k: "inspect", label: "1 · Inspect the situation", open: true },
    { k: "hint", label: "2 · Ask for a hint" },
    { k: "review", label: "3 · Review the relevant commands" },
    { k: "investigate", label: "4 · Reveal the investigation path" },
    { k: "solution", label: "5 · Reveal the fix" },
    { k: "verify", label: "6 · Verify the fix" },
    { k: "rootcause", label: "7 · Understand the root cause" },
    { k: "alternatives", label: "8 · Alternative solutions" },
    { k: "prevent", label: "9 · Prevent a recurrence" },
  ];
  for (const def of defs) {
    const content = d.steps && d.steps[def.k];
    if (!content) continue;
    const det = h("details.step");
    if (def.open) det.setAttribute("open", "");
    det.appendChild(h("summary", h("span.step__n", String(defs.indexOf(def) + 1)), def.label));
    const body = h("div.step__body");
    for (const para of (Array.isArray(content) ? content : [content])) {
      if (typeof para === "string") body.appendChild(h("p", ...paraTokens(para)));
      else body.appendChild(codeBlock(para.cmd, { where: para.where || d.where || "shell", risk: para.risk || "safe", tag: para.tag || "" }));
    }
    det.appendChild(body);
    steps.appendChild(det);
  }
  wrap.appendChild(steps);

  if (d.teaches) {
    const ul = h("ul.prose");
    for (const t of d.teaches) ul.appendChild(h("li", ...paraTokens(t)));
    add(wrap, h("h2", "What this exercises"), ul);
  }
  add(wrap, h("h2", "Keep this one"), bookmarkBtn(d), noteEditor(d.id));
  return wrap;
}

/* ================================================================== quiz */

export function quizView(params) {
  const d = search.docById(params.id);
  if (!d || d.kind !== "quiz") return notFound();
  const wrap = h("div");

  wrap.appendChild(h("header.page-head",
    h("h1", d.title),
    h("p", d.summary),
    h("div.card__meta", techBadge(d.tech), h("span.badge", `${(d.questions || []).length} questions`)),
  ));

  const state = { answers: {}, hints: {}, submitted: false };
  const host = h("div");

  const render = () => {
    clear(host);
    (d.questions || []).forEach((q, i) => {
      const block = h("div.quiz__q");
      block.appendChild(h("div.quiz__stem", `${i + 1}. `, ...paraTokens(q.q)));

      if (state.hints[i]) block.appendChild(h("div.quiz__hint", h("strong", "Hint: "), ...paraTokens(state.hints[i])));

      q.options.forEach((opt, oi) => {
        const inputId = `q${i}_${oi}`;
        const input = h("input", {
          type: "radio", name: `q${i}`, id: inputId, value: String(oi),
          checked: state.answers[i] === oi ? true : null,
        });
        const label = h("label.quiz__opt", { for: inputId }, input, h("span", ...paraTokens(opt)));
        if (state.submitted) {
          label.dataset.state = "locked";
          if (q.answer === oi) label.dataset.state = "right";
          else if (state.answers[i] === oi) label.dataset.state = "wrong";
        }
        input.addEventListener("change", () => {
          state.answers[i] = oi;
          if (!state.submitted) render();
        });
        block.appendChild(label);
      });

      if (state.submitted) {
        if (state.answers[i] === q.answer) {
          block.appendChild(h("p.srcref", { style: { color: "var(--ok)" } }, "Correct."));
        } else {
          block.appendChild(h("p.srcref", { style: { color: "var(--danger)" } }, "Not quite."));
        }
        if (q.why) block.appendChild(h("p.prose", h("strong", "Why: "), ...paraTokens(q.why)));
      }
      host.appendChild(block);
    });

    const answered = Object.keys(state.answers).length;
    const total = (d.questions || []).length;

    if (!state.submitted) {
      host.appendChild(h("div.btnrow",
        h("button.btn.btn--primary", {
          disabled: answered < total ? true : null,
          onclick: async () => {
            state.submitted = true;
            let right = 0;
            const weak = [];
            (d.questions || []).forEach((q, i) => {
              if (state.answers[i] === q.answer) right++;
              else weak.push({ id: q.id || `${d.id}:q${i}`, stem: q.q, topic: q.topic || d.title });
            });
            await db.store.saveQuiz(d.id, { answers: state.answers, score: right, submitted_at: Date.now() });
            for (const w of weak) await db.store.setProgress(w.id, { wrong: (w.count = 1) });
            toast(`Scored ${right}/${total}`);
            render();
            host.scrollIntoView({ behavior: "smooth", block: "start" });
          },
        }, answered < total ? `Answer all ${total} questions (${answered}/${total})` : `Check my answers`),
        h("button.btn", {
          onclick: async () => {
            state.submitted = false; state.answers = {};
            await db.store.saveQuiz(d.id, { answers: {}, score: null, submitted_at: null });
            render();
          },
        }, "Reset"),
      ));
    } else {
      const right = (d.questions || []).filter((q, i) => state.answers[i] === q.answer).length;
      host.appendChild(h("div.note.note--ok",
        h("strong", `You scored ${right} of ${(d.questions || []).length}.`),
        h("span", right === total ? "Full marks. Move on to the next topic, or re-run it later to check it stuck."
          : "The ones you missed are recorded on your Progress page so you can come back to just those."),
      ));
      host.appendChild(h("div.btnrow", h("button.btn", { onclick: () => { state.submitted = false; state.answers = {}; render(); } }, "Try again")));
    }
  };

  // staged hint button per question
  wrap.appendChild(host);
  render();

  if ((d.questions || []).some((q) => q.hint)) {
    wrap.appendChild(h("h2", "Need a nudge?"));
    wrap.appendChild(h("p.srcref", "Hints are staged so you try before you read."));
    const box = h("div.btnrow");
    (d.questions || []).forEach((q, i) => {
      if (!q.hint) return;
      const b = h("button.btn", {
        onclick: () => { state.hints[i] = q.hint; render(); b.disabled = true; },
      }, `Hint for question ${i + 1}`);
      box.appendChild(b);
    });
    wrap.appendChild(box);
  }

  return wrap;
}

/* ================================================================== project */

export function projectView(params) {
  const d = search.docById(params.id);
  if (!d || d.kind !== "project") return notFound();
  const wrap = h("div");
  wrap.appendChild(h("header.page-head",
    h("h1", d.title),
    h("p", d.summary),
    h("div.card__meta", techBadge(d.tech), verifyBadge(d.verification)),
  ));
  wrap.appendChild(progressBar(d.id));

  for (const s of d.sections || []) {
    wrap.appendChild(h("h2", s.h));
    const body = h("div.prose");
    for (const para of (s.p || [])) body.appendChild(h("p", ...paraTokens(para)));
    if (s.table) {
      const t = h("table");
      const thead = h("thead", h("tr", ...s.table.head.map((x) => h("th", x))));
      const tbody = h("tbody");
      for (const row of s.table.rows) tbody.appendChild(h("tr", ...row.map((cell) => h("td", ...paraTokens(String(cell))))));
      t.appendChild(thead); t.appendChild(tbody);
      body.appendChild(h("div.tablewrap", t));
    }
    if (s.code) body.appendChild(codeBlock(s.code, { where: s.where || "shell", risk: s.risk || "safe" }));
    if (s.list) { const ul = h("ul"); for (const li of s.list) ul.appendChild(h("li", ...paraTokens(li))); body.appendChild(ul); }
    wrap.appendChild(body);
  }
  wrap.appendChild(h("div.btnrow", h("button.btn.btn--primary", { onclick: () => markDone(d) }, "Mark this done")));
  return wrap;
}

/* ================================================================== subjects */

export function subjectsView() {
  const wrap = h("div");
  wrap.appendChild(h("header.page-head",
    h("h1", "Subjects"),
    h("p", "The order you asked for, with the cross-links that actually matter — DNS on Linux and DNS on Windows Server are the same problem twice."),
  ));

  const order = ["aplus", "cisco", "mikrotik", "win11", "winserver", "rhel"];
  for (const t of order) {
    const lessons = search.CORPUS.lessons.filter((l) => l.tech === t);
    const cmds = search.CORPUS.commands.filter((c) => c.tech === t);
    const scen = search.CORPUS.scenarios.filter((s) => s.tech === t);
    const info = TECH[t];
    wrap.appendChild(h("h2", info.label));
    wrap.appendChild(h("p.srcref", `${lessons.length} lessons · ${cmds.length} commands · ${scen.length} scenarios`));
    if (!lessons.length && !cmds.length) {
      wrap.appendChild(h("div.note", h("strong", "Not written yet"), h("span", "This subject is mapped in CONTENT_MAP.md but has no content yet. Nothing here is filler — the count stays honest.")));
      continue;
    }
    const cards = h("div.cards");
    for (const l of lessons) {
      cards.appendChild(h("a.card", { href: href(`lessons/${l.id}`), style: { "--dot": techColor(t) } },
        h("div.card__k", "Lesson"), h("div.card__t", l.title),
        h("div.card__d", l.summary),
        h("div.card__meta", l.time ? h("span.badge", l.time) : null)));
    }
    wrap.appendChild(cards);
  }
  return wrap;
}

/* ================================================================== progress */

export async function progressView() {
  const wrap = h("div");
  wrap.appendChild(h("header.page-head",
    h("h1", "Progress"),
    h("p", "Stored on this device only. Nothing is uploaded, and clearing your browser data clears this."),
  ));

  const durable = await db.isDurable();
  if (!durable) {
    wrap.appendChild(h("div.errbox", h("strong", "Storage is not available"),
      h("span", "This browser is blocking IndexedDB, so notes and progress will disappear when you close the tab. The reference content still works. Export before you leave if you need to keep anything.")));
  }

  const progress = await db.store.progress();
  const quizzes = await db.store.quizzes();
  const done = progress.filter((p) => p.status === "done");
  const lessons = search.CORPUS.lessons;
  const pct = lessons.length ? Math.round((done.length / lessons.length) * 100) : 0;

  wrap.appendChild(h("div.stat-row",
    h("div.stat", h("div.stat__n", `${pct}%`), h("div.stat__l", "lessons marked done")),
    h("div.stat", h("div.stat__n", String(done.length)), h("div.stat__l", "done")),
    h("div.stat", h("div.stat__n", String(quizzes.filter((q) => q.score !== null && q.score !== undefined).length)), h("div.stat__l", "quizzes attempted")),
    h("div.stat", h("div.stat__n", String(progress.filter((p) => p.wrong).length)), h("div.stat__l", "weak spots")),
  ));

  const weak = progress.filter((p) => p.wrong);
  if (weak.length) {
    wrap.appendChild(h("h2", "Weak spots"));
    const ul = h("ul.prose");
    for (const w of weak) {
      const doc = search.docById(w.id);
      ul.appendChild(h("li", doc ? h("a", { href: contentHref(doc) }, doc.title) : w.id,
        " — missed ", String(w.wrong), " time(s). Read the linked page, then retake the quiz."));
    }
    wrap.appendChild(ul);
  } else {
    wrap.appendChild(h("div.note.note--ok", h("strong", "No weak spots recorded"),
      h("span", "Take a quiz and any question you get wrong shows up here.")));
  }

  wrap.appendChild(h("h2", "Done"));
  if (!done.length) {
    wrap.appendChild(h("p.srcref", { id: "done-empty" }, "Nothing marked done yet."));
  } else {
    const ul = h("ul.prose");
    for (const d of done) {
      const doc = search.docById(d.id);
      ul.appendChild(h("li", doc ? h("a", { href: contentHref(doc) }, doc.title) : d.id,
        h("button.btn", {
          style: { marginLeft: "10px", padding: "2px 8px", fontSize: "12px" },
          onclick: async (ev) => {
            // Capture the element SYNCHRONOUSLY. `currentTarget` is nulled by
            // the browser once dispatch finishes, so reading it after an
            // `await` throws — which it did, silently killing the handler.
            const btn = ev.currentTarget;
            await db.store.setProgress(d.id, { status: "open" });
            // Re-render this view in place. `render` is app.js's job and is not
            // imported here, so undo must not rely on it.
            const row = btn.closest("li");
            if (row) row.remove();
            const note = wrap.querySelector("#done-empty");
            if (note) note.hidden = false;
            if (!wrap.querySelector("ul.prose li")) {
              const heading = [...wrap.querySelectorAll("h2")].find((x) => x.textContent === "Done");
              if (heading && !wrap.querySelector("#done-empty")) {
                heading.after(h("p.srcref", { id: "done-empty" }, "Nothing marked done yet."));
              }
            }
            toast("Marked as not done");
          },
        }, "undo")));
    }
    wrap.appendChild(ul);
  }
  return wrap;
}

/* ================================================================== bookmarks */

export async function bookmarksView() {
  const wrap = h("div");
  wrap.appendChild(h("header.page-head",
    h("h1", "Bookmarks"),
    h("p", "Kept on this device. Included in your export file."),
  ));
  const ids = await db.store.bookmarks();
  if (!ids.length) {
    wrap.appendChild(h("div.empty", h("h2", "No bookmarks yet"),
      h("p", "Use the ☆ button on any command, lesson or scenario to keep it here.")));
    return wrap;
  }
  const list = h("div.resultlist");
  for (const id of ids) {
    const d = search.docById(id);
    if (!d) continue;
    const row = h("div.result");
    row.appendChild(h("a", { href: contentHref(d), style: { color: "inherit" } },
      h("div.result__t", d.title, techBadge(d.tech)),
      d.summary ? h("div.result__m", d.summary) : null));
    list.appendChild(row);
  }
  wrap.appendChild(list);
  return wrap;
}

/* ================================================================== verify page */

export function verifyView() {
  const wrap = h("div");
  wrap.appendChild(h("header.page-head",
    h("h1", "Verification status"),
    h("p", "The manual tells you how far each entry has been taken. These four are not interchangeable, and the strongest claim in this app is “execution-tested”, not “verified”."),
  ));

  const table = h("table",
    h("thead", h("tr", h("th", "Status"), h("th", "What it actually means"), h("th", "What it does not mean"))),
    h("tbody",
      h("tr", h("td", h("span.vlevel.v-source-checked", "Source-checked")),
        h("td", "Syntax and parameters were compared against a named, current vendor or upstream document."),
        h("td", "That anyone ran it. A correct-looking command can still fail on your system because of a missing prerequisite, a firewall, or a version difference.")),
      h("tr", h("td", h("span.vlevel.v-independently-reviewed", "Independently reviewed")),
        h("td", "A second, independent source or a separate review agreed on the important details."),
        h("td", "That it was executed. Two documents can share the same mistake.")),
      h("tr", h("td", h("span.vlevel.v-execution-tested", "Execution-tested")),
        h("td", "It was actually run, and the expected output was observed, in a stated environment on a stated date."),
        h("td", "That it works on your version or your hardware. Lab and production differ.")),
      h("tr", h("td", h("span.vlevel.v-release-approved", "Release-approved")),
        h("td", "It passed this project's own validation gates for a release."),
        h("td", "That it can never break. It is the strongest claim here, not an absolute one.")),
    ));

  wrap.appendChild(h("div.tablewrap", table));

  const byStatus = { "source-checked": 0, "independently-reviewed": 0, "execution-tested": 0, "release-approved": 0 };
  for (const d of search.allDocs()) {
    const v = d.verification || "";
    if (v.includes("execution-tested")) byStatus["execution-tested"]++;
    else if (v.includes("independently-reviewed")) byStatus["independently-reviewed"]++;
    else if (v.includes("source-checked")) byStatus["source-checked"]++;
  }
  wrap.appendChild(h("h2", "Current library"));
  const bars = h("div");
  for (const [k, v] of Object.entries(byStatus)) {
    const pct = search.allDocs().length ? Math.round((v / search.allDocs().length) * 100) : 0;
    bars.appendChild(h("div", { style: { marginBottom: "10px" } },
      h("div", h("strong", VERIFY_LABEL[k] || k), ` — ${v} entries (${pct}%)`),
      h("div.progressbar", h("div.progressbar__fill", { style: { width: pct + "%" } }))));
  }
  wrap.appendChild(bars);

  add(wrap,
    h("h2", "The honest limitation"),
    h("div.note",
      h("strong", "Where this stops"),
      h("span", "Most of this library is built from documentation and your own RHEL 10 virtual machines. Where a command could not be run safely here, the entry says so and gives you a manual validation procedure instead. Nothing in this app claims a test that did not happen.")));

  add(wrap,
    h("h2", "Every reference entry"),
    h("p", h("a", { href: href("commands?verification=execution-tested") }, "Execution-tested commands only →")));

  return wrap;
}

/* ========================================================== knowledge map */

/**
 * The user's own master curriculum: Enterprise_Infrastructure_Knowledge_Map_Unified
 * (146 sessions, 10 layers). The PDF stays in their private library; only a
 * derived outline is shipped, so the app can say where each session connects
 * to the manual without republishing the book.
 */
export function KM() {
  return search.CORPUS.km || null;
}

function kmSession(id) {
  const km = KM();
  return km ? km.sessions.find((s) => s.id === id || String(s.n) === String(id)) : null;
}

/**
 * Knowledge Map sessions that point at a given piece of content — the backlink
 * half of the cross-reference. Shown on every command, lesson and scenario.
 */
export function kmBacklinks(doc) {
  const km = KM();
  if (!km || !doc) return null;
  const hits = km.sessions.filter((s) => (s.manual || []).includes(doc.id));
  if (!hits.length) return null;
  const box = h("div.card__meta");
  box.appendChild(h("span.badge.badge--accent", "Knowledge Map"));
  for (const s of hits) {
    box.appendChild(h("a.badge", { href: href(`km/${s.id}`), title: s.summary },
      `S${s.n} ${s.title}`));
  }
  return box;
}

export function knowledgeMapView() {
  const wrap = h("div");
  const km = KM();

  wrap.appendChild(h("header.page-head",
    h("h1", "Knowledge Map"),
    h("p", "Your master curriculum — " +
      `${km ? km.totalSessions : 146} sessions across ${km ? km.layers.length : 10} layers, ` +
      "from physical hardware up to governance. Each session links to the parts of this manual " +
      "that cover it, so you can move between the roadmap and the hands-on detail in either direction."),
  ));

  if (!km) {
    wrap.appendChild(h("div.empty", h("h2", "Knowledge Map not loaded"),
      h("p", "docs/data/knowledge-map.json did not load. Everything else still works.")));
    return wrap;
  }

  const sessions = km.sessions;
  const linked = sessions.filter((s) => (s.manual || []).length);
  const pct = Math.round((linked.length / sessions.length) * 100);

  wrap.appendChild(h("div.stat-row",
    h("div.stat", h("div.stat__n", String(sessions.length)), h("div.stat__l", "sessions")),
    h("div.stat", h("div.stat__n", String(km.layers.length)), h("div.stat__l", "layers")),
    h("div.stat", h("div.stat__n", String(linked.length)), h("div.stat__l", "linked to the manual")),
    h("div.stat", h("div.stat__n", pct + "%"), h("div.stat__l", "coverage")),
  ));

  wrap.appendChild(h("div.note",
    h("strong", "Source"),
    h("span", `Outline of ${km.source} — ${km.totalPages} pages, prepared July 2026. ` +
      "Session numbers, titles, layers and page ranges were extracted mechanically from the PDF. " +
      "The summaries below are hand-written for this app and are NOT extracted from it. " +
      "The PDF itself is not published here; it stays in your own library."),
  ));

  wrap.appendChild(h("div.note",
    h("strong", "What the numbers mean"),
    h("span",
      "A teal number is how many hands-on items in the field manual cover that topic. " +
      "\\u201cNo hands-on yet\\u201d means the topic has no practice lesson or command written for it — " +
      "the session text itself is complete, it is the drills that are missing. " +
      "Every session's full text is on its own page."),
  ));

  wrap.appendChild(h("h2", "By layer"));

  for (const layer of km.layers) {
    const mine = sessions.filter((s) => s.layer === layer.n);
    const withLinks = mine.filter((s) => (s.manual || []).length).length;
    const share = Math.round((withLinks / mine.length) * 100);

    const section = h("section.layer");
    section.appendChild(h("div.layer__head",
      h("h3", h("span.layer__n", "L" + layer.n), layer.name),
      h("span.layer__count", `${withLinks}/${mine.length} linked`),
    ));
    section.appendChild(h("div.layer__bar", { role: "img",
      "aria-label": `${share}% of ${layer.name} sessions have content in the manual` },
      h("span", { style: { width: share + "%" } })));

    const list = h("ol.sessions");
    for (const s of mine) {
      const n = (s.manual || []).length;

      const link = h("a.session__link", { href: href(`km/${s.id}`) },
        h("span.session__n", String(s.n)),
        h("span.session__body",
          h("span.session__title", s.title),
          h("span.session__sum", s.summary),
        ),
      );
      const item = h("li.session", link);

      // "N in manual" — how many hands-on items link to this session. A bare
      // digit reads as noise (people asked what 2 or 1 meant), so it spells out
      // the unit and expands on click to list the exact items. This is a
      // SIBLING of the row link, never a child: a <button> inside an <a> is
      // invalid, and an <a> inside an <a> makes browsers drop the outer one.
      if (n) {
        const btn = h("button.linkcount", { type: "button", "aria-expanded": "false" },
          String(n), " in manual");
        const panel = h("ul.linklist.linklist--inline", { hidden: true });
        for (const id of s.manual) {
          const doc = search.docById(id);
          panel.appendChild(h("li",
            h("a", { href: doc ? contentHref(doc) : href("km/" + s.id) },
              doc ? doc.title : id),
            doc ? h("span.kindtag", doc.kind) : null,
          ));
        }
        btn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const open = btn.getAttribute("aria-expanded") === "true";
          btn.setAttribute("aria-expanded", open ? "false" : "true");
          panel.hidden = open;
        });
        item.appendChild(h("div.linkcount__wrap", btn, panel));
      } else {
        item.appendChild(h("span.session__gap", {
          title: "This topic has no hands-on lesson or command in the field manual yet. " +
                 "The session text is complete — it is the practice drills that are missing.",
        }, "no hands-on yet"));
      }

      // Jump links, likewise siblings of the row link for the same reason.
      if (s.hasLab || (s.interview && s.interview.length)) {
        item.appendChild(h("span.session__marks",
          s.hasLab
            ? h("a.session__mark", { href: href(`km/${s.id}?to=manual`),
                                   title: "Open this session at the manual's lab steps" }, "Lab")
            : null,
          (s.interview && s.interview.length)
            ? h("a.session__mark", { href: href(`km/${s.id}?to=interview`),
                                   title: "Open this session at the interview questions" },
                s.interview.length + " interview Q")
            : null,
        ));
      }
      list.appendChild(item);
    }
    section.appendChild(list);
    wrap.appendChild(section);
  }

  return wrap;
}

/**
 * Session prose, fetched per session and kept in memory for the session.
 *
 * The corpus is ~2.9 MB across 146 files (~20 KB each), so it is NOT part of
 * the initial payload. Opening a session's chips fetches that one file; the
 * service worker caches it for offline afterwards. `STATUS` is exposed so the
 * UI can say "no content for this section" instead of an empty panel.
 */
const STATUS = new Map();
const CONTENT = new Map();

async function loadSessionContent(id) {
  if (CONTENT.has(id)) return CONTENT.get(id);
  if (STATUS.has(id)) return null;
  STATUS.set(id, "loading");
  try {
    const res = await fetch(`data/km/${id}.json`, { cache: "default" });
    if (!res.ok) throw new Error(String(res.status));
    const json = await res.json();
    CONTENT.set(id, json);
    return json;
  } catch (err) {
    STATUS.set(id, "error");
    return null;
  }
}

/**
 * Writable personal notes for a Knowledge Map session.
 *
 * Your document ships a "Personal notes" section with five prompts — learned,
 * unclear, questions, mistakes, insights. Those are printed read-only. This
 * makes them fillable.
 *
 * Storage: one JSON blob per session in the existing `notes` store, keyed by
 * the session id. That means the existing export/import already carries these
 * notes with no changes — they stay on the device and travel only when you
 * export them yourself.
 */
const KM_NOTE_FIELDS = [
  { k: "learned", label: "Things I learned", ph: "What actually clicked? Write it in your own words." },
  { k: "unclear", label: "Things I still don't understand", ph: "Be specific. A vague note helps nobody." },
  { k: "questions", label: "Questions I still have", ph: "Anything you need to look up or ask." },
  { k: "mistakes", label: "Mistakes I made", ph: "What you got wrong, and what the fix was." },
  { k: "insights", label: "Insights", ph: "Anything the material does not say outright." },
];

function kmNotesEditor(session) {
  const box = h("div.kmnotes");
  const status = h("span.kmnotes__status", { role: "status" });

  const save = async () => {
    const payload = {};
    for (const f of KM_NOTE_FIELDS) payload[f.k] = box.querySelector(`[data-k="${f.k}"]`).value.trim();
    if (!Object.values(payload).some(Boolean)) {
      await db.store.note(session.id, "");
    } else {
      await db.store.note(session.id, JSON.stringify(payload));
    }
    status.textContent = "Saved on this device";
    clearTimeout(save._t);
    save._t = setTimeout(() => { status.textContent = ""; }, 2500);
  };

  for (const f of KM_NOTE_FIELDS) {
    const ta = h("textarea.kmnotes__ta", {
      id: `kmn-${session.id}-${f.k}`,
      rows: 2, placeholder: f.ph, "data-k": f.k,
      "aria-label": f.label,
    });
    let t = null;
    ta.addEventListener("input", () => {
      clearTimeout(t);
      status.textContent = "Saving…";
      t = setTimeout(save, 500);
    });
    // Leaving the field should flush immediately, not wait out the debounce.
    ta.addEventListener("blur", () => { clearTimeout(t); save(); });

    box.appendChild(h("label.kmnotes__field",
      h("span.kmnotes__label", f.label), ta));
  }

  db.store.note(session.id).then((raw) => {
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      for (const f of KM_NOTE_FIELDS) {
        if (saved[f.k]) box.querySelector(`[data-k="${f.k}"]`).value = saved[f.k];
      }
    } catch (_) { /* a plain-text note from an older build; leave the boxes empty */ }
  });

  box.appendChild(h("div.kmnotes__foot",
    h("p.srcref",
      "Private. Saved on this device only, and included when you export your data " +
      "from the storage button in the top bar. Never uploaded."),
    status));

  return h("div.kmnotewrap", box);
}

export function knowledgeSessionView(params) {
  const wrap = h("div");
  const km = KM();
  const s = kmSession(params.id);
  if (!s) return notFound("Knowledge Map session", params.id);

  const label = (n) => {
    const t = km.sessions.find((x) => x.n === n);
    return t ? `S${t.n} ${t.title}` : `S${n}`;
  };

  wrap.appendChild(h("header.page-head",
    h("h1", `Session ${s.n} — ${s.title}`),
    h("p", s.summary),
    h("div.card__meta",
      h("span.badge", `Layer ${s.layer} · ${s.layerName}`),
      h("span.badge", `Pages ${s.page}–${s.endPage}`),
      s.hasLab ? h("span.badge", "Has a lab") : null,
      h("a.badge", { href: href("km") }, "All sessions"),
    ),
  ));

  // --- what the session actually contains -------------------------------
  // Every chip opens the real text from the document. Nothing here is a
  // placeholder: the file is fetched on first open and cached from then on.
  if (s.sections && s.sections.length) {
    wrap.appendChild(h("h2", "Sections in this session"));

    const panel = h("div.kmreader", { id: "kmreader" });
    const chips = h("div.chips", { role: "tablist", "aria-label": "Session sections" });

    const openSection = async (kind, label, btn) => {
      for (const b of chips.querySelectorAll(".chip")) b.setAttribute("aria-selected", "false");
      btn.setAttribute("aria-selected", "true");
      clear(panel);
      panel.appendChild(h("p.srcref", "Loading " + label + "…"));
      const data = await loadSessionContent(s.id);
      clear(panel);
      if (!data) {
        panel.appendChild(h("div.note.note--risk",
          h("strong", "Could not load this section"),
          h("span", "The text for session " + s.n + " could not be read. It has not been " +
            "downloaded yet, and you may be offline.")));
        return;
      }
      const items = (data.sections || {})[kind];
      panel.appendChild(h("h3", label));
      if (!items || !items.length) {
        panel.appendChild(h("p.srcref", "This session has no " + label.toLowerCase() +
          " section in the document."));
        return;
      }
      // The Personal notes section is a set of empty prompts. Printing them
      // above the inputs is just noise — the inputs carry the labels already.
      if (kind !== "notes") {
        const ul = h("ul.prose");
        for (const it of items) ul.appendChild(h("li", ...paraTokens(it)));
        panel.appendChild(ul);
      }
      panel.appendChild(h("p.srcref",
        `From Enterprise_Infrastructure_Knowledge_Map_Unified.pdf, pages ${data.page}–${data.endPage}.`));

      // The document's own "Personal notes" prompts are printed above. Below
      // them sit fillable versions that actually save.
      if (kind === "notes") {
        panel.appendChild(kmNotesEditor(s));
      }
    };

    for (const sec of s.sections) {
      const btn = h("button.chip.chip--btn", {
        type: "button", role: "tab", "aria-selected": "false",
      }, sec.label);
      btn.addEventListener("click", () => openSection(sec.kind, sec.label, btn));
      chips.appendChild(btn);
    }

    wrap.appendChild(chips);
    wrap.appendChild(panel);
    wrap.appendChild(h("p.srcref",
      "Every chip opens the matching text from your document. Each session is " +
      "downloaded once, on first use, then kept for offline."));
  }

  // --- memory anchors: the recall aid ------------------------------------
  if (s.anchors && s.anchors.length) {
    wrap.appendChild(h("h2", { id: "km-anchors" }, "Memory anchors"));
    const ul = h("ul.prose");
    for (const a of s.anchors) ul.appendChild(h("li", ...paraTokens(a)));
    wrap.appendChild(ul);
  }

  // --- the dependency graph ----------------------------------------------
  const deps = s.dependsOn || [];
  const dependents = s.dependents || [];
  if (deps.length || dependents.length) {
    wrap.appendChild(h("h2", { id: "km-deps" }, "How this fits together"));
    const box = h("div.depgraph");
    if (deps.length) {
      box.appendChild(h("div.depgraph__row",
        h("span.depgraph__label", "Needs first"),
        h("div.chips", deps.map((n) => h("a.chip", { href: href(`km/km-${String(n).padStart(3, "0")}`) }, label(n)))),
      ));
    }
    if (dependents.length) {
      box.appendChild(h("div.depgraph__row",
        h("span.depgraph__label", "Built on this"),
        h("div.chips", dependents.map((n) => h("a.chip", { href: href(`km/km-${String(n).padStart(3, "0")}`) }, label(n)))),
      ));
    }
    wrap.appendChild(box);
    wrap.appendChild(h("p.srcref",
      "Links are resolved from the session's own Dependencies and Dependents lists by matching topic " +
      "names to session titles. Only confident matches are kept — generic names like “Services” or " +
      "“Security” are deliberately not linked, so this graph is smaller than the prose but should not " +
      "point anywhere wrong."));
  }

  // --- interview questions: the recall test ------------------------------
  if (s.interview && s.interview.length) {
    wrap.appendChild(h("h2", { id: "km-interview" }, "Interview questions"));
    const ol = h("ol.prose.kmlist");
    for (const q of s.interview) ol.appendChild(h("li", ...paraTokens(q)));
    wrap.appendChild(h("details.more",
      h("summary", `Answer these out loud — ${s.interview.length} question${s.interview.length === 1 ? "" : "s"}`),
      ol,
    ));
  }

  // --- what this manual covers -------------------------------------------
  const docs = (s.manual || []).map((id) => search.docById(id)).filter(Boolean);

  if (!docs.length) {
    wrap.appendChild(h("div.empty",
      h("h2", "No hands-on material in the field manual yet"),
      h("p", "This session has no practice lesson or command written for it. That is a known gap " +
             "in the field manual, not a gap in your curriculum — the full session text is above, " +
             "and every chip opens it. See CONTENT_MAP.md for what is queued next."),
    ));
  } else {
    wrap.appendChild(h("h2", { id: "km-manual" }, `In this manual (${docs.length})`));
    const list = h("ul.linklist");
    for (const d of docs) {
      list.appendChild(h("li",
        h("a", { href: contentHref(d) }, d.title),
        h("span.kindtag", d.kind),
        d.tech ? techBadge(d.tech) : null,
        verifyBadge(d.verification),
      ));
    }
    wrap.appendChild(list);
  }

  // Honour ?to=<section> so the list page's "Lab" / "N interview Q" marks land
  // on the matching heading instead of the top of the session.
  //
  // This MUST be deferred. The view is built before its node is in the
  // document, and app.js's render() calls scrollTo({top:0}) after appending —
  // a synchronous scrollIntoView here is silently undone by that. One frame's
  // timeout runs after both.
  if (params.query && params.query.to) {
    const key = params.query.to;
    setTimeout(() => {
      const target = wrap.querySelector("#km-" + key);
      if (!target) return;
      target.setAttribute("tabindex", "-1");
      const top = target.getBoundingClientRect().top + window.scrollY - 90;
      scrollTo({ top, behavior: "instant" });
      target.classList.add("flash");
      setTimeout(() => target.classList.remove("flash"), 1500);
    }, 0);
  }

  // Sibling sessions, so the map is browsable without going back to the top.
  const layer = km.layers.find((l) => l.n === s.layer);
  if (layer) {
    const siblings = km.sessions.filter((x) => x.layer === s.layer && x.id !== s.id);
    wrap.appendChild(h("h2", `Rest of Layer ${s.layer}`));
    const chips = h("div.chips");
    for (const x of siblings) {
      chips.appendChild(h("a.chip", { href: href(`km/${x.id}`), title: x.summary },
        `${x.n}. ${x.title}`));
    }
    wrap.appendChild(chips);
  }

  return wrap;
}

/* ========================================================== study manual */

/**
 * The personalised study manual: three RHEL guides, 35 units, in the original
 * book order. Built by scripts/build-study-manual.mjs from the user's own
 * guides; the section text is theirs.
 *
 * Unit bodies are separate files under data/study/ and fetched on demand, so
 * the index stays small.
 */
export function STUDY() {
  return search.CORPUS.study || null;
}

const studyCache = new Map();
async function loadStudyUnit(id) {
  if (studyCache.has(id)) return studyCache.get(id);
  try {
    const res = await fetch(`data/study/${id}.json`, { cache: "default" });
    if (!res.ok) return null;
    const j = await res.json();
    studyCache.set(id, j);
    return j;
  } catch (_) { return null; }
}

/** Render one content block, upgrading marker lines and headings. */
function studyBlock(b) {
  const t = String(b.text || "");
  // The guides use consistent prefixes for callouts. Surface them rather than
  // printing "WARNING - ..." as if it were ordinary prose.
  const m = t.match(/^(RHCSA EXAM CRITICAL|EXAM CRITICAL|WARNING|NOTE|Why this matters)\b\s*[—–-]?\s*([\s\S]*)$/);
  if (m) {
    const kind = m[1].toLowerCase();
    const cls = kind.includes("critical") || kind.includes("warning") ? "note--risk"
      : kind.includes("why") ? "note" : "note--ok";
    return h("div", { class: cls ? `note ${cls}` : "note" },
      h("strong", m[1]), h("span", m[2].trim()));
  }
  if (b.level === 2 || b.level === 3) return h("h3", t);
  if (b.level === 4) return h("h4", t);
  return h("p", t);
}

/**
 * Render a run of Study Manual content blocks.
 *
 * Routes through prose.js so a command in the manual is marked exactly the way
 * a command in a book is. Both used to render as a bare <p>, which is why a
 * learner could not tell at a glance which line was one to type and which was
 * an explanation to read.
 */
function renderStudyList(items) {
  return h("div.study__body", prose.renderBlocks(items));
}

const STUDY_STATUS = {
  open:   { label: "Not started", cls: "sst--open",   rank: 0 },
  active: { label: "In progress", cls: "sst--active", rank: 1 },
  done:   { label: "Complete",    cls: "sst--done",   rank: 2 },
};

/**
 * Progress for the 35 study units.
 *
 * Stored in the existing IndexedDB `progress` store keyed by unit id, so it
 * exports, imports and wipes with everything else — no new storage to keep in
 * sync, and nothing to migrate if the schema changes.
 *
 * `done` carries a timestamp because the brief asks to resume from where the
 * learner stopped, which needs "when", not just "what".
 */
async function studyProgressAll() {
  let recs = [];
  try { recs = await db.store.progress(); } catch (_) { return new Map(); }
  const byUnit = new Map();
  for (const r of recs) {
    if (r && r.status && r.id) byUnit.set(r.id, r);
  }
  return byUnit;
}

async function setStudyStatus(unitId, status) {
  const patch = { status, unit: true, at: Date.now() };
  if (status === "done") patch.completed_at = Date.now();
  await db.store.setProgress(unitId, patch);
}

/** Small tri-state control rendered on each unit page. */
function studyStatusControl(unitId, current) {
  const row = h("div.sst");
  const mk = (key, label) => h("button.sst__btn", {
    type: "button",
    "aria-pressed": current === key ? "true" : "false",
    title: key === "done" ? "Mark this unit complete"
        : key === "active" ? "Mark as in progress"
        : "Reset to not started",
    onclick: async () => {
      for (const b of row.querySelectorAll(".sst__btn")) b.setAttribute("aria-pressed", "false");
      mk.buttons[key].setAttribute("aria-pressed", "true");
      await setStudyStatus(unitId, key);
      toast(key === "done" ? "Unit marked complete" : key === "active" ? "Marked as in progress" : "Reset");
    },
  }, label);
  mk.buttons = {};
  for (const [key, meta] of Object.entries(STUDY_STATUS)) {
    const b = mk(key, meta.label);
    mk.buttons[key] = b;
    row.appendChild(b);
  }
  return row;
}

function studyStatusChip(status) {
  const meta = STUDY_STATUS[status] || STUDY_STATUS.open;
  return h("span", { class: `sst-chip ${meta.cls}` }, meta.label);
}

export async function studyManualView() {
  const wrap = h("div");
  const m = STUDY();

  wrap.appendChild(h("header.page-head",
    h("h1", "Study Manual"),
    h("p", m ? m.note : "The study manual has not been loaded."),
  ));

  if (!m || !m.books) {
    wrap.appendChild(h("div.empty", h("h2", "Not built yet"),
      h("p", "Run node/scripts/extract-docx.mjs --all then scripts/build-study-manual.mjs")));
    return wrap;
  }

  let units = 0, words = 0;
  for (const b of m.books) { units += b.units.length; words += b.units.reduce((a, u) => a + u.words, 0); }

  wrap.appendChild(h("div.stat-row",
    h("div.stat", h("div.stat__n", String(m.books.length)), h("div.stat__l", "courses")),
    h("div.stat", h("div.stat__n", String(units)), h("div.stat__l", "units")),
    h("div.stat", h("div.stat__n", words > 9999 ? (words / 1000).toFixed(0) + "k" : String(words)), h("div.stat__l", "words")),
    h("div.stat", { id: "studyDoneStat" }, h("div.stat__n", "…"), h("div.stat__l", "complete")),
  ));

  const prog = await studyProgressAll();
  const done = [...prog.values()].filter((r) => r.status === "done").length;
  const active = [...prog.values()].filter((r) => r.status === "active").length;
  const statEl = wrap.querySelector("#studyDoneStat .stat__n");
  if (statEl) statEl.textContent = `${done}/${units}`;

  // Resume where the learner stopped: the most recently touched unit that is
  // not finished. If everything is done, offer a review pass from the start.
  const openUnits = m.books.flatMap((b) => b.units);
  const inProgress = openUnits
    .filter((u) => { const r = prog.get(u.id); return r && r.status !== "done"; })
    .sort((a, b) => (prog.get(b.id).at || 0) - (prog.get(a.id).at || 0));
  const notStarted = openUnits.filter((u) => !prog.has(u.id));

  if (inProgress.length || notStarted.length) {
    const next = inProgress[0] || notStarted[0];
    const reason = inProgress.length ? "Pick up where you stopped" : "Start the first unit";
    wrap.appendChild(h("div.note.note--ok",
      h("strong", reason),
      h("span", done ? `${done} of ${units} units complete. ` : "",
        h("a", { href: href(`study/${next.id}`) }, next.display)),
      h("div.btnrow", h("a.btn.btn--primary", { href: href(`study/${next.id}`) }, reason)),
    ));
  }

  if (done + active > 0) {
    wrap.appendChild(h("p.srcref",
      `Progress: ${done} complete · ${active} in progress · ${units - done - active} not started. ` +
      "Stored on this device and included when you export your data."));
  }

  wrap.appendChild(h("div.note.note--risk",
    h("strong", "Personalisation status"),
    h("span", m.assessment)));

  for (const b of m.books) {
    const secs = h("section.layer");
    const bDone = b.units.filter((u) => (prog.get(u.id) || {}).status === "done").length;
    secs.appendChild(h("div.layer__head",
      h("h3", h("span.layer__n", b.code), b.title),
      h("span.layer__count", `${bDone}/${b.units.length} complete`)));
    if (b.units.length) {
      secs.appendChild(h("div.layer__bar", { role: "img",
        "aria-label": `${bDone} of ${b.units.length} units complete` },
        h("span", { style: { width: ((bDone / b.units.length) * 100).toFixed(1) + "%" } })));
    }
    secs.appendChild(h("p.srcref", b.blurb));
    const list = h("ol.sessions");
    b.units.forEach((u) => {
      const st = (prog.get(u.id) || {}).status || "open";
      list.appendChild(h("li.session", { class: `session--${st}` },
        h("a.session__link", { href: href(`study/${u.id}`) },
          h("span.session__n", String(u.n)),
          h("span.session__body",
            h("span.session__title", u.display),
            h("span.session__sum",
              `${u.sections} topics · ${u.words.toLocaleString()} words` +
              (u.labs ? ` · ${u.labs} lab${u.labs === 1 ? "" : "s"}` : "") +
              (u.quizzes ? ` · ${u.quizzes} quiz${u.quizzes === 1 ? "" : "zes"}` : "")),
          ),
          studyStatusChip(st),
          u.services ? h("span.badge.badge--accent", `${u.services} svc`) : null,
          u.hasCurrency ? h("span.badge.badge--risk", "check") : null,
        ),
      ));
    });
    secs.appendChild(list);
    wrap.appendChild(secs);
  }

  return wrap;
}

export async function studyUnitView(params) {
  const wrap = h("div");
  const m = STUDY();
  if (!m) return notFound("Study manual", params.id);

  let book = null, unit = null;
  for (const b of m.books) {
    const u = b.units.find((x) => x.id === params.id);
    if (u) { book = b; unit = u; break; }
  }
  if (!unit) return notFound("Study unit", params.id);

  wrap.appendChild(h("header.page-head",
    h("h1", unit.display),
    h("div.card__meta",
      h("span.badge", book.code),
      h("span.badge", unit.exam || book.exam),
      h("span.badge", `${unit.sections} topics`),
      h("span.badge", `${unit.words.toLocaleString()} words`),
      unit.labs ? h("span.badge", `${unit.labs} lab${unit.labs === 1 ? "" : "s"}`) : null,
      unit.quizzes ? h("span.badge", `${unit.quizzes} quiz${unit.quizzes === 1 ? "" : "zes"}`) : null,
    ),
    h("p", book.blurb),
  ));

  const body = h("div.study");
  wrap.appendChild(body);
  body.appendChild(h("p.srcref", "Loading…"));

  const data = await loadStudyUnit(unit.id);
  clear(body);
  if (!data) {
    body.appendChild(h("div.note.note--risk", h("strong", "Could not load"),
      h("span", "This unit has not been downloaded yet, and you may be offline.")));
    return wrap;
  }

  // Progress control sits above the content so it is reachable without
  // scrolling past a 2000-word chapter.
  let currentStatus = "open";
  try {
    const rec = await db.get("progress", unit.id);
    if (rec && rec.status) currentStatus = rec.status;
  } catch (_) { /* no database: still render, just not persisted */ }
  body.appendChild(h("div.study__status",
    studyStatusControl(unit.id, currentStatus)));
  body.appendChild(h("p.srcref",
    "Progress is stored on this device and travels with your export. It is not uploaded."));

  // Currency problems first: they change how the chapter should be read.
  for (const c of data.currency || []) {
    body.appendChild(h("div.note.note--risk",
      h("strong", `${c.severity === "high" ? "Outdated" : "Worth knowing"} — ${c.title}`),
      h("span",
        h("p", h("b", "The guide says: "), c.found),
        h("p", h("b", "Current practice: "), c.current),
        h("p", h("b", "What to do: "), c.action),
        h("p.srcref", `Checked ${c.verified} · ${c.source}`))));
  }

  for (const s of data.sections || []) {
    body.appendChild(h("h2", s.title));
    body.appendChild(renderStudyList(s.content));
  }

  for (const l of data.labs || []) {
    body.appendChild(h("h2", h("span.sec__n", "L"), l.title));
    body.appendChild(renderStudyList(l.content));
  }
  for (const q of data.quizzes || []) {
    body.appendChild(h("h2", h("span.sec__n", "Q"), q.title));
    body.appendChild(renderStudyList(q.content));
  }

  // Service profiles nested under this chapter.
  if (data.services && data.services.length) {
    body.appendChild(h("h2", "Service profiles for this chapter"));
    body.appendChild(h("p.srcref",
      "Reference profiles from the field manual, attached here because they cover this material."));
    const ul = h("ul.linklist");
    for (const s of data.services) {
      const doc = search.docById(s.id);
      ul.appendChild(h("li",
        h("a", { href: doc ? contentHref(doc) : href("km") }, doc ? doc.title : s.id),
        doc ? verifyBadge(doc.verification) : null,
        h("span.kindtag", s.why),
      ));
    }
    body.appendChild(ul);
  }

  // Navigation: previous / next in the ORIGINAL book order.
  const flat = m.books.flatMap((b) => b.units.map((u) => ({ b, u })));
  const i = flat.findIndex((x) => x.u.id === unit.id);
  body.appendChild(h("div.btnrow",
    i > 0 ? h("a.btn", { href: href(`study/${flat[i - 1].u.id}`) }, "← " + flat[i - 1].u.display) : null,
    h("a.btn", { href: href("study") }, "All units"),
    i < flat.length - 1 ? h("a.btn", { href: href(`study/${flat[i + 1].u.id}`) }, flat[i + 1].u.display + " →") : null,
  ));

  return wrap;
}

/* ============================================================ self-check */

/**
 * The learner's own answers to the assessment questions.
 *
 * Step 1 of the brief — "evaluate my understanding" — needs the learner's
 * answers. This app cannot produce them, and must not invent them. What it can
 * do is capture them honestly: the questions, a place to answer, and a record
 * of what was answered, so the next session has something to work from.
 *
 * Until answers exist, `answers` is empty and every assessment-derived claim
 * stays switched off.
 */
const SELF_CHECK_QUESTIONS = [
  { id: "os", q: "Which Linux do you use day to day, and for what — a server, a laptop, containers, all three?" },
  { id: "shell", q: "How comfortable are you with a shell? (moving around, pipes, redirection, writing a script)" },
  { id: "admin", q: "What server administration have you actually done? Nothing counts — say so if nothing." },
  { id: "done", q: "Which of these have you completed hands-on: users and groups, permissions, systemd, SSH, LVM, SELinux, Ansible?" },
  { id: "weak", q: "Which topic do you most want to be able to explain to someone else?" },
  { id: "time", q: "How many hours a week can you genuinely study, and on which days?" },
  { id: "exam", q: "Which exam and when — RHCSA EX200, and roughly what date?" },
];

export function selfCheckView() {
  const wrap = h("div");
  wrap.appendChild(h("header.page-head",
    h("h1", "Assessment"),
    h("p", "Seven questions. Answering them is what turns this from a reference " +
           "into something built around you — at the moment it is a reference."),
  ));

  const box = h("div.selfcheck");
  wrap.appendChild(box);

  const save = async () => {
    const answers = {};
    for (const q of SELF_CHECK_QUESTIONS) {
      const el = box.querySelector(`[data-q="${q.id}"]`);
      const v = String(el.value || "").trim();
      if (v) answers[q.id] = v;
    }
    await db.store.note("__assessment__", JSON.stringify(answers));
    countEl.textContent = answers ? Object.keys(answers).length : 0;
    summary.replaceChildren();
    if (Object.keys(answers).length) {
      summary.appendChild(h("h2", "What you have answered"));
      const dl = h("dl.facts");
      for (const q of SELF_CHECK_QUESTIONS) {
        if (!answers[q.id]) continue;
        dl.appendChild(h("dt", q.q));
        dl.appendChild(h("dd", answers[q.id]));
      }
      summary.appendChild(dl);
    }
    toast(Object.keys(answers).length ? "Assessment saved on this device" : "Assessment cleared");
  };

  const countEl = h("span.study__count", "0");
  wrap.insertBefore(
    h("div.study__statusbar",
      h("span", h("strong", "Answered: "), countEl, " of ", String(SELF_CHECK_QUESTIONS.length)),
      h("button.btn.btn--primary", { type: "button", onclick: save }, "Save answers")),
    box);

  for (const q of SELF_CHECK_QUESTIONS) {
    box.appendChild(h("label.selfcheck__q",
      h("span.selfcheck__label", q.q),
      h("textarea.selfcheck__ta", {
        rows: 3, "data-q": q.id, placeholder: "Be honest — wrong answers are more useful than blanks.",
      })));
  }

  const summary = h("div");
  wrap.appendChild(summary);

  db.store.note("__assessment__").then((raw) => {
    if (!raw) return;
    let a = null;
    try { a = JSON.parse(raw); } catch (_) { return; }
    if (!a) return;
    for (const q of SELF_CHECK_QUESTIONS) {
      if (a[q.id]) box.querySelector(`[data-q="${q.id}"]`).value = a[q.id];
    }
    countEl.textContent = String(Object.keys(a).length);
    summary.appendChild(h("h2", "What you have answered"));
    const dl = h("dl.facts");
    for (const q of SELF_CHECK_QUESTIONS) {
      if (!a[q.id]) continue;
      dl.appendChild(h("dt", q.q));
      dl.appendChild(h("dd", a[q.id]));
    }
    summary.appendChild(dl);
  });

  return wrap;
}

/* =========================================================== simple notes */

/**
 * Plain-English chapter notes.
 *
 * The full chapter text is dense by necessity — it has to carry every detail.
 * These notes are the opposite: one idea at a time, a comparison, one command,
 * what each part means, one sentence to remember. They sit beside the real
 * chapter, never instead of it.
 *
 * The shape is fixed by design so it is learnable: main idea → simple
 * explanation → example → what each part means → remember.
 */
export function NOTES() {
  return search.CORPUS.notes || null;
}

export function notesIndexView() {
  const wrap = h("div");
  const m = NOTES();

  wrap.appendChild(h("header.page-head",
    h("h1", "Simple Notes"),
    h("p", "Every RHEL chapter rewritten in plain English. One idea at a time, with a " +
           "comparison, a command, and what each part of it means. The full chapter text is " +
           "still one click away when you need the detail."),
  ));

  if (!m || !m.chapters) {
    wrap.appendChild(h("div.empty", h("h2", "Not written yet"),
      h("p", "No simple notes have been added.")));
    return wrap;
  }

  const total = m.chapters.reduce((a, c) =>
    a + c.sections.reduce((x, s) => x + s.concepts.length, 0), 0);

  wrap.appendChild(h("div.stat-row",
    h("div.stat", h("div.stat__n", String(m.chapters.length)), h("div.stat__l", "chapters written")),
    h("div.stat", h("div.stat__n", String(total)), h("div.stat__l", "concepts")),
  ));

  if (m.style && m.style.rule) {
    wrap.appendChild(h("div.note",
      h("strong", "The rule these follow"),
      h("span", m.style.rule)));
  }

  const list = h("ol.sessions");
  for (const c of m.chapters) {
    const n = c.sections.reduce((a, s) => a + s.concepts.length, 0);
    list.appendChild(h("li.session",
      h("a.session__link", { href: href(`notes/${c.id}`) },
        h("span.session__n", String(c.n)),
        h("span.session__body",
          h("span.session__title", c.title),
          h("span.session__sum", `${c.book} · ${c.partTitle} · ${n} concept${n === 1 ? "" : "s"}`),
        ),
        h("span.badge.badge--accent", String(n)),
      ),
    ));
  }
  wrap.appendChild(h("section.layer", list));
  return wrap;
}

export function notesChapterView(params) {
  const wrap = h("div");
  const m = NOTES();
  const c = (m && m.chapters || []).find((x) => x.id === params.id);

  if (!c) {
    // Not written yet — offer the full chapter, which does exist.
    const alt = search.docById(c ? c.id : params.id);
    wrap.appendChild(h("div.empty",
      h("h2", "Simple notes for this chapter are not written yet"),
      h("p", "The full chapter is still available."),
      h("div.btnrow",
        h("a.btn", { href: href("notes") }, "All simple notes"),
        alt ? h("a.btn.btn--primary", { href: contentHref(alt) }, "Open the full chapter") : null)));
    return wrap;
  }

  wrap.appendChild(h("header.page-head",
    h("h1", `Chapter ${c.n}: ${c.title} — Complete Simple Notes`),
    h("p", c.partTitle),
    h("div.card__meta",
      h("span.badge", c.book),
      h("span.badge", c.exam),
      h("a.badge", { href: href(`study/${c.id}`) }, "Open the full chapter"),
      h("a.badge", { href: href("notes") }, "All notes"),
    ),
  ));

  for (const s of c.sections) {
    wrap.appendChild(h("h2", h("span.sec__n", "P"), s.title));
    for (const q of s.concepts) {
      const card = h("div.idea");
      card.appendChild(h("h3.idea__h",
        h("span.idea__n", String(q.n)), q.title));

      card.appendChild(h("p.idea__main", h("strong", "Main idea: "), q.main));

      card.appendChild(h("div.idea__block",
        h("strong", "Simple explanation:")));
      const ul = h("ul.prose");
      for (const line of (q.simple || [])) ul.appendChild(h("li", ...paraTokens(line)));
      card.appendChild(ul);

      if (q.warning) {
        card.appendChild(h("div.note.note--risk",
          h("strong", "Watch out"), h("span", q.warning)));
      }

      if (q.example && q.example.length) {
        card.appendChild(h("div.idea__block", h("strong", "Example")));
        card.appendChild(codeBlock(q.example.join("\n"), { where: "shell", risk: "safe" }));
      }

      if (q.parts && q.parts.length) {
        card.appendChild(h("div.idea__block", h("strong", "What each part means:")));
        const dl = h("dl.parts");
        for (const [a, b] of q.parts) {
          dl.appendChild(h("dt", a));
          dl.appendChild(h("dd", ...paraTokens(b)));
        }
        card.appendChild(dl);
      }

      if (q.remember) {
        card.appendChild(h("p.idea__remember", h("strong", "Remember: "), q.remember));
      }
      wrap.appendChild(card);
    }
  }

  if (c.revision && c.revision.length) {
    wrap.appendChild(h("h2", "Final revision — commands to remember"));
    const dl = h("dl.parts");
    for (const [task, cmd] of c.revision) {
      dl.appendChild(h("dt", task));
      dl.appendChild(h("dd", h("code", cmd)));
    }
    wrap.appendChild(dl);
  }
  if (c.inOneSentence) {
    wrap.appendChild(h("div.note.note--ok",
      h("strong", "The whole chapter in one sentence"),
      h("span", c.inOneSentence)));
  }

  return wrap;
}

/* =================================================================== library */

/**
 * Reference books the owner holds on their own machine.
 *
 * This is a locator, not a copy. It lists each book's chapters and modules
 * with page numbers so a search can send you to the right page of the PDF you
 * already own. The books' prose is deliberately not published — the site is
 * public, and these are commercial works.
 */
export function libraryView() {
  const wrap = h("div");
  const lib = search.CORPUS.library;

  wrap.appendChild(h("header.page-head",
    h("h1", "Library"),
    h("p", lib
      ? "Locators for reference books held on your own machine. Search a topic and you " +
        "get the chapter and page — then open your own copy."
      : "No library index has been built."),
  ));

  if (!lib || !lib.books) {
    wrap.appendChild(h("div.empty",
      h("h2", "Nothing indexed yet"),
      h("p", "Run scripts/build-library-index.mjs after extracting the books with pdftotext.")));
    return wrap;
  }

  wrap.appendChild(h("div.note",
    h("strong", "How this works"),
    h("span", lib.copyright)));

  const list = h("ol.sessions");
  for (const b of lib.books) {
    const secs = b.chapters.reduce((a, c) => a + (c.sections ? c.sections.length : 0), 0);
    list.appendChild(h("li.session",
      h("a.session__link", { href: href(`library/${b.id}`) },
        h("span.session__n", String(b.pages)),
        h("span.session__body",
          h("span.session__title", b.title),
          h("span.session__sum",
            `${b.author ? b.author + " · " : ""}${b.chapters.length} chapter${b.chapters.length === 1 ? "" : "s"}` +
            ` · ${secs} section${secs === 1 ? "" : "s"} · ${b.pages} pages`),
        ),
        h("span.badge.badge--accent", String(b.chapters.length)),
      ),
    ));
  }
  wrap.appendChild(h("section.layer", list));
  return wrap;
}

export function libraryBookView(params) {
  const wrap = h("div");
  const lib = search.CORPUS.library;
  const b = lib && (lib.books || []).find((x) => x.id === params.id);

  if (!b) {
    wrap.appendChild(h("div.empty",
      h("h2", "That book is not indexed"),
      h("div.btnrow", h("a.btn", { href: href("library") }, "All books"))));
    return wrap;
  }

  wrap.appendChild(h("header.page-head",
    h("h1", b.title),
    h("p", b.author ? b.author : ""),
    h("div.card__meta",
      h("span.badge", `${b.chapters.length} chapters`),
      h("span.badge", `${b.pages} pages`),
      h("a.badge", { href: href("library") }, "All books"),
    ),
  ));

  for (const c of b.chapters) {
    const head = h("h2", h("span.sec__n", String(c.n)), c.title,
      h("span.pagehint", `page ${c.page}`));
    wrap.appendChild(head);
    if (c.sections && c.sections.length) {
      const ul = h("ul.prose");
      for (const s of c.sections) {
        ul.appendChild(h("li", ...paraTokens(`${s.title} — page ${s.page}`)));
      }
      wrap.appendChild(ul);
    }
    if (c.chunk) {
      wrap.appendChild(h("div.btnrow",
        h("a.btn", { href: href(`library/${b.id}/${c.chunk}`) },
          `Read ${c.words.toLocaleString()} words`)));
    }
  }

  if (b.full) {
    wrap.appendChild(h("div.note.note--ok",
      h("strong", "Full text"),
      h("span", "This book's complete text is in the app, one module at a time, and every word is searchable.")));
  }

  wrap.appendChild(h("div.note",
    h("strong", "Not published here"),
    h("span", lib.copyright)));
  return wrap;
}

/**
 * One module of a book whose full text is published.
 *
 * The chunk is fetched on demand, the same way the Knowledge Map sessions are.
 * Keeping it out of library.json means opening the Library tab does not pull
 * half a megabyte nobody asked for.
 */
const libChunkCache = new Map();
export async function libraryChapterView(params) {
  const wrap = h("div");
  const lib = search.CORPUS.library;
  const b = lib && (lib.books || []).find((x) => x.id === params.book);
  const chapter = b && (b.chapters || []).find((c) => c.chunk === params.id);

  if (!b || !chapter) {
    wrap.appendChild(h("div.empty",
      h("h2", "That chapter is not available"),
      h("div.btnrow", h("a.btn", { href: href("library") }, "Library"))));
    return wrap;
  }

  wrap.appendChild(h("header.page-head",
    h("h1", chapter.title),
    h("p", `${b.title} — module ${chapter.n}, page ${chapter.page}`),
    h("div.card__meta",
      h("span.badge", `${(chapter.words || 0).toLocaleString()} words`),
      h("a.badge", { href: href(`library/${b.id}`) }, "All modules"),
      h("a.badge", { href: href("library") }, "Library"),
    ),
  ));

  const body = h("div.prose");
  body.appendChild(h("p", h("em", "Loading…")));
  wrap.appendChild(body);

  (async () => {
    try {
      let data = libChunkCache.get(params.id);
      if (!data) {
        const res = await fetch(`data/library/${params.id}.json`, { cache: "default" });
        if (!res.ok) throw new Error(String(res.status));
        data = await res.json();
        libChunkCache.set(params.id, data);
      }
      clear(body);
      // Routed through prose.js, so a command in the book is marked the same
      // way a command in the manual is. This was previously a bare <pre>, so
      // every line looked the same and nothing told the reader what to type.
      // It is still built from text nodes only - no innerHTML - so a line of
      // book content can never become markup.
      body.appendChild(h("div.study__body", prose.renderText(data.text)));
      body.appendChild(noteEditor(params.id));
    } catch (err) {
      clear(body);
      body.appendChild(h("div.empty",
        h("h2", "Could not load that chapter"),
        h("p", String(err.message))));
    }
  })();

  return wrap;
}

/* ================================================================== objectives */

/** Exam objectives, verified or explicitly flagged as unverified. */
export function OBJECTIVES() {
  return (search.CORPUS.objectives && search.CORPUS.objectives.exams) || [];
}

function objectiveIndex() {
  const map = new Map();
  for (const ex of OBJECTIVES()) {
    for (const d of ex.domains) map.set(d.id, { ...d, exam: ex });
    for (const s of ex.subtopics) map.set(s.id, { ...s, exam: ex });
  }
  return map;
}

/** Badges for the objectives a piece of content serves. */
export function objectiveBadges(item) {
  if (!item || !item.objectives || !item.objectives.length) return null;
  const idx = objectiveIndex();
  const box = h("div.card__meta");
  for (const o of item.objectives) {
    const def = idx.get(o.id);
    box.appendChild(h("span.badge.badge--accent", {
      title: def ? `${def.exam.title} — ${def.text || def.name}` : o.id,
    }, def ? `${def.exam.id.toUpperCase()} ${o.id.split(".").slice(1).join(".")}` : o.id));
  }
  return box;
}

export function objectivesView() {
  const wrap = h("div");
  const exams = OBJECTIVES();

  wrap.appendChild(h("header.page-head",
    h("h1", "Exam objectives"),
    h("p", "Where each lesson and command sits against a real certification syllabus. Every objective listed here was read from the publisher's own material, with the date it was checked. Anything not confirmed against a primary source is marked UNVERIFIED and should not be quoted as an exam fact."),
  ));

  if (!exams.length) {
    wrap.appendChild(h("div.empty", h("h2", "Objectives not loaded"),
      h("p", "The objectives data file did not load. Everything else in the manual still works.")));
    return wrap;
  }

  const idx = objectiveIndex();
  const tagged = search.allDocs().filter((d) => d.objectives && d.objectives.length);

  wrap.appendChild(h("div.stat-row",
    h("div.stat", h("div.stat__n", String(exams.length)), h("div.stat__l", "exams mapped")),
    h("div.stat", h("div.stat__n", String(idx.size)), h("div.stat__l", "objectives recorded")),
    h("div.stat", h("div.stat__n", String(tagged.length)), h("div.stat__l", "items mapped to an objective")),
    h("div.stat", h("div.stat__n", String(search.allDocs().length - tagged.length)), h("div.stat__l", "not yet mapped")),
  ));

  const unverified = exams.filter((e) => !e.verified);
  if (unverified.length) {
    wrap.appendChild(h("div.note.note--risk",
      h("strong", "Unverified objectives"),
      h("span", unverified.map((e) => e.title).join(", ") + " — the task areas below are plausible and long-standing, but they have NOT been extracted from an official objectives document. Treat them as a coverage checklist, not as an exam blueprint."),
    ));
  }

  for (const ex of exams) {
    wrap.appendChild(h("h2", ex.title,
      " ",
      h("span.badge", { class: ex.verified ? "badge--safe" : "badge--risk" },
        ex.verified ? "Verified" : "Unverified")));
    wrap.appendChild(h("p.srcref", ex.code));

    if (!ex.verified && ex.verifyNote) {
      wrap.appendChild(h("div.note", h("strong", "Why this is unverified"), h("span", ex.verifyNote)));
    }

    if (ex.coverageCaveat) {
      wrap.appendChild(h("div.note.note--risk",
        h("strong", "Coverage caveat"),
        h("span", ex.coverageCaveat)));
    }

    const table = h("table",
      h("thead", h("tr", h("th", "Objective"), h("th", "Weight"), h("th", "Covers in this manual"))),
      h("tbody"));
    const rows = [];
    for (const d of ex.domains) rows.push({ def: d, subs: [] });
    for (const s of ex.subtopics) {
      const r = rows.find((x) => x.def.id === s.domain);
      if (r) r.subs.push(s); else rows.push({ def: s, subs: [] });
    }
    for (const r of rows) {
      const hits = search.allDocs().filter((d) =>
        (d.objectives || []).some((o) => o.id === r.def.id || r.subs.some((s) => s.id === o.id)));
      const tr = h("tr",
        h("td", h("code", r.def.id), " ", r.def.name || r.def.text),
        h("td", r.def.weight ? r.def.weight + "%" : "—"),
        h("td", hits.length
          ? hits.slice(0, 6).map((x) => h("div",
              h("a", { href: contentHref(x) }, x.title)))
          : h("span.srcref", "not covered yet")),
      );
      if (hits.length > 6) tr.lastChild.appendChild(h("span.srcref", ` +${hits.length - 6} more`));
      table.querySelector("tbody").appendChild(tr);
    }
    wrap.appendChild(h("div.tablewrap", table));

    wrap.appendChild(h("p.srcref", "Source: ",
      ex.source ? h("a", { href: ex.source, target: "_blank", rel: "noopener noreferrer" }, ex.source) : "—",
      ex.checked ? ` — checked ${ex.checked}` : "",
      ex.sourceNote ? h("span", " · " + ex.sourceNote) : null));
  }

  return wrap;
}

/* ================================================================== pieces */

function progressBar(id) {
  const bar = h("div.progressbar", h("div.progressbar__fill", { style: { width: "0%" } }));
  // READ the record, never write it. Writing here created a progress entry for
  // every page merely opened, which then showed up as "Done" work that never
  // happened. `setProgress` resolves with the KEY, not the record, so the old
  // code also always computed 0%.
  db.get("progress", id).then((rec) => {
    const pct = rec && rec.status === "done" ? 100 : 0;
    bar.firstChild.style.width = pct + "%";
    bar.setAttribute("aria-valuenow", String(pct));
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", pct === 100 ? "Marked done" : "Not marked done");
  });
  return bar;
}

function bookmarkBtn(d) {
  const btn = h("button.btn", "☆ Bookmark");
  const show = (on) => {
    btn.textContent = on ? "★ Bookmarked" : "☆ Bookmark";
    btn.setAttribute("aria-pressed", String(on));
  };
  // Guard against the initial read landing after a fast click and overwriting
  // the label with the pre-click state.
  let current = false;
  db.store.isBookmarked(d.id).then((on) => {
    if (btn.dataset.touched) return;
    current = !!on;
    show(current);
  });
  btn.addEventListener("click", async () => {
    btn.dataset.touched = "1";
    current = await db.store.toggleBookmark(d.id);
    show(current);
    toast(current ? "Bookmarked" : "Bookmark removed");
  });
  return h("div.btnrow", btn);
}

function noteEditor(id) {
  const ta = h("textarea", { placeholder: "Your note (private, on this device, included in export)…", rows: 3 });
  const status = h("span.srcref");
  db.store.note(id).then((t) => { ta.value = t || ""; });
  let t = null;
  ta.addEventListener("input", () => {
    clearTimeout(t);
    status.textContent = "Saving…";
    t = setTimeout(async () => {
      await db.store.note(id, ta.value.trim());
      status.textContent = ta.value.trim() ? "Saved on this device" : "";
    }, 400);
  });
  return h("div", { style: { margin: "0 0 18px" } }, ta, h("div", status));
}

function notFound() {
  return h("div.empty", h("h2", "Not found"),
    h("p", "That page does not exist in this build. It may be content that has not been written yet."),
    h("div.btnrow", h("a.btn", { href: href("") }, "Back to the field manual")));
}

export { resultRow, paraTokens, notFound };