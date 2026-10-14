/**
 * subjects.js — the subject registry.
 *
 * THE SPINE OF THE INFORMATION ARCHITECTURE
 *
 * Everything else in the app is a *view over canonical records*. This module is
 * the one place that knows which records belong to which subject, so a subject
 * landing page and a central filtered list are the same data reached two ways,
 * never two copies.
 *
 * Before this existed, `/subjects` was a flat page that looped subjects and
 * listed lessons inline. There was no `/subjects/rhel`, so every section a
 * subject needs had to be reinvented per view, and adding a subject meant
 * editing that loop. Central sections could not filter by subject at all.
 *
 * Resolution is by filtering the existing arrays on `tech`, because that field
 * is already on every command, lesson, scenario, quiz and project. Study units
 * and Simple Notes carry a book rather than a tech, so they map through
 * BOOK_SUBJECT below. No record is copied or rewritten to make this work.
 */
import * as search from "./search.js";

/**
 * The six subjects. `label` is what the learner sees; version information
 * deliberately does not live here - it belongs in content metadata
 * (`tested_on.os`, `exam`) so a subject stays "RHEL" when RHEL 11 ships.
 */
export const SUBJECTS = [
  {
    id: "rhel",
    label: "RHEL",
    short: "RHEL",
    blurb: "Red Hat Enterprise Linux administration - the RHCSA and RHCE path.",
    exam: "RHCSA (EX200) and RHCE (EX294)",
    varName: "--tech-rhel",
    order: 1,
  },
  {
    id: "cisco",
    label: "CCNA",
    short: "CCNA",
    blurb: "Cisco networking fundamentals through to configuration and security.",
    exam: "CCNA 200-301",
    varName: "--tech-cisco",
    order: 2,
  },
  {
    id: "mikrotik",
    label: "MikroTik",
    short: "MikroTik",
    blurb: "RouterOS routing, switching and wireless on MikroTik hardware.",
    exam: "MTCNA, MTCRE",
    varName: "--tech-mikrotik",
    order: 3,
  },
  {
    id: "win11",
    label: "Windows 11",
    short: "Win 11",
    blurb: "Windows 11 client administration, deployment and troubleshooting.",
    exam: "",
    varName: "--tech-win11",
    order: 4,
  },
  {
    id: "winserver",
    label: "Windows Server",
    short: "Win Srv",
    blurb: "Windows Server roles, AD, DNS, DHCP and hybrid administration.",
    exam: "AZ-800",
    varName: "--tech-winserver",
    order: 5,
  },
  {
    id: "aplus",
    label: "CompTIA A+",
    short: "A+",
    blurb: "Hardware, networking and operating-system fundamentals.",
    exam: "220-1201 and 220-1202",
    varName: "--tech-aplus",
    order: 6,
  },
];

/** Study-manual and Simple-Notes books map to a subject by book id. */
const BOOK_SUBJECT = {
  rh124: "rhel",
  rh134: "rhel",
  rh294: "rhel",
};

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));
export const ALL_SUBJECT_IDS = SUBJECTS.map((s) => s.id);

/** The subject record, or null for an unknown id. */
export function subject(id) {
  return SUBJECT_BY_ID.get(id) || null;
}

/** Display label for a `tech` value, falling back to the raw value. */
export function labelFor(tech) {
  const s = SUBJECT_BY_ID.get(tech);
  return s ? s.label : tech || "";
}

const byId = (a) => a || [];

/**
 * Every canonical resource for one subject, grouped by kind.
 *
 * Each group is a filtered view of the existing corpus arrays. Nothing is
 * duplicated: editing a lesson edits it everywhere it appears.
 */
export function resourcesFor(tech) {
  const C = search.CORPUS;
  const t = tech || "";
  const study = (C.study && C.study.books) || [];
  const notes = (C.notes && C.notes.chapters) || [];

  return {
    id: t,

    commands: byId(C.commands).filter((x) => x.tech === t),
    lessons: byId(C.lessons).filter((x) => x.tech === t),
    scenarios: byId(C.scenarios).filter((x) => x.tech === t),
    quizzes: byId(C.quizzes).filter((x) => x.tech === t),
    projects: byId(C.projects).filter((x) => x.tech === t),

    // The RHEL service profiles are lessons already, so they are not separated
    // out here; the lesson list carries them with their own kind.
    services: byId(C.lessons).filter((x) => x.tech === t && x.kind === "service"),

    // Study units and notes are keyed by book rather than tech.
    studyUnits: study
      .filter((b) => BOOK_SUBJECT[b.id] === t)
      .flatMap((b) => (b.units || []).map((u) => ({ ...u, book: b.id, bookTitle: b.title, bookCode: b.code }))),

    notes: notes.filter((c) => BOOK_SUBJECT[idOfBook(c)] === t),

    // Certification guides live in the library. The CCNA book is deliberately
    // absent: it was removed at the owner's request, and the CCNA subject keeps
    // its commands, lessons and syllabus.
    guides: (C.library && C.library.books ? C.library.books : [])
      .filter((b) => b.subject === t)
      .map((b) => ({ ...b, chapterCount: (b.chapters || []).length })),

    // Exam syllabi that cover this subject.
    exams: ((C.objectives && C.objectives.exams) || [])
      .filter((e) => examMatchesSubject(e, t)),
  };
}

