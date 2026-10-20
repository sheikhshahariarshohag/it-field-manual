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

/**
 * Study books whose bodies are not being worked on yet.
 *
 * RHEL's Study Manual is now the Administration I chapters (the `rhel`
 * documents), which run as the single source of RHEL 1 material. The two older
 * guides - Administration II (rh134) and Ansible Automation (rh294) - are held
 * behind one placeholder each while the material is rewritten, exactly like a
 * held subject.
 *
 * One unit is exempt: rh134-13, the Comprehensive Review. The brief protects it
 * by name, so it stays listed and reachable at its own route even though the
 * rest of its book is held.
 */
export const HELD_STUDY_BOOKS = new Set(["rh134", "rh294"]);

/** Units kept visible even while their book is held. */
const PRESERVED_STUDY_UNITS = new Set(["rh134-13"]);

/** Is this study book (rh134, rh294, ...) on hold? */
export function isHeldBook(bookId) {
  return HELD_STUDY_BOOKS.has(bookId);
}

/** May this unit be listed even when its book is held? */
export function isPreservedUnit(unitId) {
  return PRESERVED_STUDY_UNITS.has(unitId);
}

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));
export const ALL_SUBJECT_IDS = SUBJECTS.map((s) => s.id);

/**
 * Subjects whose material is not being worked on yet.
 *
 * These stay visible - a reader looking for MikroTik should find the subject,
 * not a 404 - but every page under them answers with one consistent placeholder
 * instead of the thin, unwritten records currently in the corpus. RHEL and
 * CCNA are the two subjects being written; the rest wait.
 */
export const HELD_SUBJECTS = new Set(["mikrotik", "win11", "winserver", "aplus"]);

/** Is this subject on hold? */
export function isHeld(tech) {
  return HELD_SUBJECTS.has(tech);
}

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
 * Is this record a service profile rather than a lesson?
 *
 * THE DATA DOES NOT SAY SO
 * Every one of the 32 lesson records carries `kind: "lesson"`, including all
 * nineteen RHEL service profiles. So the field that ought to distinguish them
 * is useless, and anything that filtered on `kind === "service"` returned an
 * empty list while the subject page went on calling auditd, chronyd, firewalld
 * and PostgreSQL "lessons". That is what was on screen.
 *
 * The records do carry other, reliable evidence, checked in order:
 *
 *   quickRef      a reference card of the service's own. Only profiles have one.
 *   tags          the profiles tag themselves "service"
 *   id            the profiles are built as `rhel-service-<unit>`
 *   summary       the profiles introduce themselves as "RHEL 10 service profile
 *                 for 08-auditd"
 *
 * Checked against all 32 records this returns 19 service profiles - every one
 * of them RHEL - and 13 lessons spread across all six subjects. Measured, not
 * assumed: `node scripts/check-lesson-kinds.mjs`.
 */
export function isServiceProfile(d) {
  if (!d) return false;
  if (d.quickRef !== undefined) return true;
  if (Array.isArray(d.tags) && d.tags.includes("service")) return true;
  if (/^rhel-service-/.test(String(d.id || ""))) return true;
  return /service profile/i.test(String(d.summary || ""));
}

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

  const mine = byId(C.lessons).filter((x) => x.tech === t);

  return {
    id: t,

    commands: byId(C.commands).filter((x) => x.tech === t),

    // Lessons and service profiles are different resources and are counted
    // separately. They were conflated until now.
    lessons: mine.filter((x) => !isServiceProfile(x)),
    services: mine.filter(isServiceProfile),

    scenarios: byId(C.scenarios).filter((x) => x.tech === t),
    quizzes: byId(C.quizzes).filter((x) => x.tech === t),
    projects: byId(C.projects).filter((x) => x.tech === t),

    // Study units and notes are keyed by book rather than tech.
    studyUnits: study
      .filter((b) => BOOK_SUBJECT[b.id] === t)
      .flatMap((b) => (b.units || []).map((u) => ({ ...u, book: b.id, bookTitle: b.title, bookCode: b.code }))),

    notes: notes.filter((c) => BOOK_SUBJECT[idOfBook(c)] === t),

    // Certification guides live in the library.
    //
    // The CCNA book used to be deliberately absent - it had been removed at the
    // owner's request, and the subject kept only its commands, lessons and
    // syllabus. It is no longer absent: CCNA 200-301 arrived as 23 source .docx
    // chapters and is now the subject's main content, as a study manual of 23
    // units with 138 labs and 1,092 questions. Those chapters are generated
    // study material, NOT Cisco courseware, and they have NOT been checked
    // against Cisco's own documents - which is why every unit carries
    // verification "not-source-checked" and the subject page says so.
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
    services: r.services.length,
    scenarios: r.scenarios.length,
    quizzes: r.quizzes.length,
    projects: r.projects.length,
    studyUnits: r.studyUnits.length,
    notes: r.notes.length,
    guides: r.guides.length,
    exams: r.exams.length,
    total: r.commands.length + r.lessons.length + r.services.length +
           r.scenarios.length + r.quizzes.length + r.projects.length +
           r.studyUnits.length + r.notes.length + r.guides.length,
  };
}

/**
 * The subsections a subject page shows, in reading order.
 *
 * A section with nothing in it is returned with `count: 0` so the page can
 * render an honest empty state instead of pretending it does not exist.
 *
 * "Service manual" is separate from "Lessons" because they are different
 * resources: a lesson explains a topic, a service profile is a reference card
 * for running one piece of software. RHEL has nineteen of the second and one of
 * the first, and listing them together under one heading is what made auditd,
 * chronyd and PostgreSQL look like lessons.
 */
export function sectionsFor(tech) {
  const c = countsFor(tech);
  return [
    { key: "study", label: "Study Manual", blurb: "Chapters in reading order.", count: c.studyUnits, href: `subjects/${tech}/study` },
    { key: "notes", label: "Simple Notes", blurb: "Quick revision, not the full chapter.", count: c.notes, href: `subjects/${tech}/notes` },
    { key: "lessons", label: "Lessons", blurb: "Topics explained in depth.", count: c.lessons, href: `subjects/${tech}/lessons` },
    { key: "services", label: "Service Manual", blurb: "Reference profiles, one per service.", count: c.services, href: `subjects/${tech}/services` },
    { key: "commands", label: "Commands", blurb: "Command reference with syntax and risk.", count: c.commands, href: `subjects/${tech}/commands` },
    { key: "labs", label: "Labs and practice", blurb: "Things to do on a spare machine.", count: c.scenarios, href: `subjects/${tech}/practice` },
    { key: "troubleshooting", label: "Troubleshooting", blurb: "Symptoms and investigations.", count: c.scenarios, href: `subjects/${tech}/troubleshooting` },
    { key: "quizzes", label: "Quizzes and review", blurb: "Test yourself.", count: c.quizzes, href: `subjects/${tech}/quizzes` },
    { key: "projects", label: "Projects", blurb: "Bigger end-to-end builds.", count: c.projects, href: `subjects/${tech}/projects` },
  ];
}

/** Every subject that has at least one resource, for the home page. */
export function populatedSubjects() {
  return SUBJECTS.map((s) => ({ ...s, counts: countsFor(s.id) }));
}
