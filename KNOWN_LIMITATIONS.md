# Known Limitations

Stated plainly so nothing here is a surprise later. Ordered by how much they
matter.

---

## A. Content gaps

| # | Limitation | Impact | Fix |
|---|---|---|---|
| A1 | **No Cisco/CCNA source material exists in your library at all** | Cisco content is built from vendor docs, with no local fallback | Install free Packet Tracer / CML Free; add a Cisco reference |
| A2 | ~~No CompTIA A+ source material~~ — objectives now **verified** from CompTIA's published objectives (2026-10-10) | Lesson *content* is still unbuilt; the syllabus it must answer to is now known | Build from the verified objectives |
| A3 | ~~3 commands, 3 lessons~~ → now **22 commands, 22 lessons** | RHEL depth closed by importing the 19 service profiles; the other five subjects are still thin | Keep expanding per `CONTENT_MAP.md` |
| A4 | 4 of 6 subjects still have few or no lessons | A+, Cisco, MikroTik, Windows 11, Windows Server | Next build sessions |
| A5 | One infrastructure project only | The prompt asks for several | Schedule after the first is completed end-to-end |
| A6 | Quizzes are 5–6 questions each | Thin assessment | Expand as subjects are built |
| **A7** | **The Azure half of AZ-800 is entirely uncovered** | AZ-800 is a hybrid exam: domains 2, 3, 7, 8, 9 are largely Azure Arc, Azure IaaS, availability sets, Site Recovery and migration. This manual is on-premises only and maps to domains 1, 4, 5, 6, 10 | Only close this by building Azure content, which is outside this project's scope |
| **A8** | **MTCRE has verified objectives but zero content** | 8 MTCRE objectives, 1 covered. Static routing in depth, point-to-point addressing, tunnels and OSPF are absent | Next MikroTik build session |
| **A9** | **96 of the 146 Knowledge Map sessions have no manual content** | 34% coverage. Layers 7 (Automation), 9 (Cloud) and 10 (Architecture) are **0%** — nothing links back from them. Layers 1–5 are well covered because the manual's content already lives there | Sessions needing content are listed in the app itself; each shows "not in manual" rather than a blank |
| **A10** | **Knowledge Map session summaries are hand-written, not from the PDF** | The numbers, titles, layers and page ranges are extracted mechanically and are exact. The one-line summaries are mine and were written from the session titles plus the subject matter, **not** by reading all 1402 pages | Summaries are marked as such in the app and in `knowledge-map.json` |
| **A11** | **The Knowledge Map assumes a Windows Server 2019 lab** | ~24 of its lab steps say "On your Windows Server 2019 VM…", because the source library is *Windows Server 2019 & PowerShell*. This manual targets **Windows Server 2025** for AZ-800. WS2019 left mainstream support 2024-01-10 (extended to 2029-01-10), so the PowerShell still works but the environment reference is two releases behind | Lab on WS2025 for AZ-800. The PDF was **not** edited — it is the user's own document |

### On A10 — what "verified" means for the Knowledge Map

The user asked for the Knowledge Map to be checked and errors corrected. Here is
exactly what was and was not done:

| Claim | Status |
|---|---|
| 146 sessions, 10 layers, contiguous numbering, no duplicates | **Verified** mechanically against the table of contents |
| Page range of every session | **Verified** — derived from consecutive TOC page numbers |
| Layer boundaries (which sessions sit in which layer) | **Verified** against the TOC's own layer headings |
| Extraction completeness | **Verified** — all 1402 page markers present, no truncation |
| One-line summaries of each session | **Mine**, written from titles and subject matter, not extracted |
| Technical accuracy of the summaries | **Not yet line-by-line audited** — see the next item |
| The PDF itself | **Not republished.** Stays in the private library; only a derived outline is committed |

A full claim-by-claim audit of 1402 pages is a separate piece of work and is
recorded as outstanding in `RESEARCH_REGISTER.md` §7. It has **not** been done,
and nothing here should be read as saying it has.

## B. Verification gaps — the important ones

| # | Limitation | Impact |
|---|---|---|
| B1 | **No technical entry is execution-tested** | Every command is source-checked only. Correct syntax is not proof it works on your system. |
| B2 | **No entry has had an independent review** | A systematic error would survive. Re-reading my own text is not independent review. |
| B3 | **No Microsoft Windows Server VM** | Windows Server procedures cannot be executed |
| B4 | **No Cisco IOS, no MikroTik CHR** | Cisco and MikroTik procedures cannot be executed |
| B5 | Scenario command output is **invented for teaching**, clearly labelled | Usable for pattern-matching, never as evidence about a real system |
| B6 | `dnf4` vs `dnf5` unconfirmed on an actual RHEL 10.2 host | One command's version assumption is untested |
| **B7** | **Exam objectives are verified; the *lessons* are not** | All 6 syllabi were read from the publishers' own pages and mapped. But mapping a lesson to an objective does not make the lesson correct — B1 and B2 still apply to every mapped entry. Objective coverage is a syllabus claim, not a correctness claim. |

## C. Library problems found

