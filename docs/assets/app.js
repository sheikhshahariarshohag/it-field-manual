/**
 * app.js — boot, navigation, data loading.
 *
 * Load order matters: the corpus is fetched and indexed BEFORE the first
 * render, so search is never briefly broken.
 */

import { h, clear, icon, toast, sheet } from "./ui.js";
import * as search from "./search.js";
import * as db from "./db.js";
import * as V from "./views.js";
import * as SUBJ from "./subjects.js";
import * as SV from "./subject-views.js";
import { route, start, resolve, href, currentRoute } from "./router.js";
import * as TR from "./translate.js";
import { initViewMode, viewModeToggle } from "./viewmode.js";

const main = document.getElementById("main");
/*
 * Five lists now, not four. The old "#navPrimary" held the mixed top-level
 * rows; those are split into the rows above the accordions (#navTop) and the
 * rows below them (#navTop2), so the accordions sit between the two without
 * anything being nested inside a group it does not belong to.
 *
 * #navPractice and #navProject were the same element for a while, reached
 * through two names, which is why clearing one silently emptied the other.
 * They are separate lists now and each has exactly one name.
 */
const navTop = document.getElementById("navTop");
const navTop2 = document.getElementById("navTop2");
const navSubjects = document.getElementById("navSubjects");
const navPracticeList = document.getElementById("navPractice");
const navProject = document.getElementById("navProject");

const SUBJECT_ORDER = ["aplus", "cisco", "mikrotik", "win11", "winserver", "rhel"];

/** The loaded corpus. Module-scoped because the nav is built from it. */
let corpus = null;

/* ------------------------------------------------------------------ data */

async function loadCorpus() {
  const base = "data";
  const groups = {
    commands: ["commands/index", "commands/cisco", "commands/windows", "commands/mikrotik"],
    // A kind can be split across several files: hand-written lessons, the
    // converted RHEL service profiles, and the networking / Windows lessons.
    lessons: ["lessons/index", "lessons/services", "lessons/networking", "lessons/windows"],
    scenarios: ["scenarios/index"],
    quizzes: ["quizzes/index"],
    projects: ["projects/index"],
  };
  const out = { commands: [], lessons: [], scenarios: [], quizzes: [], projects: [] };

  await Promise.all(Object.entries(groups).map(async ([key, files]) => {
    for (const f of files) {
      try {
        const res = await fetch(`${base}/${f}.json`, { cache: "no-cache" });
        if (!res.ok) throw new Error(String(res.status));
        const list = await res.json();
        const items = Array.isArray(list) ? list : (list.items || []);
        // Merge rather than replace: several files can contribute one kind.
        out[key] = out[key].concat(items);
      } catch (err) {
        console.warn(`[field-manual] no content for ${f}:`, err.message);
      }
    }
  }));

    // Exam objectives and the Knowledge Map are single objects, not lists, so
  // they are loaded separately from the per-kind groups.
  for (const [key, file] of [["objectives", "exam-objectives"], ["km", "knowledge-map"], ["study", "study-manual"], ["notes", "simple-notes"], ["library", "library"], ["documents", "documents"]]) {
    try {
      const res = await fetch(`${base}/${file}.json`, { cache: "no-cache" });
      if (res.ok) out[key] = await res.json();
      else console.warn(`[field-manual] ${file}.json returned ${res.status}`);
    } catch (err) {
      console.warn(`[field-manual] ${file}.json unavailable:`, err.message);
    }
  }

  search.loadCorpus(out);
  return out;
}

/* ------------------------------------------------------------------ nav */

/**
 * One navigation row.
 *
 * `opts.icon`   a glyph name from ui.js ICON_PATHS, for the top-level items
 * `opts.dot`    the subject colour dot, for the subject list
 * `opts.count`  a number, rendered as a pill badge rather than as loose text
 *
 * The count used to be bare text pushed to the right edge with
 * `margin-left: auto`, which is why the numbers read as stray characters
 * floating at the edge of the column rather than as part of the label.
 */
