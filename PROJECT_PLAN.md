# Project Plan

## 1. Objective

A free, offline-first, private **Personal IT Field Manual**: a working reference
system and learning environment for the six subjects — CompTIA A+, Cisco/CCNA,
MikroTik/MTCNA, Windows 11, Windows Server and RHEL 10 — plus end-to-end
infrastructure projects.

Success means: find a command in seconds, understand what it does and why,
execute it in a lab, verify the result, diagnose failure, and recover safely —
with no paid service, no account, and no network.

## 2. Architecture (as built)

```
Static PWA, zero runtime dependencies, no build step
┌──────────────────────────────────────────────────────┐
│ app/                                                 │
│   index.html · manifest.webmanifest · sw.js          │
│   assets/  app.js router.js views.js search.js        │
│            ui.js db.js app.css icons                 │
│   data/    commands|lessons|scenarios|quizzes|projects│
│            /index.json   ← public reference content   │
└──────────────────────────────────────────────────────┘
        │                      │                  │
   personal data only     local-first          research only
   (never committed)      never uploaded       (never shipped)

scripts/  serve.mjs · validate.mjs · make-icons.mjs
tools/    pdfextract/          ← dev-only, gitignored
private/  extracted text      ← gitignored, outside the repo
```

**Deliberate constraints:** no backend, no account, no analytics, no tracking, no
CDN, no web fonts, no telemetry, no framework. All enforced by
`scripts/validate.mjs`.

## 3. Status

| Phase | State | Notes |
|---|---|---|
| 1 Discovery | ✅ | Full library mapped; 3 mislabelled/duplicate files found; critical repo hazard fixed |
| 2 Research | ✅ core | Version baselines established from vendor sources (see `VERSION_POLICY.md`) |
| 3 Design | ✅ | Architecture, data model, UX, verification model settled |
| 4 Prototype | ✅ | **Vertical slice built and tested in a real browser** |
| 5 Expand | 🟡 | 22 commands / 3 lessons / 3 scenarios / 3 quizzes / 1 project |
| 6 Validate | 🟡 | 35 automated browser checks pass; 4 manual checks outstanding |
| 7 Improve | 🔄 | Ongoing |
| 8 Release | ⬜ | Blocked on manual checks M1–M4 |

### The vertical slice proved itself

Built small and **actually exercised**, which found ten real bugs — including two
that would have silently destroyed offline support. See
`KNOWN_LIMITATIONS.md §E`. None were visible from reading the source.

## 4. Milestones

### M1 — Prototype ✅ complete
Working PWA with command reference, lesson, scenario, quiz, project, local
persistence, offline search. Verified in-browser.

### M2 — Content foundation 🟡 in progress
Import the 20 RHEL service profiles; build Cisco and A+ lessons; expand quizzes.
*Closes the two largest gaps.*

### M3 — Execution verification ⬜ next
Boot the three RHEL 10 VMs. Create a Windows Server VM and a MikroTik CHR VM.
Promote entries from `source-checked` to `execution-tested` with real recorded
output. Install Packet Tracer / CML Free for Cisco.
*Closes B1–B4. Highest accuracy-per-hour work available.*

### M4 — Projects and assessment ⬜
Second and third infrastructure projects; cumulative review; richer assessments.

### M5 — Release ⬜
GitHub Pages deployment, privacy audit of the public artifact, install and usage
documentation.

## 5. Completion criteria

Technical:
- [x] Static PWA, installable, works offline
- [x] Offline search across the full corpus
- [x] Local persistence with validated export/import
- [x] Zero runtime dependencies, no build step
- [x] Accessibility 100/100 in both themes
- [x] Automated validation gate
- [ ] Every subject has ≥5 lessons, ≥10 commands, ≥3 scenarios, ≥2 quizzes
- [ ] ≥3 infrastructure projects
- [ ] No dangling cross-references *(enforced)*

Accuracy and honesty:
- [ ] ≥60% of commands execution-tested
- [ ] ≥25% independently reviewed
- [ ] Zero entries claiming untested results *(enforced)*

Privacy:
- [x] `.gitignore` protects the profile-root repo
- [x] No private material in `app/` *(enforced by build)*
- [x] Personal data never committed *(enforced)*
- [x] No external requests at runtime *(enforced)*

## 6. Operating rhythm

Per build session:
1. Pick one subject from `CONTENT_MAP.md §4`.
2. Research current vendor docs **before** writing. Record the date.
3. Write content in the existing JSON shape.
4. Run `node scripts/validate.mjs`.
5. Test in the browser — including the offline check.
6. Update the affected register honestly.
7. Commit.

**The rule that matters:** if something was not tested, say it was not tested.
The registers are the product, not an afterthought.

## 7. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Scope exceeds sustainable effort | High | Deliberate increments; honest zero-counts over padding |
| Content drifts out of date | Medium | Version policy + re-verification schedule; dates on every entry |
| Private material leaks into git | Low (was **Critical**) | Two independent guards; now enforced mechanically |
| A bug like the cache-poisoning one recurs | Low | The offline test kills the server for real |
| Verification claims drift from reality | Medium | Validator fails the build on an unsubstantiated `execution-tested` |
| The manual is abandoned as too big | Medium | Quick-reference mode must work on its own; learning mode is the long game |

## 8. Resuming after a break

1. Read `DISCOVERY_REPORT.md` — what exists and where.
2. Read `CONTENT_MAP.md §4` — the build order.
3. Read `KNOWN_LIMITATIONS.md §A` and `§B` — the gaps.
4. `node scripts/validate.mjs` — confirm the tree is sound.
5. Pick the next item and go.

No context needs to be carried in your head. That is the entire point of these
files.