| # | Problem | Evidence |
|---|---|---|
| C1 | **Duplicate RHEL 8 RH124 workbook** | `M-9 …` and `Red Hat Enterprise Linux 8.0 RH124 …` — both 658 pages, 837,566 chars |
| C2 | **`M-11 … RH254` is misnamed** | Actual title: *Red Hat Enterprise Linux 8 System Design Guide* |
| C3 | **`Red_Hat_Certificate_System-10` is misnamed** | It is about **PKI/certificates**, not RHEL 10 |
| C4 | **`02-networkmanager.md` is missing** | Listed in `00-master-index.md`, absent from the folder |
| C5 | RHEL books are **v8**; the target is **v10** | Concepts transfer; procedure does not |
| C6 | Windows Server books are **2019**; current is **2025** | Two releases behind |
| C7 | CEH PDF has **no author or publisher metadata** | Low confidence; used only as a topic checklist |

## D. Application limitations

| # | Limitation | Note |
|---|---|---|
| D1 | **Screenshot capture unavailable** in this environment | Visual QA was done via computed styles, contrast ratios, layout measurements and Lighthouse — not by eye. **You should eyeball it once on your phone.** |
| D2 | **No viewport-emulation tool** | The 900 px and 560 px breakpoints are implemented and the CSS parses, but they were not exercised on a real narrow viewport |
| D3 | **IndexedDB unavailable → in-memory fallback** | App still works; personal data is lost on reload. A visible warning is shown rather than failing silently. |
| D4 | **Private-mode browsers** | Same as D3 |
| D5 | Search requires **2+ characters** | Deliberate; avoids a full scan on every keystroke |
| D6 | **No full-text body search** for long lessons | Indexes titles, tasks, tags and command text. Adequate for lookup; would need extension for prose search |
| D7 | Notes are **per-entry**, not free-form pages | Simple and exportable; a full notes system would be better later |
| D8 | `navigator.onLine` cannot prove reachability | Hence the three-part honest status panel (D-012) |

## E. Bugs found by testing — and fixed

All found by exercising the app, none visible in source review.

| Bug | Symptom | Root cause | Fix |
|---|---|---|---|
| **⚠ Nothing clickable** | **Every click on the page did nothing.** Reported by the user. | `.sheet-host { display: grid }` is an author rule, which **outranks the browser's `[hidden] { display: none }`**. The modal host kept `hidden` in the HTML but stayed laid out as a full-screen `z-index: 80` overlay, silently eating every click. | Global `[hidden] { display: none !important; }`, plus a **build gate** that fails if that rule is missing or if a `hidden` element's class sets `display` |
| **Offline cache poisoning** | Blank page with the server dead | Origin returns **502**, a valid response; the handler cached it over the good shell | Treat any non-OK navigation as failure; never cache non-200; added `repairCaches()` that re-fetches missing *or* empty entries |
| **Cache never rebuilt** | Caches empty, SW "active", offline broken | Caches deleted while the worker stayed byte-identical → `install` never re-ran | `repairCaches()` on every `activate` |
| **Stale service worker in dev** | Code edits appeared to do nothing | Dev server sent `no-cache` for `sw.js`; the browser reused a byte-identical registration | `no-store` + `Service-Worker-Allowed: /` for `sw.js` |
| **Update never shown** | New SW silently waited forever | `updatefound` fires on the **registration**, not `navigator.serviceWorker` | Listen on the registration, and check `reg.waiting` at boot |
| **All private data silently lost** | Bookmarks/notes saved but never came back | `tx()` resolved from `oncomplete`, returning `undefined` for every read | Rewrote to resolve from the request's success event |
| **Stale search results** | Typing returned nothing | `history.replaceState` doesn't fire `hashchange`; router never re-ran | Call `resolve()` explicitly |
| **Detail pages blank** | `/commands/:id` rendered nothing | `route("commands")` matched one segment only; async views returned Promises | Added `:id` patterns; `render()` now awaits |
| **Content vanished** | Headings with no body | `appendChild(a, b)` silently ignores `b` | Added `add()` helper; fixed 9 call sites |
| **Bookmark aria wrong** | `aria-pressed="rhel-ss-lntup"` | `toggleBookmark` returned the storage key, not a boolean | Now returns a boolean |
| **Focus stolen** | Could not type in search | `render()` called `main.focus()` on every keystroke | Skipped while the search box has focus |
| **Contrast 96/100** | Lighthouse failed | Shared tech colours and too-dark `--text-faint` | Per-theme variables → **100/100 both themes** |

### Why the click bug survived my earlier testing

Every earlier interaction test used `element.click()` from JavaScript. That
**dispatches the event directly and bypasses hit-testing entirely** — so it
passed while the page was genuinely unusable.

From now on, interaction testing has two layers:

1. **Programmatic** (fast, covers logic) — as before.
2. **Real click + hit-test sweep** (covers what a user experiences) — for each
   interactive control, assert that `document.elementFromPoint()` at the
   control's own centre returns that control or a descendant, and sweep the
   viewport for invisible full-screen blockers.

Layer 2 found the bug in one pass. It should have been there from the start.

## F. Environment notes

- `C:\Users\<your-name>` is a git repository with zero commits. **Never `git add` there.**
  A protective `.gitignore` is in place but is not a substitute for care.
- No Python, and the `python`/`python3` commands are Microsoft Store stubs that
  fail with exit code 9009. Anything scripted for this machine must use Node.
- The three RHEL 10 VMs exist but were **not running** during discovery.
  `vmrun` is not on PATH, so scripted VM control is not yet available.