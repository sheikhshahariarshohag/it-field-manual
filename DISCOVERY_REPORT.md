# Discovery Report — Personal IT Field Manual

**Date:** 2026-10-10
**Workspace scanned:** `C:\Users\NT_70` (the Windows user profile, recursively)
**Status:** Phase 1 (Discovery) complete. Phase 2 (Research) partially complete.
**Nothing in the source library was modified, moved, renamed or deleted.**

---

## 1. The headline finding, and it is a safety one

**`C:\Users\NT_70` — your entire Windows user profile — is a git repository with
zero commits and no `.gitignore`.**

```
$ git -C C:\Users\NT_70 rev-parse --show-toplevel
C:/Users/NT_70
$ git -C C:\Users\NT_70 log --oneline
(no commits)
```

Every file in the profile was untracked and therefore a single `git add -A`
would have staged:

| Would have been staged | Why it matters |
|---|---|
| `NTUSER.DAT` + transaction logs | Windows credential store. Not reversible by deleting the repo. |
| `.ssh/` | Private keys. |
| `Desktop/New folder/IT Infrastucture/` | ~300 MB of copyrighted books. |
| `AppData/`, `.config/`, browser profiles | Session tokens, cookies. |

**Action taken:** wrote `C:\Users\NT_70\.gitignore` (additive, deletable, it
changes no existing file). Result, measured immediately after:

```
before:  20+ untracked entries incl. NTUSER.DAT and the whole book library
after:    3 untracked entries  (.gitignore, one .doc, it-field-manual/)
```