function navLink(label, routeStr, opts = {}) {
  const a = h("a.navlink", { href: href(routeStr) });
  if (opts.icon) a.appendChild(icon(opts.icon, "navlink__icon"));
  if (opts.dot) a.appendChild(h("span.navlink__dot", { style: { "--dot": opts.dot } }));
  a.appendChild(h("span.navlink__label", label));
  if (opts.count !== undefined && opts.count !== null && opts.count !== "") {
    a.appendChild(h("span.navlink__count", String(opts.count)));
  }
  // A progress bar only where there is real progress to show. `opts.progressKey`
  // names the group it belongs to; the width is filled in later by
  // paintNavProgress(), because the numbers live in IndexedDB and this runs
  // synchronously.
  if (opts.progressKey) {
    const bar = h("span.navlink__bar", { "aria-hidden": "true" },
      h("i", { style: { transform: "scaleX(0)" } }));
    a.appendChild(bar);
    a.dataset.progressKey = opts.progressKey;
  }
  return h("li", a);
}

/*
 * Top-level rows sit flush left with an icon. Sub-items sit indented under
 * their group with a guide line, so the hierarchy is visible without reading
 * the labels - which was the complaint: RHEL, Commands and Simple Notes looked
 * exactly like Home and Bookmarks did.
 */
function buildNav() {
  const st = search.searchStats();
  const kmSessions = corpus && corpus.km ? corpus.km.totalSessions : 0;
  const studyUnits = corpus && corpus.study
    ? corpus.study.books.reduce((a, b) => a + (b.units || []).length, 0)
    : 39;

  clear(navTop);
  navTop.appendChild(navLink("Home", "", { icon: "home" }));

  clear(navTop2);
  navTop2.appendChild(navLink("My progress", "progress", { icon: "progress" }));
  navTop2.appendChild(navLink("Quizzes", "quizzes", { icon: "quiz", count: st.quizzes }));
  navTop2.appendChild(navLink("Projects", "projects", { icon: "project", count: st.projects }));
  navTop2.appendChild(navLink("Bookmarks", "bookmarks", { icon: "bookmark" }));
  navTop2.appendChild(navLink("Flashcards", "flashcards", { icon: "quiz" }));

  clear(navSubjects);
  for (const s of SUBJ.SUBJECTS) {
    navSubjects.appendChild(navLink(s.label, `subjects/${s.id}`, {
      dot: s.varName,
      progressKey: `subject:${s.id}`,
    }));
  }

  clear(navPracticeList);
  navPracticeList.appendChild(navLink("Troubleshooting", "scenarios", { count: st.scenarios }));
  navPracticeList.appendChild(navLink("Commands", "commands", { count: st.commands }));
  navPracticeList.appendChild(navLink("Study manuals", "study", {
    count: studyUnits, progressKey: "study",
  }));
  // Knowledge Map has no bar: session reading is not recorded anywhere, so a
  // bar there would be a number this app cannot honestly produce.
  navPracticeList.appendChild(navLink("Knowledge Map", "km", { count: kmSessions }));

  clear(navProject);
  navProject.appendChild(navLink("Simple Notes", "notes"));
  navProject.appendChild(navLink("Library", "library"));
  navProject.appendChild(navLink("Assessment", "assessment"));
  navProject.appendChild(navLink("Exam objectives", "objectives"));
  navProject.appendChild(navLink("Verification status", "verify"));
}

/**
 * Fill the sidebar progress bars with what is actually stored.
 *
 * WHAT IS MEASURED
 * A bar shows the share of that group's study units marked "Complete". That is
 * the only progress this app records: the `progress` store holds one entry per
 * study unit with a status of open / active / done (see STUDY_STATUS in
 * views.js, which owns that vocabulary).
 *
 * WHY ONLY "DONE" COUNTS
 * "In progress" is a state a unit can sit in indefinitely without advancing,
 * so counting it would let a bar read as 60% finished when half the reading was
 * never started. A bar that cannot be wrong is worth more than a smooth one.
 *
 * WHY THERE IS NO BAR EVERYWHERE
 * Commands, lessons, scenarios, quizzes and every Knowledge Map session are
 * not tracked at all. There is no honest fraction to draw for them, so they get
 * no bar rather than a decorative one.
 *
 * Runs after the nav is built and again after the reader changes a status, so
 * marking a unit complete moves the bar without a reload.
 */
