# Codebase Audit — 2026-10-11

Audit performed before the study-platform redesign, as requested. Nothing was
deleted or restructured. Every finding below was either fixed and tested, or is
recorded as outstanding.

---

## 1. What the application actually is

A vanilla ES-module PWA. No framework, no build step, no runtime dependencies.

| File | Lines | Role |
|---|---|---|
| `docs/assets/app.js` | ~525 | boot, data loading, routing, nav, theme, SW updates |
| `docs/assets/views.js` | ~1330 | every page view |
| `docs/assets/ui.js` | 261 | `h()` DOM builder, sheets, toasts, code blocks |
| `docs/assets/search.js` | 222 | token index and scoring |
| `docs/assets/db.js` | 270 | IndexedDB, bookmarks, progress, notes, export/import |
| `docs/assets/router.js` | 69 | hash router |
| `docs/assets/app.css` | ~700 | the whole design system |

20 routes, 13 data files, 82 content items, 2 single-object data files
(`exam-objectives.json`, `knowledge-map.json`).

### Contracts that must not break

1. `h()`'s positional-props detection — `h("h2", title)` must treat a string as
   a child, not props. Every view depends on this.
2. `href()` returns `#/…` and is used directly as an `href` attribute.
3. The router decodes path segments exactly once; `contentHref()` applies
   `encodeURIComponent`. These must stay balanced.
4. `search.CORPUS` is a mutable singleton updated with `Object.assign`.
5. `db.store.note(id, "")` **deletes** rather than storing an empty string.
6. `store.bookmarks()` returns **ids**, not records.
7. `sheet()` and `toast()` resolve `#sheetHost` / `#toastHost` at call time —
   both ids are load-bearing.

---

## 2. Bugs found by the audit — all fixed and tested

These were found by reading the code, not by using it. Each was verified fixed
in a real browser afterwards.

| # | Bug | Impact | Fix |
|---|---|---|---|
| B1 | `progressBar()` called `setProgress(id, {})` **twice** and treated the return value as the record | `setProgress` resolves with the **key**, not the record, so `rec.status` was always `undefined` and the bar **always rendered 0%** — even on lessons marked done. It also wrote a progress record merely by **viewing** a page, so every page ever opened appeared as "Done" work that never happened | Read with `db.get("progress", id)`; never write during render |
| B2 | `progressView()` "undo" called `render(wrap)`, but `render` is not imported into `views.js` | Every undo click threw `ReferenceError: render is not defined` and did nothing | Re-render in place, removing the row |
| B3 | `TECH.rhel.varName` was `"--tech-winserver"` (copy-paste) | Every RHEL badge rendered **green**, identical to Windows Server. RHEL lessons were indistinguishable from Windows Server ones at a glance | Added a real `--tech-rhel` rust token; verified the two colours now differ |
| B4 | `importPersonal()` used `store.toggleBookmark(b)` for each bookmark | `toggleBookmark` **inverts** state, so **importing the same file twice silently deleted every bookmark** it had just added — real data loss | Add only what is missing. Verified: import twice, bookmarks unchanged |
| B5 | `notFound()` ignored both of its arguments | Callers passed a label and an id; neither was displayed | Now renders the label |

### A sixth bug, introduced by fixing B2 and caught immediately

The first attempt at the B2 fix read `ev.currentTarget.closest("li")` **after**
an `await`. The browser nulls `currentTarget` once event dispatch finishes, so
the handler threw `TypeError: Cannot read properties of null` and silently did
nothing. Fixed by capturing the element synchronously before awaiting, then
re-tested: undo works, console is clean.

This is the same class of error as the earlier click-blocker bug — the fix
looked correct and only failed under execution. **It was caught by running it,
not by reading it.**

---

## 3. Knowledge Map PDF audit

The user asked for the PDF's information to be verified and corrected. Here is
exactly what was checked, and what was not.

### Verified