/** Simple-Notes chapters carry `book`; map it to the book id form. */
function idOfBook(c) {
  return String(c.book || "").toLowerCase();
}

const SUBJECT_EXAM_HINTS = {
  rhel: ["rhcsa", "rhce", "rhel", "ex200", "ex294"],
  cisco: ["200-301", "ccna"],
  mikrotik: ["mtcna", "mtcre", "mikrotik"],
  win11: ["windows 11"],
  winserver: ["az-800", "windows server"],
  aplus: ["220-1201", "220-1202", "a+"],
};

/** Does an exam syllabus cover this subject? */
function examMatchesSubject(exam, tech) {
  const hints = SUBJECT_EXAM_HINTS[tech] || [];
  const hay = `${exam.code || ""} ${exam.title || ""} ${exam.id || ""}`.toLowerCase();
  return hints.some((h) => hay.includes(h));
}

/**
 * Counts for one subject, used for the card and for deciding which
 * subsections are worth showing at all.
 *
 * Empty subsections are reported as zero rather than hidden in the counts, so
 * the subject page can decide honestly what to show and what to mark as not
 * written yet.
 */
export function countsFor(tech) {
  const r = resourcesFor(tech);
  return {
    commands: r.commands.length,
    lessons: r.lessons.length,
    scenarios: r.scenarios.length,
    quizzes: r.quizzes.length,
    projects: r.projects.length,
    studyUnits: r.studyUnits.length,
    notes: r.notes.length,
    guides: r.guides.length,
    exams: r.exams.length,
    total: r.commands.length + r.lessons.length + r.scenarios.length +
           r.quizzes.length + r.projects.length + r.studyUnits.length +
           r.notes.length + r.guides.length,
  };
}

/**
 * The subsections a subject page shows, in reading order.
 *
 * A section with nothing in it is returned with `count: 0` so the page can
 * render an honest empty state instead of pretending it does not exist, and
 * without a card full of nothing.
 */
export function sectionsFor(tech) {
  const r = resourcesFor(tech);
  const c = countsFor(tech);
  const out = [
    { key: "study", label: "Study Manual", blurb: "Chapters in reading order.", count: c.studyUnits, href: `subjects/${tech}/study` },
    { key: "notes", label: "Simple Notes", blurb: "Quick revision, not the full chapter.", count: c.notes, href: `subjects/${tech}/notes` },
    { key: "commands", label: "Commands", blurb: "Command reference with syntax and risk.", count: c.commands, href: `subjects/${tech}/commands` },
    { key: "lessons", label: "Lessons", blurb: "Task-oriented walk-throughs.", count: c.lessons, href: `subjects/${tech}/lessons` },
    { key: "labs", label: "Labs and practice", blurb: "Things to do on a spare machine.", count: c.scenarios, href: `subjects/${tech}/practice` },
    { key: "troubleshooting", label: "Troubleshooting", blurb: "Symptoms and investigations.", count: c.scenarios, href: `subjects/${tech}/troubleshooting` },
    { key: "quizzes", label: "Quizzes and review", blurb: "Test yourself.", count: c.quizzes, href: `subjects/${tech}/quizzes` },
    { key: "projects", label: "Projects", blurb: "Bigger end-to-end builds.", count: c.projects, href: `subjects/${tech}/projects` },
    { key: "certification", label: "Certification preparation", blurb: "Exam objectives and readiness.", count: c.guides + c.exams, href: `subjects/${tech}/certification` },
  ];
  return out;
}

/** Every subject that has at least one resource, for the home page. */
export function populatedSubjects() {
  return SUBJECTS.map((s) => ({ ...s, counts: countsFor(s.id) }));
}