async function paintNavProgress() {
  let records = [];
  try { records = await db.store.progress(); } catch (_) { records = []; }

  const done = new Map();
  for (const p of records) {
    if (p && p.status === "done" && p.id) done.set(p.id, true);
  }

  /** Which study unit ids belong to one group, and how many there are in all. */
  const groups = new Map();
  const add = (key, ids) => {
    const g = groups.get(key) || { ids: [], total: 0 };
    for (const id of ids) { g.ids.push(id); g.total++; }
    groups.set(key, g);
  };

  const m = corpus && corpus.study ? corpus.study : null;
  if (m && Array.isArray(m.books)) {
    for (const b of m.books) {
      for (const u of b.units || []) add("study", [u.id]);
      for (const u of b.units || []) add(`book:${b.id}`, [u.id]);
    }
  }
  for (const s of SUBJ.SUBJECTS) {
    const ids = [];
    try {
      const r = SUBJ.resourcesFor(s.id);
      for (const u of r.studyUnits) ids.push(u.id);
    } catch (_) { /* a subject with no study units */ }
    const key = `subject:${s.id}`;
    const g = groups.get(key) || { ids: [], total: 0 };
    g.ids.push(...ids);
    g.total += ids.length;
    groups.set(key, g);
  }

  let shown = 0;
  for (const link of document.querySelectorAll(".navlink[data-progress-key]")) {
    const g = groups.get(link.dataset.progressKey);
    const fill = link.querySelector(".navlink__bar i");
    if (!fill) continue;
    if (!g || !g.total) { fill.style.transform = "scaleX(0)"; continue; }
    const complete = g.ids.filter((id) => done.get(id)).length;
    const frac = g.total ? complete / g.total : 0;
    fill.style.transform = `scaleX(${frac.toFixed(4)})`;
    // The number beside the label already says how many items there are. The
    // bar's own value is for a screen reader as a proportion of the whole.
    fill.parentElement.title = complete === g.total && g.total
      ? `All ${g.total} complete`
      : `${complete} of ${g.total} study units complete`;
    shown++;
  }
  return shown;
}

/**
 * Collapsible groups in the app sidebar.
 *
 * Each group's heading is a real button with aria-expanded and aria-controls,
 * so it works from the keyboard and announces its state. The choice is
 * remembered per group, because a sidebar that forgets which groups you had
 * folded is a sidebar you have to set up again on every visit.
 *
 * `display: none` on the collapsed list removes it from the layout, so the
 * remaining groups move up rather than leaving a hole - which is the whole
 * reason to collapse something.
 */
function initSidebarGroups() {
  const KEY = "field-manual:nav-groups";
  const blocks = [...document.querySelectorAll(".sidenav__block")];
  if (!blocks.length) return;

  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { /* private mode */ }

  /*
   * The collapsed state is carried by a class on the BLOCK, not by a CSS
   * sibling selector on the button.
   *
   * The markup is <section><h2><button/></h2><ul/></section>, so the list is
   * a sibling of the heading, not of the button. A selector like
   * `.sidenav__toggle[aria-expanded="false"] + .sidenav__list` therefore never
   * matched anything: the button's next sibling does not exist. aria-expanded
   * is still set, because it is what a screen reader announces, but the class
   * is what the stylesheet keys on.
   */
  const setOpen = (block, open, persist) => {
    block.querySelector(".sidenav__toggle").setAttribute("aria-expanded", open ? "true" : "false");
    block.classList.toggle("is-collapsed", !open);
    if (persist) {
      const now = {};
      for (const b of blocks) {
        now[b.dataset.group] = !b.classList.contains("is-collapsed");
      }
      try { localStorage.setItem(KEY, JSON.stringify(now)); } catch (_) { /* private */ }
    }
  };

  for (const block of blocks) {
    const name = block.dataset.group;
    if (Object.prototype.hasOwnProperty.call(saved, name)) setOpen(block, !!saved[name], false);
    block.querySelector(".sidenav__toggle").addEventListener("click", () => {
      setOpen(block, block.classList.contains("is-collapsed"), true);
    });
  }

  revealActiveNavGroup();
  addEventListener("hashchange", revealActiveNavGroup);
}

