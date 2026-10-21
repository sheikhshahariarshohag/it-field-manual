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
import * as V from "./views.js";
import { chapterTitle } from "./titles.js";

/* ------------------------------------------------------- placeholder */

/**
 * The one placeholder every held subject and unwritten section uses.
 *
 * Written as a component so the wording is identical everywhere it appears -
 * a reader who meets "Waiting for the files to write." on MikroTik's landing
 * page meets the same sentence on its Commands page, not a second, differently
 * worded apology. `heading` and `hint` let a caller add one specific line
 * without forking the component.
 */
export function placeholder({ heading = "Not written yet", hint = "" } = {}) {
  const box = h("div.note.note--risk");
  box.appendChild(h("strong", heading));
  box.appendChild(h("span", "Waiting for the files to write."));
  if (hint) box.appendChild(h("span", hint));
  return box;
}


/* ------------------------------------------------------------------ home */

/**
 * The home page: a study dashboard.
 *
 * Ordered by what a returning learner needs first - where they left off, how
 * far they have come, and what to open next - then by what is on the shelf.
 * Every number is counted from real records; every block degrades to something
 * useful for a first-time visitor with no saved data, because the page must
 * never depend on storage to render.
 */
export async function homeView() {
  const wrap = h("div");
  const subjects = S.populatedSubjects();

  wrap.appendChild(h("header.home-hero",
    h("h1", "Study dashboard"),
    h("p.home-hero__sub",
      "Where you left off, how far you have come, and what to open next. " +
      "Everything below is counted from this device - nothing is uploaded."),
  ));

  /* --- read saved state, defensively -------------------------------- */
  let prog = [];
  let quizzes = [];
  try {
    [prog, quizzes] = await Promise.all([db.store.progress(), db.store.quizzes()]);
  } catch (_) {
    // Private browsing, or the store is not ready. The page still renders;
    // the snapshot simply reports zero, which is true on a fresh device.
  }
  const unitProgress = prog.filter((p) => !V.isLabRecord(p));
  const done = unitProgress.filter((p) => p.status === "done");

  /* --- study snapshot: ring + headline figures ---------------------- */
  const studyUnits = (search.CORPUS.study?.books || [])
    .reduce((a, b) => a + (b.units || []).length, 0);
  const trackable = studyUnits + search.CORPUS.lessons.length;
  const pct = trackable ? Math.round((done.length / trackable) * 100) : 0;

  wrap.appendChild(h("div.dash",
    V.ring(pct, `${done.length} of ${trackable} complete`),
    h("div.stat-row.stat-row--dash",
      h("div.stat", h("div.stat__n", String(done.length)), h("div.stat__l", "marked complete")),
      h("div.stat", h("div.stat__n", String(unitProgress.filter((p) => p.wrong).length)), h("div.stat__l", "weak spots")),
      h("div.stat", h("div.stat__n", String(quizzes.filter((q) => q.score !== null && q.score !== undefined).length)), h("div.stat__l", "quizzes attempted")),
      h("div.stat", h("div.stat__n", String(V.cardsAttempted(quizzes))), h("div.stat__l", "cards turned over")),
    ),
  ));

  /* --- continue where you left off ---------------------------------- */
  let recent = [];
  let inProgress = [];
  try {
    const marks = await db.store.bookmarks();
    const doneIds = new Set(prog.map((p) => p.id));
    inProgress = prog
      .filter((p) => p.status && p.status !== "done")
      .slice(0, 4)
      .map((p) => resolveDoc(p.id))
      .filter(Boolean);
    const order = new Map((marks || []).map((m, i) => [m.id, i]));
    recent = (marks || [])
      .filter((m) => !doneIds.has(m.id))
      .sort((a, b) => (order.get(b.id) ?? 0) - (order.get(a.id) ?? 0))
      .slice(0, 5)
      .map((m) => resolveDoc(m.id))
      .filter(Boolean);
  } catch (_) { /* the resume block is optional */ }

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

  /* --- next step ----------------------------------------------------- */
  const suggestion = nextStep(subjects, prog, done);
  if (suggestion) {
    wrap.appendChild(h("div.home-next",
      h("div.home-next__body",
        h("span.home-next__k", "Suggested next step"),
        h("p", suggestion.text),
      ),
      h("a.btn.btn--primary", { href: href(suggestion.href) }, suggestion.cta),
    ));
  }

  /* --- progress by course ------------------------------------------- */
  wrap.appendChild(V.courseBreakdown(prog, done));

  /* --- subjects ------------------------------------------------------ */
  wrap.appendChild(h("h2.home-h", "Subjects"));
  const grid = h("div.subject-grid");
  for (const s of subjects) grid.appendChild(subjectCard(s));
  wrap.appendChild(grid);

  /* --- activity + practice shortcuts --------------------------------- */
  wrap.appendChild(V.activityHeatmap(unitProgress));

  wrap.appendChild(h("h2.home-h", "Practise and revise"));
  wrap.appendChild(h("div.home-tools",
    toolCard("Troubleshooting", "scenarios", "Investigate a symptom you are actually seeing."),
    toolCard("Quizzes", "quizzes", "Test what you have covered, by subject."),
    toolCard("Projects", "projects", "End-to-end builds rather than single commands."),
    toolCard("Lessons", "study", "Chapters in reading order, with a contents list."),
    toolCard("Simple Notes", "notes", "Each RHEL chapter in plain English."),
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

/**
 * One honest suggestion, chosen from what is actually there.
 *
 * Ordered by what is most useful given real progress, not by a fixed script:
 *
 *   1. a weak spot you already missed something on: retake that quiz
 *   2. a course you have started but not finished: continue it
 *   3. nothing started yet: the largest course
 *
 * Every branch points at a page that exists. If none of the three applies
 * (no courses at all), there is simply no suggestion rather than an empty one.
 */
function nextStep(subjects, progress = [], done = []) {
  const wrong = progress.find((p) => p.wrong);
  if (wrong) {
    const doc = resolveDoc(wrong.id);
    if (doc) {
      return {
        text: `You have missed a question on "${doc.title}". Reread it, then retake the quiz - ` +
              `a weak spot you close now is one you do not reopen in the exam.`,
        href: contentHrefFor(doc),
        cta: `Open ${doc.title}`,
      };
    }
  }

  const doneIds = new Set(done.map((d) => d.id));
  for (const s of subjects) {
    if (S.isHeld(s.id)) continue;
    const started = s.counts.total > 0 && s.counts.studyUnits > 0;
    if (!started) continue;
    if (doneIds.size) {
      return {
        text: `Keep going with ${s.label} - you have material marked complete there already, ` +
              `and the chapters build on each other in order.`,
        href: `subjects/${s.id}/study`,
        cta: `Open ${s.label}`,
      };
    }
  }

  const rhel = subjects.find((s) => s.id === "rhel");
  if (rhel && rhel.counts.studyUnits > 0) {
    return {
      text: "Start with the RHEL lessons - it is the largest body of material here, " +
            "and the chapters are ordered so each one builds on the last.",
      href: "subjects/rhel/study",
      cta: "Open the Lessons",
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
  // The documents ARE the lessons, so they are counted once. The old
  // hand-written lesson count is gone from the card with the section.
  if (c.documents) bits.push(`${c.documents} lessons`);
  if (c.studyUnits) bits.push(`${c.studyUnits} study units`);
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

  if (S.isHeld(s.id)) {
    wrap.appendChild(h("header.page-head",
      h("h1", s.label),
      h("p", s.blurb),
      s.exam ? h("div.card__meta", h("span.badge", s.exam)) : null,
    ));
    wrap.appendChild(placeholder({ heading: `${s.label} is on hold` }));
    return wrap;
  }

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

  /*
   * The lessons for this subject: its chapters, reproduced from the sources.
   *
   * Placed before the command lists because for CCNA and RHEL these chapters
   * ARE the subject - they are what someone opens the subject for. A visitor
   * should meet them before the ten supporting commands. Titled "Lessons"
   * because that is what they are: there is no separate hand-written lesson set
   * beside them any more.
   */
  {
    const docs = V.documentsFor(s.id, "Lessons");
    if (docs) wrap.appendChild(docs);
  }
  /* --- a peek at the actual content, not just counts ------------------ */
  const r = S.resourcesFor(s.id);

  // The hand-written "Lessons in this subject" list has gone. For RHEL and
  // CCNA the documents above ARE the lessons, so listing a second, thinner set
  // of lessons underneath said the opposite of what is true. The lesson
  // records themselves are untouched - the Knowledge Map and the study units
  // still point at them by id - they are simply no longer listed as a second
  // body of teaching material beside the chapters they duplicate.

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

  if (S.isHeld(s.id)) {
    wrap.appendChild(placeholder({ heading: `${s.label} is on hold` }));
    return wrap;
  }

  const put = (arr, make) => {
    if (!arr || !arr.length) return;
    const box = h("div.res-list");
    for (const x of arr) box.appendChild(make(x));
    wrap.appendChild(box);
  };

  switch (kind) {
    case "study":
      return studySectionView(wrap, s, title);

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

    case "certification":
    default:
      return notFound("Subject section", `${params.id}/${kind}`);
  }

  return wrap;
}

/**
 * The Lessons section of a subject page (the route is still `study`).
 *
 * TWO SOURCES, ON PURPOSE
 *
 * For CCNA and RHEL the chapters ARE the lessons: CCNA's 23 source documents,
 * and RHEL's Administration I chapters, reproduced from the .docx sources as
 * they are. Those are listed from the subject's document set
 * (`V.documentsFor`), which is the same list the subject landing page and
 * /documents already show - one source, no copy. There is no longer a second,
 * hand-written "Lessons" list beside them.
 *
 * The older study books (rh134, rh294) are held: their bodies are being
 * rewritten, so a reader who opens part of them meets the same placeholder a
 * held subject shows. One unit is exempt - rh134-13, the Comprehensive Review -
 * because the brief protects it by name. It stays listed and reachable.
 */
function studySectionView(wrap, s, title) {
  const r = S.resourcesFor(s.id);
  const docs = V.documentsFor(s.id, s.label + " — Lessons");

  if (!r.studyUnits.length && !docs) return emptyState(wrap, s, title);

  wrap.appendChild(h("p.srcref",
    "Chapters in reading order. Each opens a reader with a contents list."));

  // The subject's own chapters: for RHEL and CCNA, the documents ARE the
  // lessons.
  if (docs) wrap.appendChild(docs);

  // The older numbered study books. Held books collapse to one placeholder, so
  // the section honestly says "not written yet" rather than listing chapters
  // whose bodies are no longer the ones being taught.
  const books = [...new Set(r.studyUnits.map((u) => u.book))];
  for (const book of books) {
    const units = r.studyUnits.filter((u) => u.book === book);
    if (!units.length) continue;

    if (S.isHeldBook(book)) {
      wrap.appendChild(h("h2", units[0].bookTitle || book));
      const preserved = units.filter((u) => S.isPreservedUnit(u.id));
      if (preserved.length) {
        const ul = h("ol.sessions");
        for (const u of preserved) {
          ul.appendChild(h("li.session",
            h("a.session__link", { href: href(`study/${u.id}`) },
              h("span.session__n", String(u.n)),
              h("span.session__body",
                h("span.session__title", chapterTitle(u.display || u.title)),
                h("span.session__sum", `${u.sections} sections`)),
            ),
          ));
        }
        wrap.appendChild(ul);
      }
      wrap.appendChild(placeholder({ heading: `${units[0].bookTitle || book} is being rewritten` }));
      continue;
    }

    wrap.appendChild(h("h2", units[0].bookTitle || book));
    // chapterTitle(), not u.display. This page was showing the raw stored
    // title - "Part 0 - BUILDING YOUR PRACTICE LAB", "Ch 1 - GETTING
    // STARTED WITH RED HAT ENTERPRISE LINUX" - while the central Study
    // Manual page showed the normalised one. Same data, two different
    // headings on two different pages.
    const ul = h("div.res-list");
    for (const u of units) {
      ul.appendChild(h("a.res-row", { href: href(`study/${u.id}`) },
        h("span.res-row__t", chapterTitle(u.display || u.title)),
        h("span.res-row__m", `${u.sections} sections`)));
    }
    wrap.appendChild(ul);
  }

  return wrap;
}

function emptyState(wrap, s, title) {
  wrap.appendChild(placeholder({ heading: `${s.label} — ${title} is not written yet` }));
  return wrap;
}

function notFound(what, id) {
  return h("div",
    h("h1", "Not found"),
    h("p", `No ${what} with the id "${id}".`),
    h("a.btn", { href: href("subjects") }, "All subjects"));
}
