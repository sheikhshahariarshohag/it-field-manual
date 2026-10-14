/**
 * subject-views.js — subject landing pages and the redesigned home page.
 *
 * These are VIEWS. Every list here is a filtered view of the canonical
 * records via subjects.js, so a lesson edited anywhere appears everywhere it
 * is listed, and nothing is stored twice.
 */
import { h } from "./ui.js";
import * as search from "./search.js";
import * as db from "./db.js";
import { href } from "./router.js";
import * as S from "./subjects.js";

/* ------------------------------------------------------------------ home */

/**
 * The home page.
 *
 * Designed around what a returning learner needs in the first two seconds:
 * where they left off, what to study next, and a way to reach a subject. It is
 * not a statistics dashboard - a first-time visitor with no saved data still
 * gets a complete page, because every block degrades to something useful.
 */
export async function homeView() {
  const wrap = h("div");
  const subjects = S.populatedSubjects();

  wrap.appendChild(h("header.home-hero",
    h("h1", "What do you need today?"),
    h("p.home-hero__sub",
      "A field manual for the six subjects below: find the command, understand the " +
      "topic, practise it on a spare machine, and come back to revise it."),
  ));

  /* --- continue where you left off ---------------------------------- */
  // Only shown when there is real saved state. Progress is read defensively:
  // this block must never block the page if storage is unavailable.
  let recent = [];
  let inProgress = [];
  try {
    const [marks, prog] = await Promise.all([db.store.bookmarks(), db.store.progress()]);
    const doneIds = new Set((prog || []).map((p) => p.id));
    inProgress = (prog || [])
      .filter((p) => p.status && p.status !== "done")
      .slice(0, 4)
      .map((p) => resolveDoc(p.id))
      .filter(Boolean);
    // Most recently bookmarked, not yet finished.
    const order = new Map((marks || []).map((m, i) => [m.id, i]));
    recent = (marks || [])
      .filter((m) => !doneIds.has(m.id))
      .sort((a, b) => (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0))
      .slice(0, 5)
      .map((m) => resolveDoc(m.id))
      .filter(Boolean);
  } catch (_) {
    // Private browsing, or the store is not ready. The rest of the page stands.
  }

  if (inProgress.length || recent.length) {
    const box = h("section.home-continue");
    if (inProgress.length) {
      box.appendChild(h("h2.home-h", "Continue learning"));
      const list = h("div.home-resume");
      for (const d of inProgress) list.appendChild(resumeRow(d));
      box.appendChild(list);
    }
    if (recent.length) {
      box.appendChild(h("h2.home-h", "Recently bookmarked"));
      const list = h("div.home-resume");
      for (const d of recent) list.appendChild(resumeRow(d));
      box.appendChild(list);
    }
    wrap.appendChild(box);
  }

  /* --- subjects ------------------------------------------------------ */
  wrap.appendChild(h("h2.home-h", "Subjects"));
  const grid = h("div.subject-grid");
  for (const s of subjects) grid.appendChild(subjectCard(s));
  wrap.appendChild(grid);

  /* --- next step ----------------------------------------------------- */
  // One honest, useful suggestion rather than a wall of shortcuts.
  const suggestion = nextStep(subjects);
  if (suggestion) {
    wrap.appendChild(h("div.home-next",
      h("div.home-next__body",
        h("span.home-next__k", "Suggested next step"),
        h("p", suggestion.text),
      ),
      h("a.btn.btn--primary", { href: href(suggestion.href) }, suggestion.cta),
    ));
  }

  /* --- practice shortcuts -------------------------------------------- */
  wrap.appendChild(h("h2.home-h", "Practise and revise"));
  wrap.appendChild(h("div.home-tools",
    toolCard("Troubleshooting", "scenarios", "Investigate a symptom you are actually seeing."),
    toolCard("Quizzes", "quizzes", "Test what you have covered, by subject."),
    toolCard("Projects", "projects", "End-to-end builds rather than single commands."),
    toolCard("Study manuals", "study", "Chapters in reading order, with a contents list."),
    toolCard("Certification", "guides", "Exam objectives and readiness."),
    toolCard("Knowledge Map", "km", "See how the topics fit together."),
  ));

  return wrap;
}