**The real project does not live at the profile root.** It is a separate
repository at `C:\Users\NT_70\it-field-manual\`. Keep it that way.

---

## 2. The book library

Location: **`C:\Users\NT_70\Desktop\New folder\IT Infrastucture\`**

23 PDFs. All text-searchable — **zero scanned documents**, so no OCR was needed
and nothing is unreadable. Roughly 11,000 pages, ~12.6 million extractable
characters. Duplicates and mislabelings are listed in `SOURCE_INVENTORY.md`.

Coverage against your six subjects:

| Subject | Library coverage | Assessment |
|---|---|---|
| CompTIA A+ | **None** | Thin. Needs building from current free sources. |
| Cisco / CCNA | **None** | No Cisco book at all. Largest genuine gap. |
| MikroTik | Strong | MTCNA study guide, 351 pp. |
| Windows 11 | Strong | *Windows 11 Inside Out*, 817 pp. |
| Windows Server | Moderate | Two 2019-era books (516 + 1034 pp). Not current for Server 2025. |
| RHEL | **Very strong** | 7 books, incl. RH124/RH134/RH294 workbooks + 4 reference guides. |

### Two things you already have that change the plan

**(a) A 146-session curriculum.** `Enterprise_Infrastructure_Knowledge_Map_Unified.pdf`
is 1,402 pages — an ISDB-BISEW scholarship curriculum in 10 layers:
Physical Hardware → Operating Systems → Networking → Identity → Enterprise
Services → Security → Automation & CI/CD → Containers & Observability → Cloud →
Architecture & Governance.

**Implication:** the Field Manual must **not** duplicate it. It should be the
operational companion — the place you look up a command at 2am, and the place
that verifies what the curriculum asserts. Layer 1, 3, 4 and 5 map almost
exactly onto your six subjects.

**(b) 20 RHEL service profiles you already wrote today**, in a consistent
25-section format, with 🟢🟡🟠🔴 safety classification:
`00-master-index.md` … `21-final-cross-service-sections.md`.

**Implication:** the format is validated by you already. The Field Manual adopts
it, and these become the RHEL seed content rather than being rewritten.

---

## 3. Your existing project (found, inspected, not modified)

`Desktop\New folder\NSpersonal v0.1` — **Life OS**, a local-first single-user PWA.
Not the Field Manual, and not mine to change. It was opened because its
`AGENTS.md` loads automatically and its architecture is directly relevant.

What it proves is useful to you:

- Zero npm dependencies, no build step, plain ES modules — a PWA you can still
  open in five years.
- IndexedDB + service worker + JSON-Lines export, and **verified** export/import
  round-trip.
- `textContent` everywhere, never `innerHTML`.
- A 122-check behavioural test suite against a fake DOM, because *"the absence of
  tests is not a neutral choice"*.
- A written rule that vault records are never indexed, searched or counted.

Life OS was treated as a **reference**, and specifically **not** copied: the
Field Manual has different needs (a large read-only corpus, no server, no sync).

---

## 4. Lab environment you already own

| Asset | Location | Use |
|---|---|---|
| RHEL 10 VM "R H E L 10" | `Documents\Virtual Machines\R H E L 10\` | Baseline RHEL 10 |
| RHEL 10 VM "RHEL 10 C1" | `Documents\Virtual Machines\RHEL 10 C1\` | Second host / services |
| RHEL 10 VM "RHEL 10 S" | `Documents\Virtual Machines\RHEL 10 S\` | Client / SSSD / AD-join test |
| Omarchy Linux VM | `Documents\Virtual Machines\Omachy\` | Shell scripting practice |
| VMware Workstation 25H2 | Installed | Hypervisor |
| Omarchy 4.0.2 ISO | `Downloads\` (5.9 GB) | Host OS option |
| Ventoy 1.1.17 | `Downloads\` | Bootable lab USB |

**This is the most valuable thing in the discovery.** Execution testing is
possible for every RHEL claim, without buying hardware or a subscription. None of
the three RHEL VMs were running at discovery time.

**Missing:** no Windows Server VM, no Cisco IOS, no MikroTik CHR yet. See
`PROJECT_PLAN.md`.

---

## 5. Tooling discovered

| Tool | Status | Consequence |
|---|---|---|
| Node **v24.21.0** | available | Everything (app, extractor, validation) is Node + browser only |
| npm 11.19.0, network access | available | Dev-only dependency install works |
| Python | **absent** (Store stub only) | No PDF tooling available out of the box |
| pdftotext / qpdf / pandoc / 7z / ImageMagick / tesseract | **all absent** | Had to build an extractor |

**Solution:** `tools/pdfextract/` — a dependency-free Node extractor built on
`pdfjs-dist` (dev-only, gitignored). It extracts per-page text for research and
probes page/char counts to detect scanned documents. It never ships and never
touches the public repo.

---

## 6. Risks found

| # | Risk | Severity | Status |
|---|---|---|---|
| R1 | Profile-root git repo could publish books, SSH keys and `NTUSER.DAT` | **Critical** | **Mitigated** — `.gitignore` written and verified |
| R2 | No Cisco/CCNA book | High | Plan: build from Cisco's own free material |
| R3 | Windows Server books are 2019-era | Medium | Plan: version-policy notes + current MS docs |
| R4 | RHEL books are v8, target is v10 | Medium | Plan: v8 for concepts, current docs for procedure |
| R5 | CompTIA A+ has no source at all | Medium | Plan: current CompTIA objectives + free references |
| R6 | `Enterprise_Infrastructure_Knowledge_Map_Unified.pdf` generated by LibreOffice, untested for accuracy | Medium | Treat as study aid, never as authority |

---

## 7. What was built in this session

A working vertical slice — deliberately small and **actually tested**, not a mock:

- Static PWA, no build step, no framework, no runtime dependency
- 22 commands, 3 lessons, 3 scenarios, 3 quizzes, 1 infrastructure project
- Offline search that works with the server switched off
- IndexedDB for notes/bookmarks/progress, with validated JSON export/import
- Verified: **100 accessibility, 100 best practices, 100 SEO** (Lighthouse, both themes)

Six real bugs were found by testing rather than by reading, and are documented in
`DECISION_LOG.md` — including one that silently corrupted the offline cache.

---

## 8. Recommended next actions

1. **Confirm R1 is understood** — never run `git add` at `C:\Users\NT_70`.
2. Start the three RHEL 10 VMs and promote RHEL entries from *source-checked* to
   *execution-tested*. This is the single biggest accuracy win available.
3. Build the Cisco/CCNA subject from free Cisco material — the largest gap.
4. Create a Windows Server VM and a MikroTik CHR VM to close the remaining
   execution-test gaps.