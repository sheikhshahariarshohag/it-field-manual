/**
 * search.js — offline search over the packaged reference library.
 *
 * Design: the corpus is a few hundred small JSON files served from the app's
 * own origin and precached by the service worker, so search works with no
 * network. We build one inverted index in memory at boot (a few hundred KB)
 * rather than shipping a prebuilt index that would go stale.
 *
 * Scoring favours, in order: exact command, command prefix, title match,
 * alias, task phrase, body. Field-manual users are usually typing a command
 * they half remember, so token-prefix matching matters more than TF-IDF here.
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "be",
  "how", "do", "i", "my", "it", "this", "that", "with", "what", "why", "when",
  "can", "should", "if", "at", "by", "from", "as", "not", "but", "you", "your",
]);

const norm = (s) => String(s || "").toLowerCase().trim();

function tokens(text) {
  return norm(text)
    .split(/[^a-z0-9_.:/-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !STOP.has(t));
}

/** Split a multi-line command string into individual runnable lines. */
function commandLines(cmd) {
  const src = typeof cmd === "string" ? cmd : (cmd && cmd.text) || "";
  return src
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

let DOCS = [];
let INDEX = null;
let ALIASES = new Map();

export const CORPUS = { commands: [], lessons: [], scenarios: [], quizzes: [], projects: [] };

/* ------------------------------------------------------------------ build */

// Keys whose values are identifiers, URLs or metadata rather than prose.
// Everything else on a content object is fair game for search.
const SKIP_KEYS = new Set([
  "id", "kind", "_w", "_km", "_blob", "url", "image", "aliases",
  "sources", "source", "verified", "sourceNote", "verifyNote",
]);

/**
 * Collect every scrap of prose on a content object.
 *
 * The index used to be built from a fixed list of fields — title, summary,
 * task, tags, tech, commands — which meant a lesson's section text, its lab
 * steps, its troubleshooting entries, a scenario's investigation steps and a
 * quiz's questions were all invisible. Searching for a phrase you could see on
 * the page returned nothing. Walking the object instead means new fields are
 * searchable the moment they are added, with no edit to this file.
 */
function deepText(node, out, depth = 0) {
  if (depth > 8 || node === null || node === undefined) return;
  const t = typeof node;
  if (t === "string") { out.push(node); return; }
  if (t !== "object") return;                 // numbers/booleans carry no words
  if (Array.isArray(node)) {
    for (const v of node) deepText(v, out, depth + 1);
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (SKIP_KEYS.has(k)) continue;
    deepText(v, out, depth + 1);
  }
}

function buildIndex() {
  const map = new Map(); // token -> Set(docId)
  const add = (tok, id) => {
    if (tok.length < 2) return;
    let s = map.get(tok);
    if (!s) { s = new Set(); map.set(tok, s); }
    s.add(id);
  };

  DOCS = [];
  const push = (doc, weight) => {
    DOCS.push(doc);
    const id = DOCS.length - 1;
    doc._w = weight;
    const bag = [];
    bag.push(...tokens(doc.title), ...tokens(doc.summary || ""));
    bag.push(...tokens(doc.task || ""));
    bag.push(...tokens((doc.tags || []).join(" ")));
    if (doc.tech) bag.push(...tokens(doc.tech));
    if (doc.commands) for (const c of commandLines(doc.commands)) bag.push(...tokens(c));
    if (doc.search) bag.push(...tokens(Array.isArray(doc.search) ? doc.search.join(" ") : doc.search));
    // Everything else: section prose, lab steps, error messages, quiz stems…
    const rest = [];
    deepText(doc, rest);
    bag.push(...tokens(rest.join(" ")));
    for (const t of bag) add(t, id);
    // One normalised blob of the whole object, built once.
    //
    // deepText above puts every word into the candidate index, but scoreDoc
    // only awarded points for title, summary, task, tags, terms and commands.
    // A word that lived only in some other field — a Simple Notes "What each
    // part means" table, a revision table, a lab step — produced a candidate
    // that then scored zero and was discarded by the `> 0` gate. So
    // "restorecon", "setsebool" and "lvextend" were visible on the page and
    // unfindable. This gives scoreDoc something cheap to match against.
    doc._blob = norm(rest.join(" "));
    return doc;
  };

  for (const c of CORPUS.commands) push({ ...c, kind: "command" }, 3);
  for (const l of CORPUS.lessons) push({ ...l, kind: "lesson" }, 2);
  for (const p of CORPUS.projects) push({ ...p, kind: "project" }, 2);
  for (const s of CORPUS.scenarios) push({ ...s, kind: "scenario" }, 2);
  for (const q of CORPUS.quizzes) push({ ...q, kind: "quiz" }, 1);

  // The Study Manual and Simple Notes used to be invisible to search entirely:
  // buildIndex walked commands, lessons, projects, scenarios, quizzes and the
  // Knowledge Map, and simply never looked at CORPUS.study or CORPUS.notes.
  // Both are loaded by app.js and both have their own pages, so a search for
  // "crontab" or "semanage" could return a command or a lesson while being
  // unable to find the chapter that actually teaches it.
  //
  // The bodies of both live in separate lazily-fetched files, so what is
  // indexed here is the structure: every chapter, unit, part and section
  // title, plus the one-line main idea behind each Simple Notes concept.
  // Those are the high-signal phrases a learner would actually type, and they
  // keep the index small without making search useless.
  if (CORPUS.study) {
    for (const book of CORPUS.study.books || []) {
      for (const u of book.units || []) {
        const titles = Array.isArray(u.sectionTitles) ? u.sectionTitles : [];
        push({
          id: u.id, kind: "unit", _study: true,
          title: u.display || u.title || u.id,
          summary: `${book.title} — ${titles.length} section${titles.length === 1 ? "" : "s"}`,
          tech: "",
          terms: titles,
          aliases: [book.code || book.id, book.title].filter(Boolean),
        }, 2);
      }
    }
  }

  if (CORPUS.notes) {
    for (const c of CORPUS.notes.chapters || []) {
      const titles = [];
      const cmds = [];
      for (const s of c.sections || []) {
        titles.push(s.title);
        for (const q of s.concepts || []) {
          titles.push(q.title);
          if (q.main) titles.push(q.main);
          // The "What each part means" tables name the actual commands and
          // options, which is what a learner searches for: lvextend, vgextend,
          // pvmove, OnCalendar. The revision table at the end of every chapter
          // is a command list too.
          for (const p of q.parts || []) if (p[0]) cmds.push(p[0]);
          for (const line of q.example || []) cmds.push(line);
        }
      }
      for (const [task, cmd] of c.revision || []) cmds.push(task, cmd);
      push({
        id: c.id, kind: "notes", _notes: true,
        title: `${c.book} Chapter ${c.n}: ${c.title}`,
        summary: c.partTitle || "",
        tech: "",
        terms: titles.concat(cmds),
        aliases: [c.title, c.exam].filter(Boolean),
      }, 2);
    }
  }

  // The 146 Knowledge Map sessions are searchable too, so a topic that only
  // appears on the roadmap still finds its way home. `terms` is the
  // distinctive-word list built by export-knowledge-content.mjs: it is what
  // lets a search reach the prose, which lives in lazily-fetched files and
  // cannot be indexed directly.
  if (CORPUS.km) {
    for (const s of CORPUS.km.sessions) {
      push({
        id: s.id, kind: "session", _km: true,
        title: `Session ${s.n} — ${s.title}`,
        summary: s.summary || "",
        tech: "",
        terms: s.terms || [],
        layerName: s.layerName, page: s.page,
      }, 2);
    }
  }

  // Alias table: common names -> canonical ids, so "ccna" finds Cisco items.
  ALIASES = new Map();
  for (const d of DOCS) {
    for (const a of d.aliases || []) {
      const k = norm(a);
      if (!ALIASES.has(k)) ALIASES.set(k, d.id);
    }
  }
  INDEX = map;
}

/* ------------------------------------------------------------------ query */

/**
 * @param {string} query
 * @param {{kinds?:string[], tech?:string, verify?:string, limit?:number}} opts
 */
export function search(query, opts = {}) {
  if (!INDEX) buildIndex();
  const q = norm(query);
  if (q.length < 2) return { results: [], total: 0, expanded: false };

  const qTokens = tokens(q);
  if (!qTokens.length) return { results: [], total: 0, expanded: false };

  // Candidate set: documents containing the rarest query token (cheap AND-ish).
  let candidates = null;
  for (const t of qTokens) {
    const exact = INDEX.get(t);
    if (exact && exact.size) {
      candidates = candidates === null ? new Set(exact) : new Set([...candidates].filter((id) => exact.has(id)));
    }
  }
  // No exact token anywhere — fall back to prefix scan (partial command names).
  let expanded = false;
  if (!candidates || candidates.size === 0) {
    candidates = new Set();
    for (const [tok, ids] of INDEX) {
      if (qTokens.some((qt) => tok.startsWith(qt))) {
        expanded = true;
        for (const id of ids) candidates.add(id);
      }
    }
  }
  if (!candidates.size) return { results: [], total: 0, expanded };

  const aliasTarget = ALIASES.get(q);
  const results = [];
  for (const id of candidates) {
    const d = DOCS[id];
    if (opts.kinds && !opts.kinds.includes(d.kind)) continue;
    if (opts.tech && d.tech !== opts.tech) continue;
    if (opts.verify && (d.verification || "").indexOf(opts.verify) === -1) continue;
    const score = scoreDoc(d, q, qTokens, aliasTarget);
    if (score > 0) results.push({ doc: d, score });
  }

  results.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title));
  // 60 was a silent cap: a broad term could match hundreds of docs and the
  // page just stopped, with nothing to say so. Raise it, and let the view
  // report when it is still truncating.
  const limit = opts.limit || 200;
  return { results: results.slice(0, limit), total: results.length, expanded };
}