/** A saved resource, resolved back to its canonical record. */
function resolveDoc(id) {
  const C = search.CORPUS;
  const pools = [
    ...(C.commands || []), ...(C.lessons || []), ...(C.scenarios || []),
    ...(C.quizzes || []), ...(C.projects || []),
  ];
  return pools.find((x) => x.id === id) || null;
}

function resumeRow(d) {
  const tech = d.tech || "";
  return h("a.resume", { href: contentHrefFor(d) },
    h("span.resume__dot", { style: { "--dot": `var(${S.SUBJECT_BY_ID.get(tech)?.varName || "--text-faint"})` } }),
    h("span.resume__body",
      h("span.resume__t", d.title),
      h("span.resume__k", S.labelFor(tech) || kindLabel(d.kind)),
    ),
  );
}

function kindLabel(kind) {
  return { command: "Command", lesson: "Lesson", scenario: "Troubleshooting",
           quiz: "Quiz", project: "Project" }[kind] || "Resource";
}

function contentHrefFor(d) {
  const seg = { command: "commands", lesson: "lessons", scenario: "scenarios",
                quiz: "quizzes", project: "projects" }[d.kind] || "commands";
  return href(`${seg}/${encodeURIComponent(d.id)}`);
}

/** One honest suggestion, chosen from what is actually there. */
function nextStep(subjects) {
  const rhel = subjects.find((s) => s.id === "rhel");
  if (rhel && rhel.counts.studyUnits > 0) {
    return {
      text: "Start with the RHEL study manual - it is the largest body of material here, " +
            "and the chapters are ordered so each one builds on the last.",
      href: "subjects/rhel/study",
      cta: "Open the Study Manual",
    };
  }
  return null;
}

function toolCard(label, seg, blurb) {
  return h("a.home-tool", { href: href(seg) },
    h("span.home-tool__t", label),
    h("span.home-tool__d", blurb),
  );
}

/** A subject card. Counts are real, including zeros. */
export function subjectCard(s) {
  const c = s.counts;
  const bits = [];
  if (c.studyUnits) bits.push(`${c.studyUnits} chapters`);
  if (c.lessons) bits.push(`${c.lessons} lessons`);
  if (c.commands) bits.push(`${c.commands} commands`);
  if (!bits.length) bits.push("Not written yet");

  return h("a.subject-card", { href: href(`subjects/${s.id}`), style: { "--accent-s": `var(${s.varName})` } },
    h("span.subject-card__name", s.label),
    h("span.subject-card__blurb", s.blurb),
    h("span.subject-card__meta", bits.join(" · ")),
    s.exam ? h("span.subject-card__exam", s.exam) : null,
  );
}

/* --------------------------------------------------------------- subjects */

export function subjectsIndexView() {
  const wrap = h("div");
  wrap.appendChild(h("header.page-head",
    h("h1", "Subjects"),
    h("p", "Every subject keeps its material in one place. The central sections elsewhere " +
           "in the app are filtered views of these same records, not separate copies."),
  ));
  const grid = h("div.subject-grid");
  for (const s of S.populatedSubjects()) grid.appendChild(subjectCard(s));
  wrap.appendChild(grid);
  return wrap;
}

/**
 * One subject's landing page.
 *
 * The subsections that exist show a count; the ones with nothing are marked as
 * not written yet rather than given a card full of nothing. That is the
 * difference between an honest page and one that implies coverage.
 */