/**
 * Open the sidebar group that holds the page you are on.
 *
 * markNav() sets aria-current on the active link, but if that link sits inside
 * a group the reader has folded, the sidebar shows nothing highlighted and
 * looks broken. Called after every render and on every hash change.
 */
function revealActiveNavGroup() {
  const cur = document.querySelector('.navlink[aria-current="page"]');
  if (!cur) return;
  const block = cur.closest(".sidenav__block");
  if (!block || !block.classList.contains("is-collapsed")) return;
  const KEY = "field-manual:nav-groups";
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (_) { /* private */ }
  saved[block.dataset.group] = true;
  block.classList.remove("is-collapsed");
  block.querySelector(".sidenav__toggle").setAttribute("aria-expanded", "true");
  try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (_) { /* private */ }
}

/** Highlight the nav item matching the current route. */
function markNav() {
  const cur = currentRoute();
  if (!cur) return;
  const key = cur.path.slice(0, 2).join("/");
  for (const a of document.querySelectorAll(".navlink")) {
    const target = (a.getAttribute("href") || "").replace(/^#\/?/, "");
    const tKey = target.split("/").slice(0, 2).join("/");
    const on = target === cur.raw || (key && tKey === key) ||
      (cur.path[0] === "subjects" && target === cur.raw);
    if (on) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
}

/* ------------------------------------------------------------------ drawer */

function initDrawer() {
  const nav = document.getElementById("sidenav");
  const scrim = document.getElementById("scrim");
  const btn = document.getElementById("menuBtn");

  const setOpen = (open) => {
    nav.dataset.open = open ? "1" : "0";
    scrim.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      const first = nav.querySelector(".navlink");
      if (first) first.focus();
    }
  };

  btn.addEventListener("click", () => setOpen(nav.dataset.open !== "1"));
  scrim.addEventListener("click", () => setOpen(false));
  nav.addEventListener("click", (e) => { if (e.target.closest(".navlink")) setOpen(false); });
  addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
}

/* ------------------------------------------------------------------ theme */

function initTheme() {
  const KEY = "field-manual:theme";
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (_) { /* private mode */ }

  // LIGHT IS THE DEFAULT for a first-time visitor.
  //
  // Previously the attribute was only set when a value had been saved, so
  // with nothing stored the element carried no data-theme at all - and the
  // `prefers-color-scheme: dark` block in app.css applies to
  // `html:not([data-theme="light"])`. A visitor whose operating system was set
  // to dark therefore got dark on their very first visit, which is the
  // opposite of the intended primary experience.
  //
  // The attribute is now always set, so the system preference can never win.
  // A previously saved choice still wins over this, so an existing user who
  // deliberately chose dark keeps it - no migration of their setting is
  // needed, because the saved value is already honoured here.
  root.setAttribute("data-theme", saved === "dark" ? "dark" : "light");

  document.getElementById("themeBtn").addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark" ||
      (!root.hasAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(KEY, next); } catch (_) { /* ignore */ }
  });
}

/* ------------------------------------------------------------------ translate */

/**
 * The optional Bangla translation control (translate.js).
 *
 * The widget itself is only fetched once the reader picks Bangla, so an
 * English reader never talks to Google. The chooser reuses the standard sheet
 * so it looks and behaves like every other dialog in the app.
 */
function initLang() {
  TR.initTranslate();
  const btn = document.getElementById("langBtn");
  if (!btn) return;

  const paint = () => {
    const on = TR.getLang() === "bn";
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-label", on ? "Translation: Bangla (change)" : "Translate this page");
  };
  paint();

  btn.addEventListener("click", () => {
    const current = TR.getLang();
    sheet({
      title: "Translate this page",
      submitLabel: "Apply",
      fields: [{ name: "lang", label: "Language", type: "select", options: ["English", "বাংলা (Bangla)"] }],
      extra: h("p.srcref", "Bangla translation is provided by Google Translate. It needs an internet " +
        "connection, and it can translate technical terms, commands and code incorrectly — treat the " +
        "English original as the source of truth."),
      onSubmit: (v, close) => {
        const chosen = String(v.lang).startsWith("বাংলা") ? "bn" : "en";
        close();
        if (chosen !== current) TR.setLang(chosen);
      },
    });
    const sel = document.querySelector("#sheetHost select");
    if (sel) sel.value = current === "bn" ? "বাংলা (Bangla)" : "English";
  });
}

