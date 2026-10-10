# Personal IT Field Manual

A free, offline-first, private field manual and learning environment for:
**CompTIA A+ · Cisco/CCNA · MikroTik/MTCNA · Windows 11 · Windows Server · RHEL 10**

Static PWA. No backend, no account, no tracking, no runtime dependency, no
network required after first load.

---

## Quick start

```bash
git clone <your-repo-url> it-field-manual
cd it-field-manual
node scripts/serve.mjs 8080        # http://localhost:8080
```

Open it, and it works. Install it from the browser menu (Chrome/Edge: install
icon; Android: "Install app") and it behaves like a normal app, offline.

**For GitHub Pages:** set the Pages source to the **`/app`** folder. There is no
build step and no output directory.

---

## What it does

| Mode | For |
|---|---|
| **Quick reference** | Finding a command during a lab or at work. Search by command, task, error text, symptom or alias. Every entry says where to run it, what it changes, how to verify it, what breaks, and how to undo it. |
| **Learning** | Structured lessons: what the concept is, why it exists, an analogy, prerequisites, step-by-step, a lab with expected results, failure modes, a knowledge check, and links onward. |
| **Practice** | Troubleshooting scenarios that present the fault first. Hints, the investigation path, the fix, verification, root cause, alternatives and prevention are each behind their own control. |
| **Assessment** | Quizzes that score you and record which questions you got wrong, then point you back at exactly those. |
| **Projects** | End-to-end builds — currently the small-office infrastructure project. |

---

## The honesty feature

Every entry carries one of four badges, and they are **not** interchangeable:

| Badge | Means |
|---|---|
| **Source-checked** | Compared against a named, current vendor document. Not run. |
| **Independently reviewed** | A second independent source agreed. Still not run. |
| **Execution-tested** | Actually run, with the environment, version and date recorded. |
| **Release-approved** | Passed this project's own release gates. |

`scripts/validate.mjs` **fails the build** if an entry claims `execution-tested`
without a `tested_on` record. That is deliberate: it makes the claim expensive
enough that nobody will make it casually.

Right now the technical content is **source-checked**. The application's own
behaviour is execution-tested. Both facts are on the **Verification status**
page in the app, and in `VERIFICATION_REGISTER.md`.

---

## Privacy

- **No account. No backend. No analytics. No third-party requests.** Enforced by
  the build: `validate.mjs` fails if any CDN, web font or external URL appears.
- **Your notes, bookmarks, progress and quiz results stay on your device** in
  IndexedDB. They are never uploaded and never committed.
- **Export/import is plain JSON.** Validated on import; a malformed or foreign
  file is rejected with an explanation, never half-applied.
- **The private book library is not in this repository.** Extracted text lives in
  the gitignored `private/` directory. The build greps `app/` for book filenames
  and personal-material references and fails if any appear.

> ⚠ **Never run `git add` at `C:\Users\<your-name>`.** Your Windows profile is a git
> repository with zero commits. A protective `.gitignore` is in place, but this
> project is the repository that matters and it lives one level down.

---

## Repository layout

```
app/                      the deployable static site (Pages source)
  index.html  sw.js  manifest.webmanifest
  assets/                 app · router · views · search · ui · db · css · icons
  data/                   public reference content, one index.json per kind
scripts/
  serve.mjs               local dev server (no dependency)
  validate.mjs            content + privacy gate — run before every commit
  make-icons.mjs          generates the PWA icons, no image library needed
tools/pdfextract/         research-only PDF text extraction (dev-only)
private/                  extracted book text — GITIGNORED, never shipped
```

## Documentation

| File | What it answers |
|---|---|
| [`DISCOVERY_REPORT.md`](DISCOVERY_REPORT.md) | What was found in the workspace, and the git hazard that was fixed |
| [`PROJECT_PLAN.md`](PROJECT_PLAN.md) | Objectives, architecture, milestones, completion criteria |
| [`SOURCE_INVENTORY.md`](SOURCE_INVENTORY.md) | Every book: subject, edition, quality, and how it will be used |
| [`RESEARCH_REGISTER.md`](RESEARCH_REGISTER.md) | Free and official resources, with check dates |
| [`VERSION_POLICY.md`](VERSION_POLICY.md) | Which versions are current, and what actually changed |
| [`VERIFICATION_REGISTER.md`](VERIFICATION_REGISTER.md) | What was really tested, and what was not |
| [`DECISION_LOG.md`](DECISION_LOG.md) | Autonomous decisions and why |
| [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md) | Gaps, bugs found, and environment notes |
| [`TEST_PLAN.md`](TEST_PLAN.md) | How correctness is proven, plus contrast measurements |
| [`CONTENT_MAP.md`](CONTENT_MAP.md) | Curriculum, gaps, and build order |

---

## Development

```bash
node scripts/serve.mjs 8080     # local server (ES modules + SW need http, not file://)
node scripts/validate.mjs       # content + privacy gate
node scripts/make-icons.mjs     # regenerate PWA icons
node scripts/import-service-profiles.mjs [--dry-run]   # convert the 25-section RHEL notes
```

**Adding a command:** append an object to `app/data/commands/index.json`. The
validator will tell you what is missing — most usefully, it will reject an
`execution-tested` claim without a `tested_on` record.

**Adding a whole new data file:** `validate.mjs` fails if a JSON file sits in
`app/data/<kind>/` that nothing loads, and if `app.js` loads a file that does not
exist. Content cannot silently go missing.

**Testing offline:** kill the server process and reload. Do not simulate it.
That exact test is what caught the 502 cache-poisoning bug.

**House style:** plain ES modules, no framework, no build step, no TypeScript.
Comments explain *why*. Never `innerHTML` — `h()` is the only DOM builder.
Prefer deleting something to adding something.

---

## Status

**Phase 4 complete** — a working vertical slice, tested in a real browser.
**Phase 5 in progress** — content expansion.

Current: **43 commands · 32 lessons · 3 scenarios · 3 quizzes · 1 project**

The 32 lessons include:
- **19 RHEL 10 service profiles** (systemd, firewalld, SELinux, sshd, journald,
  chronyd, auditd, cron, rsyslog, Apache, NFS, Samba, SSSD, BIND, DHCP, autofs,
  Podman, libvirt/KVM, PostgreSQL) converted from the author's own 25-section
  notes — **266 sections, 147 lab exercises, 115 documented mistakes**.
- **10 subject lessons**: longest-prefix match, subnetting, switch MAC learning,
  MikroTik bridge ports, RouterOS firewall chains, the POST boot sequence, POST
  code reading, Windows boot repair, AD forests and trusts, Group Policy
  troubleshooting.

Every one of the six subjects now has real content.

Lighthouse: **accessibility 100 · best practices 100 · SEO 100** (both themes).

The two biggest gaps are **Cisco/CCNA** (no source material exists in the
workspace at all) and **CompTIA A+** (none either). The biggest accuracy win
available is execution-testing the RHEL content on the three RHEL 10 VMs already
on this machine. See `CONTENT_MAP.md §4`.