export function subjectView(params) {
  const wrap = h("div");
  const s = S.subject(params.id);
  if (!s) return notFound("Subject", params.id);

  const sections = S.sectionsFor(s.id);
  const c = S.countsFor(s.id);
  const written = sections.filter((x) => x.count > 0);
  const empty = sections.filter((x) => x.count === 0);

  wrap.appendChild(h("header.page-head",
    h("h1", s.label),
    h("p", s.blurb),
    s.exam ? h("div.card__meta", h("span.badge", s.exam)) : null,
  ));

  if (!written.length) {
    wrap.appendChild(h("div.note.note--risk",
      h("strong", "Nothing written yet"),
      h("span", "This subject is mapped but has no material. The counts stay at zero " +
                "rather than showing filler.")));
  }

  if (written.length) {
    const grid = h("div.sub-grid");
    for (const sec of written) {
      grid.appendChild(h("a.sub-card", { href: href(sec.href), style: { "--accent-s": `var(${s.varName})` } },
        h("span.sub-card__k", sec.label),
        h("span.sub-card__n", String(sec.count)),
        h("span.sub-card__d", sec.blurb),
      ));
    }
    wrap.appendChild(grid);
  }

  if (empty.length) {
    const box = h("div.sub-empty");
    box.appendChild(h("h2", "Not written yet"));
    const ul = h("ul.plain");
    for (const sec of empty) ul.appendChild(h("li", sec.label));
    box.appendChild(ul);
    wrap.appendChild(box);
  }

  /* --- a peek at the actual content, not just counts ------------------ */
  const r = S.resourcesFor(s.id);

  if (r.lessons.length) {
    wrap.appendChild(h("h2", "Lessons in this subject"));
    const ul = h("ul.res-list");
    for (const l of r.lessons.slice(0, 8)) {
      ul.appendChild(h("li",
        h("a", { href: href(`lessons/${l.id}`) }, l.title),
        l.time ? h("span.res-row__m", l.time) : null));
    }
    wrap.appendChild(ul);
    if (r.lessons.length > 8) {
      wrap.appendChild(h("p.srcref", `and ${r.lessons.length - 8} more in `,
        h("a", { href: href(`subjects/${s.id}/lessons`) }, "all lessons")));
    }
  }

  // Service profiles are listed as their own thing, with their own heading.
  // Listing them under "Lessons" is what made auditd and chronyd look like
  // lessons when they are reference cards for running a service.
  if (r.services.length) {
    wrap.appendChild(h("h2", "Service manual"));
    wrap.appendChild(h("p.srcref",
      `${r.services.length} service profile${r.services.length === 1 ? "" : "s"} — ` +
      "configuration, verification and troubleshooting for individual services."));
    const ul = h("ul.res-list");
    for (const x of r.services.slice(0, 12)) {
      ul.appendChild(h("li",
        h("a", { href: href(`lessons/${x.id}`) }, x.title),
        x.verification ? h("span.badge", x.verification) : null));
    }
    wrap.appendChild(ul);
    if (r.services.length > 12) {
      wrap.appendChild(h("p.srcref", `and ${r.services.length - 12} more in `,
        h("a", { href: href(`subjects/${s.id}/services`) }, "the service manual")));
    }
  }

  if (r.commands.length) {
    wrap.appendChild(h("h2", "Commands in this subject"));
    const ul = h("ul.res-list");
    for (const c2 of r.commands.slice(0, 10)) {
      ul.appendChild(h("li", h("a", { href: href(`commands/${c2.id}`) }, c2.title || c2.id)));
    }
    wrap.appendChild(ul);
  }

  return wrap;
}

/* ------------------------------------------- subject subsection listings */

/**
 * One subject subsection, e.g. RHEL → Study Manual.
 *
 * `kind` selects which filtered resource set is shown. It reads the same
 * arrays the central pages read, so this is a view, not a copy.
 */