/* ------------------------------------------------------------------ search box */

function initSearchBox() {
  const input = document.getElementById("q");
  const clearBtn = document.getElementById("searchClear");
  const form = document.getElementById("searchForm");

  const params = () => new URLSearchParams(location.hash.split("?")[1] || "");

  const syncFromHash = () => {
    const q = params().get("q");
    if (document.activeElement !== input) input.value = q || "";
    clearBtn.hidden = !input.value;
  };

  input.addEventListener("input", () => {
    clearBtn.hidden = !input.value;
    const q = input.value.trim();
    if (!q) {
      if (location.hash.startsWith("#/search")) location.hash = href("");
      return;
    }
    if (q.length < 2) return;
    // replaceState does NOT fire hashchange, so the router must be re-run by
    // hand or currentRoute() stays stale and the results never update.
    history.replaceState(null, "", href("search") + "?q=" + encodeURIComponent(q));
    resolve();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q.length >= 2) {
      location.hash = href("search") + "?q=" + encodeURIComponent(q);
    }
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    clearBtn.hidden = true;
    input.focus();
    location.hash = href("");
  });

  addEventListener("keydown", (e) => {
    if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === "Escape" && document.activeElement === input) {
      input.value = "";
      clearBtn.hidden = true;
      input.blur();
    }
  });

  syncFromHash();
  return syncFromHash;
}

/* ------------------------------------------------------------------ data panel */

function initDataPanel() {
  document.getElementById("dataBtn").addEventListener("click", async () => {
    const stats = search.searchStats();
    const durable = await db.isDurable();
    const notes = await db.store.notes();
    const marks = await db.store.bookmarks();

    const extra = h("div", { style: { marginTop: "6px" } },
      h("p.srcref", `${stats.docs} packaged entries · ${notes.length} personal notes · ${marks.length} bookmarks`),
      durable ? null : h("div.note.note--risk", h("strong", "Storage blocked"),
        h("span", "This browser is not allowing IndexedDB. Notes and progress will not survive a reload. Export now if you need them.")),
      h("div.btnrow",
        h("button.btn.btn--primary", { type: "button", onclick: doExport }, "Export my data"),
        h("button.btn", { type: "button", onclick: doImport }, "Import my data"),
        h("button.btn.btn--danger", { type: "button", onclick: doWipe }, "Erase everything"),
      ),
    );

    sheet({
      title: "My data",
      submitLabel: "Close",
      fields: [
        { name: "info", label: "Where this is stored", type: "text" },
      ],
      extra,
      onSubmit: (_v, close) => close(),
    });
    // Replace the read-only info field with an explanation.
    const info = document.querySelector("#sheetHost input");
    if (info) { info.readOnly = true; info.value = durable ? "This device only (IndexedDB). Never uploaded." : "Not available in this browser"; }
  });
}

async function doExport() {
  const payload = await db.exportPersonal();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const a = h("a", { href: url, download: `it-field-manual-${stamp}.json` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast("Exported. Keep this file somewhere safe.");
}

function doImport() {
  const input = h("input", { type: "file", accept: "application/json,.json", style: { display: "none" } });
  document.body.appendChild(input);
  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    input.remove();
    if (!file) return;
    try {
      if (file.size > 32 * 1024 * 1024) throw new db.ImportError("That file is too large to be a personal-data export.");
      const text = await file.text();
      const r = await db.importPersonal(text);
      const problems = r.problems.length ? ` (${r.problems.length} entr${r.problems.length === 1 ? "y" : "ies"} skipped: ${r.problems[0]})` : "";
      toast(`Imported ${r.notes} notes, ${r.bookmarks} bookmarks, ${r.quiz} quiz records${problems}`);
      render();
    } catch (err) {
      sheet({
        title: "Import failed",
        submitLabel: "Close",
        fields: [{ name: "why", label: "What went wrong", type: "textarea" }],
        onSubmit: (_v, close) => close(),
      });
      const ta = document.querySelector("#sheetHost textarea");
      if (ta) ta.value = err.message || String(err);
    }
  });
  input.click();
}

