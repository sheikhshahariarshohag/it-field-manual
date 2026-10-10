# Test Plan

How this project is proven to work. Three layers: static gates, automated
browser tests, and manual checks automation cannot do.

**Last run: 2026-10-10 — all automated layers passing.**

---

## 1. Layer 1 — static validation (runs on every commit)

```bash
node scripts/validate.mjs
```

| # | Check | Fails the build? |
|---|---|---|
| 1.1 | Every data file is valid JSON | ✅ |
| 1.2 | Every item has the required fields for its kind | ✅ |
| 1.3 | Ids unique within each kind | ✅ |
| 1.4 | Every `related`, `prerequisites` and `quiz` cross-reference resolves | ✅ |
| 1.5 | Every quiz answer index is in range | ✅ |
| 1.6 | Every `risk` value is `safe` / `caution` / `risk` | ✅ |
| 1.7 | Every verification level is a known level | ✅ |
| 1.8 | **Every command has ≥1 source** | ✅ |
| 1.9 | **`execution-tested` requires a `tested_on` record** | ✅ |
| 1.10 | Every command says whether it changes the system | warning |
| 1.11 | State-changing commands carry an undo note | warning |
| 1.12 | State-changing commands carry a privilege note | warning |
| 1.13 | Every scenario has `steps.inspect` | ✅ |
| 1.14 | Scenario with a solution has a `rootcause` | warning |
| 1.15 | Every quiz question has an explanation | warning |
| 1.16 | Every `sw.js` precache entry exists on disk | ✅ |
| 1.17 | Every `data/` file is precached (else offline search breaks) | ✅ |
| 1.18 | No hardcoded credentials, private keys or API tokens | ✅ |
| 1.19 | No absolute user paths from other machines | ✅ |
| 1.20 | **No `innerHTML` or `document.write` anywhere in `app/`** | ✅ |
| 1.21 | No third-party CDN or web font references | ✅ |
| 1.22 | No book filenames or private-material references | ✅ |
| 1.23 | `.gitignore` exists and covers `private/`, `*.pdf`, `.env`, `node_modules` | ✅ |

**Current result: PASS — 0 errors, 0 warnings.**

> This gate caught a real dangling cross-reference
> (`lessons/linux-vlan-troubleshooting` → `mikrotik-vlan-bridge`, which did not
> exist). It was fixed by pointing at a real entry, not by inventing one.

---

## 2. Layer 2 — automated browser tests

Run against the real app in Chromium at `http://localhost:8099`.

```bash
node scripts/serve.mjs 8099      # terminal 1
# then drive the browser
```

Full results in `VERIFICATION_REGISTER.md §2`. Summary:

| Area | Checks | Result |
|---|---|---|
| Boot + corpus load | 1 | ✅ |
| Search: command / task / symptom / alias / prefix / empty | 6 | ✅ |
| Command detail, code blocks, copy | 3 | ✅ |
| Scenario staged reveal | 1 | ✅ |
| Quiz scoring + feedback | 1 | ✅ |
| Persistence: notes, bookmarks, progress | 3 | ✅ |
| **Offline** (server process killed, page reloaded) | 3 | ✅ |
| Export / import, including 6 invalid-input cases | 8 | ✅ |
| Theme, keyboard, a11y attributes | 5 | ✅ |
| Lighthouse: accessibility / best-practices / SEO, **both themes** | 6 | ✅ 100/100/100 |

### The offline test, precisely

The strongest check in the suite:

1. Load the app with the server up; confirm the SW controls the page and both
   caches are complete (12 shell + 5 data entries).
2. **Kill the server process.** Do not merely toggle a flag.
3. Reload the page.
4. Assert: the app boots, all 22 commands and 3 scenarios are listed, search
   returns results, a command page renders its code blocks, and copy works.

This test is what found the 502 cache-poisoning bug that a simulated
"offline" flag would have missed.

---

## 3. Layer 3 — manual checks automation cannot prove

Do these yourself before trusting the release.

| # | Check | How | Status |
|---|---|---|---|
| M1 | **Visual quality on a real phone** | Open on Android via the deployed URL, install the PWA | ⬜ **Not done — no screenshot capability in this environment** |
| M2 | The 900 px drawer breakpoint | Resize to <900 px, confirm the hamburger appears and the drawer opens, closes on tap, and traps Escape | ⬜ Not done — no viewport-emulation tool |
| M3 | The 560 px layout | Resize narrow; confirm code blocks scroll, filters wrap, the sheet modal fits | ⬜ Not done |
| M4 | Installability on Android | Chrome menu → "Install app" must appear (needs a 192 **and** 512 PNG) | ⬜ Not done |
| M5 | Full keyboard-only journey | Tab through, open a command, copy with the keyboard, take a quiz, use the modal | ✅ Partially verified (skip link, aria, focus) |
| M6 | Screen reader announces correctly | NVDA / TalkBack on a command page and a quiz | ⬜ Not done |
| M7 | Real RHEL 10 command execution | Boot the VMs, work `VERIFICATION_REGISTER.md §4` | ⬜ Not done |
| M8 | Windows Server 2025 cmdlet check | `Get-Command -Syntax` on a real Server 2025 VM | ⬜ Not done |
| M9 | GitHub Pages deployment | Push, enable Pages, confirm only intended files are public | ⬜ Not done |

> **M1 and M2 are the highest-value outstanding checks.** The CSS is written and
> parses, and Lighthouse runs a mobile emulation pass, but nothing has actually
> looked at this on a narrow screen.

---

## 4. Contrast measurements

WCAG AA needs 4.5:1 for body text. Measured, not assumed:

| Theme | Background | Text | Ratio |
|---|---|---|---|
| Dark | `#0f1115` | `#e8ebf0` | **15.81:1** |
| Light | `#f7f8fa` | `#171a1f` | **16.41:1** |

### Subject colours

Light set — verified against `#f2f4f7` (the badge background):

| Subject | Colour | Ratio |
|---|---|---|
| CompTIA A+ | `#7a6132` | 5.34:1 |
| Cisco / CCNA | `#0a6a91` | 5.98:1 |
| MikroTik | `#a3241c` | 7.72:1 |
| Windows 11 | `#0a5c9e` | 6.82:1 |
| Windows Server | `#0f7b4f` | 4.73:1 |
| Cross-domain | `#6331c4` | 8.20:1 |

Dark set — verified against `#1e222b`:

| Subject | Colour | Ratio |
|---|---|---|
| CompTIA A+ | `#b8945a` | 5.74:1 |
| Cisco / CCNA | `#39b6e6` | 7.60:1 |
| MikroTik | `#ff8a7d` | 7.10:1 |
| Windows 11 | `#6ea3ff` | 6.46:1 |
| Windows Server | `#55d6a0` | 8.90:1 |
| Cross-domain | `#b98cff` | 6.39:1 |

`--text-faint` was also corrected in both themes (`#868f9d` → `#5f6874` light,
`#6f7887` → `#8a94a3` dark). Lighthouse went **96 → 100** on that change alone.

---

## 5. Release gate

A release is acceptable only when:

- [ ] `node scripts/validate.mjs` passes with 0 errors
- [ ] `node --check` passes on every `.js`/`.mjs` file
- [ ] The offline test (§2) passes with the server actually killed
- [ ] Lighthouse accessibility is 100 in **both** themes
- [ ] Manual checks M1–M4 done
- [ ] `git status` reviewed; no book, note, `.pdf` or credential in the diff
- [ ] The deployed artifact contains only `app/`
- [ ] `VERSION_POLICY.md` re-checked against vendor sites
- [ ] No entry claims a test that did not happen