| Claim | Result |
|---|---|
| Page extraction complete | **1402 of 1402** page markers present, no truncation |
| Session count | **146**, matching the document's own table of contents |
| Numbering | Contiguous **1..146**, no gaps, no duplicates |
| Layer boundaries | Taken from the document's own layer headings, not inferred |
| Page range per session | Derived from consecutive TOC page numbers |
| **RFC citations** | All 14 checked and **correct**: 1918, 2136, 6238, 1631, 8200, 793, 792, 791, 768, 7296, 6598, 5424, 5246, 4632 |
| TLS claims (Session 47) | **Correct** — TLS 1.2 = RFC 5246, TLS 1.3 = RFC 8446, SSL by Netscape, SSL 2.0/3.0 deprecated |
| MITRE ATT&CK tactics | "roughly 14 tactics" — **correct**, and appropriately hedged with "roughly" |
| CPU session (Session 1) | Technically sound throughout: cores vs SMT, IPC vs clock speed, cache hierarchy, pipelining |

The document is **AI-generated**, so this was not assumed. It was checked, and
the sampled technical content holds up.

### Finding — the PDF assumes Windows Server 2019

**2019 appears 26 times, and ~24 of those are lab instructions** of the form
*"On your Windows Server 2019 VM, run …"*.

This is not a factual error, but it is a **mismatch with the rest of the
project**:

| | Knowledge Map PDF | This manual |
|---|---|---|
| Windows Server target | **2019** | **2025** (see `VERSION_POLICY.md`) |
| Reason | the user's library is *"Windows Server 2019 & PowerShell"* (Books 4–5) | AZ-800 preparation requires current Server |

Verified against Microsoft's lifecycle page: **Windows Server 2019 mainstream
support ended 2024-01-10**; extended support runs to **2029-01-10**. So it is
still supported, but in extended support — security updates only, no new
features.

**Consequence for the user:** if they sit AZ-800, the hands-on labs need to be
on **Windows Server 2025**, not 2019. The PDF's instructions are still valid
PowerShell/WMI, but the environment reference is two releases behind.

Recorded as limitation **A11**. Not corrected in the PDF — it is the user's own
master document and editing it is their call. Offered, not assumed.

### Not done

A claim-by-claim audit of all 1402 pages. Sampling found the structure sound
and the technical content accurate where checked, but **sampling is not
auditing**. Recorded as the next High-priority research item.

---

## 4. Structural observations (not bugs)

| Observation | Note |
|---|---|
| **Every navigation renders twice** | `router.resolve()` awaits the handler *and* calls `onNavigate`, which is `render()` again. Doubles work on every hash change and every search keystroke |
| `cache: "no-cache"` has no effect | `app.js` fetches data with `no-cache`, but the service worker serves data **cache-first**. The HTTP cache is bypassed; the SW cache still wins. Only a new `VERSION` updates content |
| Search results are never highlighted | `search.highlight()` is exported and never called |
| Dead exports | `router.navigate`, `search.reindex`, `ui.icon`, `ui.copyText`, and three unused imports in `views.js` |
| **No catch-all route** | An unmatched hash like `#/foo/bar/baz` leaves stale content on screen instead of showing a 404 |
| Style custom properties via `h()` | `style: { "--dot": … }` goes through `Object.assign`, which cannot set CSS custom properties — it becomes a JS expando. The dot colours silently fall back |

None of these were changed. They are recorded so the redesign does not
accidentally depend on them.

---

## 5. Verification approach

Per the "test before applying across the application" instruction:

1. Audit first — no code changed until the inventory above was complete
2. Fix only bugs that were **reproduced in a browser**, not merely read
3. Redesign **one** lesson, verify it fully (Read mode, Recall mode, real
   clicks, reveal/hide)
4. Only then sweep **all 32 lessons** — 0 broken, 656 recall boxes, 0 errors
5. Full regression across **all 19 routes** — 19/19 pass, 0 console errors

Every claim above about runtime behaviour was measured, not assumed.