export function subjectSectionView(params) {
  const wrap = h("div");
  const s = S.subject(params.id);
  if (!s) return notFound("Subject", params.id);

  const kind = params.kind;
  const r = S.resourcesFor(s.id);
  const label = S.sectionsFor(s.id).find((x) => x.key === kind);
  const title = label ? label.label : kind;

  wrap.appendChild(h("header.page-head",
    h("h1", `${s.label} — ${title}`),
    h("div.card__meta",
      h("a.badge", { href: href(`subjects/${s.id}`) }, s.label),
      h("a.badge", { href: href("subjects") }, "All subjects"),
    ),
  ));

  const put = (arr, make) => {
    if (!arr || !arr.length) return;
    const box = h("div.res-list");
    for (const x of arr) box.appendChild(make(x));
    wrap.appendChild(box);
  };

  switch (kind) {
    case "study":
      if (!r.studyUnits.length) return emptyState(wrap, s, title);
      wrap.appendChild(h("p.srcref", "Chapters in reading order. Each opens a reader with a contents list."));
      for (const book of ["rh124", "rh134", "rh294"]) {
        const units = r.studyUnits.filter((u) => u.book === book);
        if (!units.length) continue;
        wrap.appendChild(h("h2", units[0].bookTitle || book));
        put(units, (u) => h("a.res-row", { href: href(`study/${u.id}`) },
          h("span.res-row__t", u.display || u.title),
          h("span.res-row__m", `${u.sections} sections`)));
      }
      break;

    case "notes":
      if (!r.notes.length) return emptyState(wrap, s, title);
      wrap.appendChild(h("p.srcref",
        "Quick revision, not the full chapter. Each note links on to the full explanation."));
      put(r.notes, (n) => h("a.res-row", { href: href(`notes/${n.id}`) },
        h("span.res-row__t", `Chapter ${n.n}: ${n.title}`),
        h("span.res-row__m", `${n.sections.reduce((a, x) => a + x.concepts.length, 0)} concepts`)));
      break;

    case "commands":
      if (!r.commands.length) return emptyState(wrap, s, title);
      put(r.commands, (x) => h("a.res-row", { href: href(`commands/${x.id}`) },
        h("span.res-row__t", x.title || x.id),
        x.verification ? h("span.badge", x.verification) : null));
      break;

    case "lessons":
      if (!r.lessons.length) return emptyState(wrap, s, title);
      put(r.lessons, (x) => h("a.res-row", { href: href(`lessons/${x.id}`) },
        h("span.res-row__t", x.title),
        h("span.res-row__m", x.time || "")));
      break;

    case "services":
      if (!r.services.length) return emptyState(wrap, s, title);
      wrap.appendChild(h("p.srcref",
        "One reference profile per service: what it is for, how to configure it, " +
        "how to verify it, and what to do when it fails. These are not lessons."));
      put(r.services, (x) => h("a.res-row", { href: href(`lessons/${x.id}`) },
        h("span.res-row__t", x.title),
        x.verification ? h("span.badge", x.verification) : null));
      break;

    case "practice":
    case "troubleshooting":
      if (!r.scenarios.length) return emptyState(wrap, s, title);
      put(r.scenarios, (x) => h("a.res-row", { href: href(`scenarios/${x.id}`) },
        h("span.res-row__t", x.title),
        h("span.res-row__m", x.time || "")));
      break;

    case "quizzes":
      if (!r.quizzes.length) return emptyState(wrap, s, title);
      put(r.quizzes, (x) => h("a.res-row", { href: href(`quizzes/${x.id}`) },
        h("span.res-row__t", x.title)));
      break;

    case "projects":
      if (!r.projects.length) return emptyState(wrap, s, title);
      put(r.projects, (x) => h("a.res-row", { href: href(`projects/${x.id}`) },
        h("span.res-row__t", x.title)));
      break;

    case "certification": {
      if (!r.guides.length && !r.exams.length) return emptyState(wrap, s, title);
      if (r.guides.length) {
        wrap.appendChild(h("h2", "Certification guides"));
        put(r.guides, (g) => h("a.res-row", { href: href(`library/${g.id}`) },
          h("span.res-row__t", g.title),
          h("span.res-row__m", g.full ? "Full text in the app" : "Chapter index")));
      }
      if (r.exams.length) {
        wrap.appendChild(h("h2", "Exam objectives"));
        put(r.exams, (e) => h("a.res-row", { href: href(`objectives#${e.code || e.id}`) },
          h("span.res-row__t", e.code || e.id),
          h("span.res-row__m", e.title || "")));
      }
      break;
    }

    default:
      return notFound("Subject section", `${params.id}/${kind}`);
  }

  return wrap;
}

function emptyState(wrap, s, title) {
  wrap.appendChild(h("div.note.note--risk",
    h("strong", "Not written yet"),
    h("span", `There is no ${title.toLowerCase()} material for ${s.label} yet. ` +
              `The count stays at zero rather than showing filler.`)));
  return wrap;
}

function notFound(what, id) {
  return h("div",
    h("h1", "Not found"),
    h("p", `No ${what} with the id "${id}".`),
    h("a.btn", { href: href("subjects") }, "All subjects"));
}