function doWipe() {
  sheet({
    title: "Erase all personal data?",
    submitLabel: "Yes, erase it",
    fields: [{ name: "confirm", label: "Type ERASE to confirm", type: "text", placeholder: "ERASE" }],
    onSubmit: (v, close) => {
      if ((v.confirm || "").trim().toUpperCase() !== "ERASE") {
        toast("Not erased — type ERASE to confirm");
        return;
      }
      db.store.wipe().then(() => { close(); render(); toast("All personal data erased from this device"); });
    },
  });
}

/* ------------------------------------------------------------------ net status */

function initNetStatus() {
  const host = document.getElementById("netstat");
  const render = () => {
    clear(host);
    const row = (led, text) => h("div.netstat__row", h("span.netstat__led", { class: led ? "" : "netstat__led--off" }), h("span", text));

    // navigator.onLine only reports whether the device has a network interface.
    // It says nothing about whether the site is reachable, so it is labelled
    // precisely rather than being presented as "the site works".
    row(navigator.onLine,
        navigator.onLine ? "Device has a network" : "Device has no network");

    const sw = "serviceWorker" in navigator && !!navigator.serviceWorker.controller;
    row(sw, sw ? "Offline cache active" : "Offline cache not ready");

    // transferSize 0 on the navigation means the shell came from the cache.
    if (wasServedFromCache()) row(true, "This page loaded from cache");
  };
  addEventListener("online", render);
  addEventListener("offline", render);
  render();
}

function wasServedFromCache() {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    return !!nav && nav.transferSize === 0 && nav.decodedBodySize > 0;
  } catch (_) {
    return false;
  }
}

/* ------------------------------------------------------------------ render */

let syncHashToSearch = () => {};

async function render(restoreTo) {
  const cur = currentRoute() || { path: [], query: {} };
  const [head, ...rest] = cur.path;

  let node;
  // Some views read IndexedDB and are therefore async, so every view is
  // awaited here rather than each caller remembering to.
  switch (head) {
    case undefined: node = SV.homeView(); break;
    case "search": node = V.searchView(rest, cur.query); break;
    case "commands": node = rest.length ? V.commandView({ id: rest[0] }) : V.browseView({ kind: "commands" }, cur.query); break;
    case "lessons": node = rest.length ? V.lessonView({ id: rest[0] }) : V.browseView({ kind: "lessons" }, cur.query); break;
    case "scenarios": node = rest.length ? V.scenarioView({ id: rest[0] }) : V.browseView({ kind: "scenarios" }, cur.query); break;
    case "quizzes": node = rest.length ? V.quizView({ id: rest[0] }) : V.browseView({ kind: "quizzes" }, cur.query); break;
    case "projects": node = rest.length ? V.projectView({ id: rest[0] }) : V.browseView({ kind: "projects" }, cur.query); break;
    case "subjects":
      // Subject pages are built from subjects.js so a subject landing page and
      // a central filtered list read the same canonical records. The previous
      // inline version rebuilt lesson cards from scratch here, which is exactly
      // the duplication the redesign removes.
      node = rest.length
        ? (rest[1] ? SV.subjectSectionView({ id: rest[0], kind: rest[1] }) : SV.subjectView({ id: rest[0] }))
        : SV.subjectsIndexView();
      break;
    case "guides": node = V.guidesView(); break;
    case "bookmarks": node = V.bookmarksView(); break;
    case "progress": node = V.progressView(); break;
    case "flashcards": node = V.flashcardsView({ id: rest[0] }); break;
    case "verify": node = V.verifyView(); break;
    case "objectives": node = V.objectivesView(); break;
    case "km": node = rest.length ? V.knowledgeSessionView({ id: rest[0], query: cur.query }) : V.knowledgeMapView(); break;
    case "documents": node = V.documentsView(); break;
case "doc": node = await V.docView({ id: rest[0] }); break;
case "study": node = rest.length ? await V.studyUnitView({ id: rest[0] }, cur.query) : await V.studyManualView(); break;
    case "assessment": node = V.selfCheckView(); break;
    case "notes": node = rest.length ? V.notesChapterView({ id: rest[0] }) : V.notesIndexView(); break;
    case "library": node = rest.length ? (rest[1] ? V.libraryChapterView({ book: rest[0], id: rest[1] }) : V.libraryBookView({ id: rest[0] })) : V.libraryView(); break;
    default: node = V.homeView();
  }

  if (!node || typeof node.then === "function") node = await node;

  clear(main);
  main.appendChild(node);
  // If Bangla is active, rerun the translate widget over the freshly rendered
  // content (debounced). No-op in English, so it costs nothing by default.
  TR.reapply();
  markNav();
  // markNav may have moved the reader into a collapsed group, or out of one.
  revealActiveNavGroup();
  if (syncHashToSearch) syncHashToSearch();
  // Move focus to the content only when the user navigated. Stealing focus on
  // every keystroke would make the search box impossible to type in.
  const typing = document.activeElement && document.activeElement.id === "q";
  if (!typing) main.focus({ preventScroll: true });

  // Restore the reader's place on a Back or Forward move; start at the top
  // only when genuinely going somewhere new. Resetting unconditionally is what
  // made Back drop you at the first line of a 36,000-character chapter instead
  // of the paragraph you had actually read.
  if (typeof restoreTo === "number") {
    // Two frames: the first lets the new content lay out, the second restores.
    // Restoring immediately clamps a large offset against a still-empty page
    // and lands short of where the reader was.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scrollTo({ top: restoreTo, behavior: "instant" });
    }));
  } else {
    scrollTo({ top: 0, behavior: "instant" });
  }
}

