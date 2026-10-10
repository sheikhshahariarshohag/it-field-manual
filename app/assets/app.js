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
import { route, start, resolve, href, currentRoute } from "./router.js";

const main = document.getElementById("main");
const navPrimary = document.getElementById("navPrimary");
const navSubjects = document.getElementById("navSubjects");
const navPractice = document.getElementById("navProject");
const navProject = navPractice;
const navPracticeList = document.getElementById("navPractice");

const SUBJECT_ORDER = ["aplus", "cisco", "mikrotik", "win11", "winserver", "rhel"];

/* ------------------------------------------------------------------ data */

async function loadCorpus() {
  const base = "data";
  const groups = {
    commands: ["commands"],
    lessons: ["lessons"],
    scenarios: ["scenarios"],
    quizzes: ["quizzes"],
    projects: ["projects"],
  };
  const out = { commands: [], lessons: [], scenarios: [], quizzes: [], projects: [] };

  await Promise.all(Object.entries(groups).map(async ([key, files]) => {
    for (const f of files) {
      try {
        const res = await fetch(`${base}/${f}/index.json`, { cache: "no-cache" });
        if (!res.ok) throw new Error(String(res.status));
        const list = await res.json();
        out[key] = Array.isArray(list) ? list : (list.items || []);
      } catch (err) {
        console.warn(`[field-manual] no content for ${f}:`, err.message);
      }
    }
  }));

  search.loadCorpus(out);
  return out;
}

/* ------------------------------------------------------------------ nav */

function navLink(label, routeStr, opts = {}) {
  const a = h("a.navlink", { href: href(routeStr) },
    opts.dot ? h("span.navlink__dot", { style: { "--dot": opts.dot } }) : null,
    h("span", label),
    opts.count !== undefined ? h("span.navlink__count", String(opts.count)) : null);
  return h("li", a);
}

function buildNav() {
  const st = search.searchStats();

  clear(navPrimary);
  navPrimary.appendChild(navLink("Home", ""));
  navPrimary.appendChild(navLink("Commands", "commands", { count: st.commands }));
  navPrimary.appendChild(navLink("Lessons", "lessons", { count: st.lessons }));

  clear(navSubjects);
  for (const t of SUBJECT_ORDER) {
    const info = V.TECH[t];
    navSubjects.appendChild(navLink(info.label, `subjects/${t}`, { dot: V.techColor(t) }));
  }

  clear(navPracticeList);
  navPracticeList.appendChild(navLink("Troubleshooting scenarios", "scenarios", { count: st.scenarios }));
  navPracticeList.appendChild(navLink("Quizzes", "quizzes", { count: st.quizzes }));
  navPracticeList.appendChild(navLink("Bookmarks", "bookmarks"));
  navPracticeList.appendChild(navLink("My progress", "progress"));

  clear(navProject);
  navProject.appendChild(navLink("Projects", "projects", { count: st.projects }));
  navProject.appendChild(navLink("Verification status", "verify"));
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
  if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

  document.getElementById("themeBtn").addEventListener("click", () => {
    const isDark = root.getAttribute("data-theme") === "dark" ||
      (!root.hasAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
    const next = isDark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem(KEY, next); } catch (_) { /* ignore */ }
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

async function render() {
  const cur = currentRoute() || { path: [], query: {} };
  const [head, ...rest] = cur.path;

  let node;
  // Some views read IndexedDB and are therefore async, so every view is
  // awaited here rather than each caller remembering to.
  switch (head) {
    case undefined: node = V.homeView(); break;
    case "search": node = V.searchView(rest, cur.query); break;
    case "commands": node = rest.length ? V.commandView({ id: rest[0] }) : V.browseView({ kind: "commands" }, cur.query); break;
    case "lessons": node = rest.length ? V.lessonView({ id: rest[0] }) : V.browseView({ kind: "lessons" }, cur.query); break;
    case "scenarios": node = rest.length ? V.scenarioView({ id: rest[0] }) : V.browseView({ kind: "scenarios" }, cur.query); break;
    case "quizzes": node = rest.length ? V.quizView({ id: rest[0] }) : V.browseView({ kind: "quizzes" }, cur.query); break;
    case "projects": node = rest.length ? V.projectView({ id: rest[0] }) : V.browseView({ kind: "projects" }, cur.query); break;
    case "subjects":
      if (rest.length) {
        const tech = rest[0];
        const lessons = search.CORPUS.lessons.filter((l) => l.tech === tech);
        const cmds = search.CORPUS.commands.filter((c) => c.tech === tech);
        const wrap = h("div");
        wrap.appendChild(h("header.page-head", h("h1", V.TECH[tech] ? V.TECH[tech].label : tech),
          h("p", `${lessons.length} lessons, ${cmds.length} commands in this subject.`)));
        if (!lessons.length && !cmds.length) {
          wrap.appendChild(h("div.note", h("strong", "Not written yet"),
            h("span", "Mapped in CONTENT_MAP.md, content not started. The count stays honest rather than padded.")));
        }
        const cards = h("div.cards");
        for (const l of lessons) cards.appendChild(h("a.card", { href: href(`lessons/${l.id}`) }, h("div.card__k", "Lesson"), h("div.card__t", l.title), h("div.card__d", l.summary)));
        for (const c of cmds) cards.appendChild(h("a.card", { href: href(`commands/${c.id}`) }, h("div.card__k", "Command"), h("div.card__t", c.title), h("div.card__d", c.task || c.summary)));
        wrap.appendChild(cards);
        node = wrap;
      } else node = V.subjectsView();
      break;
    case "bookmarks": node = V.bookmarksView(); break;
    case "progress": node = V.progressView(); break;
    case "verify": node = V.verifyView(); break;
    default: node = V.homeView();
  }

  if (!node || typeof node.then === "function") node = await node;

  clear(main);
  main.appendChild(node);
  markNav();
  if (syncHashToSearch) syncHashToSearch();
  // Move focus to the content only when the user navigated. Stealing focus on
  // every keystroke would make the search box impossible to type in.
  const typing = document.activeElement && document.activeElement.id === "q";
  if (!typing) main.focus({ preventScroll: true });
  scrollTo({ top: 0, behavior: "instant" });
}

/* ------------------------------------------------------------------ boot */

async function boot() {
  initTheme();
  initDrawer();
  initNetStatus();
  syncHashToSearch = initSearchBox();
  initDataPanel();

  route("", () => render());
  route("search", () => render());
  // Each collection needs two patterns: the list, and the detail with an id.
  for (const [seg, kind] of [["commands", "commands"], ["lessons", "lessons"], ["scenarios", "scenarios"],
                             ["quizzes", "quizzes"], ["projects", "projects"], ["subjects", "subjects"]]) {
    route(seg, () => render());
    route(`${seg}/:id`, () => render());
  }
  route("bookmarks", () => render());
  route("progress", () => render());
  route("verify", () => render());

  // Content first — a broken fetch must show an error, not an empty search.
  clear(main);
  main.appendChild(h("div.empty", h("h2", "Loading the reference library…"), h("p", "First load only. After this it works with no network at all.")));

  try {
    const corpus = await loadCorpus();
    buildNav();
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