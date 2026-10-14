# Redesign audit — IT Field Manual

Audited from the source on 2026-10-14. Every finding below was verified by
reading the code or the data, not inferred from how the app looks.

## 1. What exists

| Area | State |
|---|---|
| Shell | Vanilla ES modules, no framework, no build step, zero runtime deps |
| Assets | `app.js` 24.5 KB, `views.js` 91.9 KB, `search.js` 14.9 KB, `db.js` 8.8 KB, `router.js` 4.3 KB, `ui.js` 9.3 KB, `prose.js` 11.8 KB, `app.css` 49.8 KB |
| Storage | IndexedDB, 4 stores: `notes`, `bookmarks`, `progress`, `quiz`. Has an in-memory fallback for private mode |
| Content | 43 commands, 32 lessons, 3 scenarios, 3 quizzes, 1 project, 146 Knowledge Map sessions, 39 study units, 39 Simple Notes chapters, 2 library books, 7 exam syllabi |
| Offline | Service worker precache + lazy per-unit fetch |

Content by subject — this is where the imbalance is:

| Subject | Commands | Lessons |
|---|---|---|
| RHEL | 8 | 20 |
| CCNA | 12 | 4 |
| MikroTik | 8 | 2 |
| Windows 11 | 7 | 2 |
| Windows Server | 5 | 2 |
| CompTIA A+ | 3 | 2 |

Scenario (3), quiz (3) and project (1) counts are app-wide, not per subject.

## 2. Confirmed defects against the brief

### D1 — Light is NOT the default for a first-time visitor
`initTheme()` sets `data-theme` only when a value was previously saved. With
nothing saved the attribute is absent, and `app.css` has
`@media (prefers-color-scheme: dark) { html:not([data-theme="light"]) {...} }`.
So a visitor whose OS is dark **gets dark on first load**. This breaks
acceptance criterion 1 outright, and it is a regression introduced when the
prose theme tokens were added.

### D2 — Subject name is "RHEL 10", not "RHEL"
`TECH.rhel.label = "RHEL 10"` in `views.js`. Breaks criterion 5. Version
information belongs in content metadata, which `tested_on.os` already carries.

### D3 — There are no subject landing pages
`/subjects` is a single flat page: for each subject, a heading and a grid of
its lessons. There is no `/subjects/rhel` route at all. Every subject
subsection in §3 of the brief has to be invented per view. Breaks criteria 3,
4 and 12, and makes criterion 13 (add a subject without redesigning) impossible.

### D4 — Navigation is not subject-first
Primary nav is Home / Commands / Lessons / Knowledge Map. Study Manual, Simple
Notes, Library, Assessment, Projects, Exam objectives and Verification are in a
separate trailing group. A learner looking for "the RHEL course material"
finds nothing named that.

### D5 — Study Manual has no table of contents
`studyUnitView` renders a flat `div.study__body`. No TOC, no heading anchors, no
active-section tracking, no next/previous. On a 48-section unit the only way
to move is scrolling or leaving. Breaks criterion 7.

### D6 — Knowledge Map interrupts reading with chips
`knowledgeSessionView` renders "Sections in this session" as a row of buttons,
and each chip fetches and reveals one section. A session with many sections
becomes a wall of buttons and the reader cannot read the topic as a document.
Breaks criterion 8 and is the exact pattern the brief calls out.

### D7 — RHCSA guide is stranded in Library
The certification guide lives at `library/rhcsa`. There is no Certification
Preparation anywhere, and RHEL has no route to it. Breaks criterion 10.

### D8 — Library still contains CCNA
`library.json` has a `ccna` entry. The brief asks for it removed while keeping
the CCNA subject intact. Breaks criterion 11.

### D9 — Central sections cannot filter by subject
Practice (scenarios), Quizzes, Projects and Bookmarks render everything with no
subject, topic, difficulty or type filter. Breaks criterion 12's "alternate
views of the same records".

### D10 — Simple Notes have no stated purpose or outbound links
`notes` renders chapters, but nothing tells a reader these are quick revision
rather than the full chapter, and no note links to the chapter it summarises.
Breaks criterion 9.

## 3. What is already right and must not be broken

- Offline-first with a service worker; lazy per-unit fetch for the Knowledge
  Map, study units and library chunks.
- Content is already separated from presentation — 39 KB of `study-manual.json`
  plus per-unit files, not embedded in views.
- `prose.js` already distinguishes command / config / path / output / prose,
  with contrast verified in both themes.
- Search covers commands, lessons, scenarios, quizzes, projects, Knowledge Map
  sessions, study units, Simple Notes and library chapters.
- All four IndexedDB stores have export/import.
- Direct links work after refresh; hash routing is deliberate so `file://`
  works.
- Verification labels (`source-checked`, `execution-tested`, …) are carried on
  content and rendered. Must survive the redesign.

## 4. Migration plan

Nothing needs a data migration. The gap is that content has **no explicit
subject relationship on some record types** and **no subject landing pages**.

1. Add a single `subjects.js` module: the subject registry (id, label, blurb,
   colour token, exam) and a `resourcesFor(subject)` function that resolves
   each subject's commands, lessons, labs, quizzes, projects, scenarios, notes,
   study units and labs **by filtering the canonical arrays on `tech`**.
   Central sections then call the same function — one record, many views.
2. Add `/subjects` (index) and `/subjects/:id` (landing) routes.
3. Re-point the nav at subjects first; keep every existing route working so
   old links and bookmarks do not break.
4. Remove the `ccna` entry from `library.json` and the build script. The CCNA
   subject, its 12 commands and 4 lessons are untouched.
5. Relabel `TECH.rhel` to "RHEL"; move version detail into the subject
   registry's `exam`/`note` fields.
6. Fix the theme default and migrate any previously saved preference safely.

## 5. Acceptance checklist

Tracked in `REDESIGN-CHECKLIST.md` and updated as each phase lands. Nothing is
marked done unless it was run.