/* ----------------------------------------------------------- back to top */

/**
 * A way back to the top of a long document.
 *
 * The header sticks, so navigation is always reachable - but on a library
 * chapter, which runs to 36,000 characters, scrolling back up is a long thumb
 * gesture. This appears only once the reader is far enough down for the trip
 * to be worth offering, and it never covers anything: it sits above the safe
 * area and is hidden from assistive tech because the header is already a
 * direct route home.
 */
function initBackToTop() {
  const btn = h("button.totop", {
    type: "button",
    title: "Back to top",
    "aria-hidden": "true",
    tabindex: "-1",
  }, icon("arrow-up", "Back to top"));

  btn.addEventListener("click", () => {
    scrollTo({ top: 0, behavior: "smooth" });
    // Put focus back where the reader can see it, rather than leaving it on a
    // button that is about to disappear.
    const first = document.querySelector("#main h1");
    if (first) { first.setAttribute("tabindex", "-1"); first.focus({ preventScroll: true }); }
  });

  document.body.appendChild(btn);
  let ticking = false;
  const update = () => {
    ticking = false;
    btn.dataset.on = window.scrollY > 900 ? "1" : "0";
  };
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

/* ------------------------------------------------------------------ boot */

async function boot() {
  initTheme();
  initDrawer();
  initSidebarGroups();
  initNetStatus();
  initBackToTop();
  syncHashToSearch = initSearchBox();
  initDataPanel();
  initLang();

  route("", ({ recalled }) => render(recalled));
  route("search", ({ recalled }) => render(recalled));
  // Each collection needs two patterns: the list, and the detail with an id.
  for (const [seg, kind] of [["commands", "commands"], ["lessons", "lessons"], ["scenarios", "scenarios"],
                             ["quizzes", "quizzes"], ["projects", "projects"], ["subjects", "subjects"]]) {
    route(seg, ({ recalled }) => render(recalled));
    route(`${seg}/:id`, ({ recalled }) => render(recalled));
  }
  route("subjects", ({ recalled }) => render(recalled));
  route("subjects/:id", ({ recalled }) => render(recalled));
  route("subjects/:id/:kind", ({ recalled }) => render(recalled));
  route("guides", ({ recalled }) => render(recalled));
  route("bookmarks", ({ recalled }) => render(recalled));
  route("progress", ({ recalled }) => render(recalled));
  route("flashcards", ({ recalled }) => render(recalled));
  route("verify", ({ recalled }) => render(recalled));
  route("objectives", ({ recalled }) => render(recalled));
  route("km", ({ recalled }) => render(recalled));
  route("km/:id", ({ recalled }) => render(recalled));
  route("documents", ({ recalled }) => render(recalled));
  route("doc/:id", ({ recalled }) => render(recalled));
  route("study", ({ recalled }) => render(recalled));
  route("study/:id", ({ recalled }) => render(recalled));
  route("assessment", ({ recalled }) => render(recalled));
  route("notes", ({ recalled }) => render(recalled));
  route("notes/:id", ({ recalled }) => render(recalled));
  route("library", ({ recalled }) => render(recalled));
  route("library/:id", ({ recalled }) => render(recalled));
  route("library/:id/:chunk", ({ recalled }) => render(recalled));

  // Content first — a broken fetch must show an error, not an empty search.
  clear(main);
  main.appendChild(h("div.empty", h("h2", "Loading the reference library…"), h("p", "First load only. After this it works with no network at all.")));

  try {
    corpus = await loadCorpus();
    buildNav();
    // Before the first render, so the very first paint is already in the
    // chosen mode and nothing visibly reflows a moment later.
    initViewMode();
    if (corpus.commands.length + corpus.lessons.length === 0) {
      clear(main);
      main.appendChild(h("div.errbox",
        h("strong", "No content was found"),
        h("span", "The data files did not load. If you are opening this from the file system rather than a web server, run the local server instead: node scripts/serve.mjs")));
      return;
    }
  } catch (err) {
    clear(main);
    main.appendChild(h("div.errbox", h("strong", "Content failed to load"), h("span", String(err && err.message || err))));
    return;
  }

  start(() => render());
  // Bars are filled from IndexedDB, which is asynchronous, and they are not
  // awaited: the nav is already on screen and the bars arrive a frame later. A
  // visitor with no stored progress sees them at zero either way.
  paintNavProgress();
  // Marking a unit complete moves its bar without a reload. views.js raises
  // this event rather than being imported back from here.
  addEventListener("field-manual:progress-changed", () => { paintNavProgress(); });
  if (!location.hash || location.hash === "#") history.replaceState(null, "", "#/");

  // Show the build stamp.
  const info = document.getElementById("buildInfo");
  const st = search.searchStats();
  info.textContent = `${st.docs} entries · offline-first · no account, no tracking`;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
      .then(watchForUpdates)
      .catch((err) => console.warn("[field-manual] offline cache unavailable:", err));
  }
}

