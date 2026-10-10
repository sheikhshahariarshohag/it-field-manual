# Decision Log

Decisions made autonomously, with the reasoning. A decision without its reason is
useless six months later.

---

## D-001 — Build a new static PWA rather than modify `NSpersonal v0.1`

**Context.** `NSpersonal v0.1` (Life OS) is a mature, well-engineered local-first
PWA with IndexedDB, a service worker, and JSON-Lines export.

**Decision.** Build a separate application. Study Life OS; do not modify it.

**Why.** Life OS solves a different problem (personal life management, single
user, optional sync server). The Field Manual needs a large read-only corpus,
zero server, and no account. Merging the two would couple the lifecycles of two
unrelated projects and put your personal data at risk from manual content
changes. It also isn't mine to change — your project, your rules.

**Borrowed anyway:** the zero-dependency, no-build-step, `textContent`-never-
`innerHTML`, and "documentation is part of the change" principles.

---

## D-002 — The project lives in `it-field-manual\`, not the profile root

**Context.** `C:\Users\<your-name>` is already a git repository with zero commits and
nothing ignored. `git add -A` there would have staged `NTUSER.DAT`, `.ssh/`,
`AppData/` and the entire book library.

**Decision.** New repository at `C:\Users\<your-name>\it-field-manual\`, plus a
protective `.gitignore` at the profile root.

**Why.** The root repo is a hazard, not a project. Adding `.gitignore` was
additive, reversible, and prevented a catastrophic outcome. Measured: untracked
entries went from 20+ (including credentials and books) to 3.

**Also decided:** never run `git add` at `C:\Users\<your-name>`. The manual's history
must never contain your Windows profile.

---

## D-003 — Extracted PDF text into `private/`, outside the repository

**Decision.** All extracted book text, probes and working notes live in
`C:\Users\<your-name>\it-field-manual\private\` and are gitignored.

**Why.** Extracted text is a derivative of copyrighted books. Even though it
never ships, keeping it inside the repository risks it being committed by an
accidental `git add`. Two layers of protection: the directory is ignored, and
`validate.mjs` greps the shipped app for book filenames and fails the build.

---

## D-004 — Wrote a PDF extractor instead of installing tooling

**Context.** No Python, no `pdftotext`, no `pandoc`, no 7-Zip, no ImageMagick.
Node 24 and npm were available.

**Decision.** `tools/pdfextract/` — a Node + pdfjs-dist extractor, dev-only,
gitignored, never shipped.

**Why.** Installing system tooling changes your machine and needs your consent
for no clear gain. A local dev dependency is reversible, scoped, and gives
something extra the system tools do not: per-file page/character counts, which
let me *prove* all 23 PDFs have a text layer rather than assuming it.

**Result:** all 23 PDFs extracted; ~11,061 pages; **zero scanned documents**; two
duplicates and two misnamed files discovered.

---

## D-005 — Vanilla ES modules, no framework, no build step

**Decision.** Plain JavaScript modules, hand-written CSS, zero runtime
dependencies, no bundler.

**Why.** Matches the brief (offline-first, GitHub Pages, no unnecessary
dependencies) and matches what already works in your Life OS project. A manual
you will still open in five years should not need `npm install` to render.

**Cost, accepted honestly:** no TypeScript safety, and every cross-file change
needs `node --check`. Mitigated by `validate.mjs` and the browser tests.

---

## D-006 — `h()` builds all DOM; no way to inject a string as markup

**Decision.** Every node is created with `createElement` + `textContent`. There
is no `html` property and no `innerHTML` anywhere.

**Why.** The corpus is JSON that could contain anything. Making markup injection
structurally impossible removes a whole class of bug and one whole class of
attack, instead of relying on remembering to escape strings.

**Enforced by:** `validate.mjs` fails the build if `innerHTML` appears in `docs/`.

---

## D-007 — Search indexes at runtime instead of shipping a prebuilt index

**Decision.** Fetch the small JSON files at boot and build an inverted index in
memory.

**Why.** A prebuilt index is faster but goes stale the moment content changes —
exactly the bug class that wastes hours. The corpus is small enough that
runtime indexing is imperceptible, and it means content and index can never
disagree.

---

## D-008 — Four verification levels, enforced by the validator

**Decision.** Every entry carries a verification status, and the build **fails**
if an entry claims `execution-tested` without a `tested_on` record.

**Why.** "Verified" is the word people use to mean several different things. The
only way to stop the manual from misrepresenting itself later is to make the
claim expensive and machine-checkable. The strongest honest state today is
`source-checked`, and the register says so.

---

## D-009 — Simulation labels on every scenario

**Decision.** Every scenario carries a `simulated` note stating that the
addresses and outputs are realistic teaching examples, not captures from a live
incident.

**Why.** Realistic output is far more instructive than placeholder text. But
someone will eventually copy an output block into a report. The label removes
that risk without giving up realism.

---

## D-010 — Fixed six real bugs found by testing, not by reading

Recorded in full in `KNOWN_LIMITATIONS.md §Bugs found and fixed`. The two that
mattered most:

**The offline cache could be poisoned.** When the origin died, the environment's
proxy answered **502** — a valid HTTP response, not a network error. My
navigation handler cached it, overwriting a good copy of the shell with an empty
error page. Offline support was silently destroyed. Fixed by treating *any*
non-OK navigation response as a failure and falling back to cache.

**Storage eviction would silently kill offline mode.** If the caches were cleared
while the worker stayed registered and byte-identical, `install` never re-ran and
the app would never re-cache. Fixed with a `repairCaches()` pass on every
`activate` that re-fetches anything missing *or* suspiciously small.

**Why this is in the log:** both bugs were found only because the app was
exercised in a browser with the server actually stopped. Neither was visible in
the source.

---

## D-011 — Tech colours as CSS variables with separate light/dark values

**Decision.** Six `--tech-*` custom properties, defined **twice** — a dark set
for the dark theme, a light set for the light theme.

**Why.** Lighthouse failed contrast with a single shared colour set (96/100).
A colour cannot clear 4.5:1 on both white and near-black. Splitting them
per theme reached **100/100 in both themes**. Chosen values are documented with
their measured ratios in `TEST_PLAN.md`.

---

## D-012 — Honest offline status instead of a green "you are online" light

**Decision.** The status panel says "Device has a network", "Offline cache
active", and "This page loaded from cache" — three separate, separately true
statements.

**Why.** During testing, the origin was dead while `navigator.onLine` still
returned `true`. Showing "Network available" would have been a lie. The label
now describes what is actually measured.

---

## D-013 — Adopt your 25-section RHEL profile format rather than inventing one

**Decision.** The manual's reference-entry shape, the 🟢🟡🟠🔴 risk symbols, and
the verification badges follow the structure you already wrote in
`00-master-index.md` … `21-final-cross-service-sections.md`.

**Why.** It is good, it is yours, and you have already read a lot of it. Inventing
a second format would have made the manual harder for *you* to use. Adopting it
also means your existing work becomes seed content instead of being duplicated.