function scoreDoc(d, q, qTokens, aliasTarget) {
  let s = 0;

  if (d.kind === "command") {
    for (const line of commandLines(d.commands)) {
      const ll = norm(line);
      if (ll === q) s += 400;
      else if (ll.startsWith(q)) s += 240;
      else if (ll.includes(q)) s += 120;
    }
  }

  const title = norm(d.title);
  if (title === q) s += 220;
  else if (title.startsWith(q)) s += 140;
  else if (title.includes(q)) s += 70;

  const task = norm(d.task || "");
  if (task && task.includes(q)) s += 90;

  if ((d.aliases || []).some((a) => norm(a) === q)) s += 130;
  if (aliasTarget && d.id === aliasTarget) s += 160;

  // Knowledge Map sessions carry a `terms` list of the distinctive words in
  // their prose. The Study Manual and Simple Notes carry a list of section and
  // concept titles instead. Matching one is weak evidence on their own — it is
  // a word appearing somewhere in the chapter — so it scores low, but not so
  // low that scoreDoc's `> 0` gate throws the hit away.
  //
  // The match must be a SUBSTRING test against the joined terms, not
  // Array.includes. Knowledge Map terms are single words so exact membership
  // happened to work; the study and notes terms are whole titles like
  // "2.8 Understand semanage fcontext rules", so exact membership never fired
  // and searching "semanage", "chcon" or "restorecon" returned nothing at all
  // despite those terms being present and visible on the page.
  const terms = d.terms && d.terms.length ? d.terms : null;
  const termsBlob = terms ? norm(terms.join(" ")) : "";

  for (const t of qTokens) {
    if (title.includes(t)) s += 26;
    if (task.includes(t)) s += 14;
    if (norm(d.summary).includes(t)) s += 8;
    if ((d.tags || []).some((tag) => norm(tag).includes(t))) s += 10;
    if (termsBlob.includes(t)) s += 12;
    // Found only in the body prose or a table elsewhere on the page. Weak, but
    // enough to clear the `> 0` gate — which is the difference between a term
    // being searchable and being invisible.
    if (d._blob && d._blob.includes(t)) s += 4;
  }

  // Small completeness bonus: a doc matching every token beats one matching one.
  const matched = qTokens.filter((t) =>
    title.includes(t) || task.includes(t) || norm(d.summary).includes(t) ||
    (d.tags || []).some((tag) => norm(tag).includes(t)) ||
    termsBlob.includes(t) || (d._blob && d._blob.includes(t)) ||
    commandLines(d.commands).some((l) => norm(l).includes(t)));
  if (matched.length === qTokens.length && qTokens.length > 1) s += 40;

  return s * (d._w || 1);
}