/**
 * Tell the user when a new version is ready instead of silently swapping files.
 *
 * Found during testing: a cached app.js made an edit look like it "did not
 * work". Two things were wrong — `updatefound` fires on the ServiceWorkerRegistration,
 * not on navigator.serviceWorker, and an already-waiting worker must be checked
 * on boot, which is the common case after a reload.
 */
function watchForUpdates(reg) {
  // A worker already downloaded and waiting before this page loaded.
  if (reg.waiting && navigator.serviceWorker.controller) showUpdateBar(reg.waiting);

  reg.addEventListener("updatefound", () => {
    const sw = reg.installing;
    if (!sw) return;
    sw.addEventListener("statechange", () => {
      // "installed" while another worker already controls the page means an
      // UPDATE is waiting. On a first install there is nothing to update.
      if (sw.state === "installed" && navigator.serviceWorker.controller) showUpdateBar(sw);
    });
  });
}

function showUpdateBar(sw) {
  const bar = h("div", {
    style: {
      position: "fixed", left: "12px", right: "12px", bottom: "12px", zIndex: "90",
      display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap",
      padding: "12px 14px", borderRadius: "var(--r-lg)",
      background: "var(--surface)", border: "1px solid var(--accent)",
      boxShadow: "var(--shadow-2)", fontSize: "14px",
    },
    role: "status",
  },
    h("span", { style: { flex: "1 1 180px" } }, "A newer version of the field manual is ready."),
    h("button.btn.btn--primary", {
      onclick: () => {
        sw.postMessage("skip-waiting");
        reg_wait_then_reload();
      },
    }, "Reload now"),
    h("button.btn", { onclick: () => bar.remove() }, "Later"),
  );
  document.body.appendChild(bar);
}

function reg_wait_then_reload() {
  navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
  // If nothing claims within a few seconds, reload anyway: the assets the
  // page already has are fine and the new cache will be used next visit.
  setTimeout(() => location.reload(), 3000);
}

boot();