/** Highlight query terms inside a plain string, safely (text nodes only). */
export function highlight(text, query) {
  const t = norm(query);
  if (!t) return [String(text)];
  const terms = Array.from(new Set([t, ...tokens(t)])).filter((x) => x.length > 1)
    .sort((a, b) => b.length - a.length);
  const out = [];
  let rest = String(text);
  let guard = 0;
  while (rest.length && guard++ < 200) {
    let at = -1;
    let hit = null;
    for (const term of terms) {
      const i = rest.toLowerCase().indexOf(term);
      if (i !== -1 && (at === -1 || i < at)) { at = i; hit = term; }
    }
    if (at === -1 || !hit) { out.push(rest); break; }
    if (at > 0) out.push(rest.slice(0, at));
    out.push(h("mark", rest.slice(at, at + hit.length)));
    rest = rest.slice(at + hit.length);
  }
  return out;
}

export function loadCorpus(corpus) {
  Object.assign(CORPUS, corpus);
  buildIndex();
}

export function reindex() { buildIndex(); }
export function docById(id) { return DOCS.find((d) => d.id === id) || null; }
export function allDocs() { return DOCS; }
export function searchStats() {
  if (!INDEX) buildIndex();
  return {
    tokens: INDEX.size,
    docs: DOCS.length,
    commands: CORPUS.commands.length,
    lessons: CORPUS.lessons.length,
    scenarios: CORPUS.scenarios.length,
    quizzes: CORPUS.quizzes.length,
    projects: CORPUS.projects.length,
  };
}