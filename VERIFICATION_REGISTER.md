# Verification Register

What has actually been checked, by what method, and what has **not**. This is
the document that stops the manual from lying to you.

**Status of this register: 2026-10-10.**

---

## 1. The four levels — defined precisely

| Level | Definition | What it does **not** imply |
|---|---|---|
| **Source-checked** | Syntax and parameters compared against a named, current vendor or upstream document | Nobody ran it. A syntactically valid command can still fail on your system. |
| **Independently reviewed** | A second, independent source or a separate review agreed on the important details | That it was executed. Two documents can share one mistake. |
| **Execution-tested** | Actually run; expected output observed; **environment, version and date recorded** | That it works on your version or your hardware. |
| **Release-approved** | Passed this project's own validation gates for a release | That it can never break. |

**Rules this project enforces mechanically** (`scripts/validate.mjs`):

1. Every command entry must carry at least one source. A command reference
   without a source is an assertion, and the validator fails the build.
2. An entry claiming `execution-tested` must carry a `tested_on` record with
   date, environment and version. **The build fails otherwise.** This is the rule
   that makes the claim meaningful.
3. Every entry states whether it changes the system.
4. Any state-changing entry must carry an undo/recovery note.

---

## 2. Application verification — what was really tested

Performed in a real Chromium browser against the running app, not by reading code.

| # | Check | Method | Result |
|---|---|---|---|
| A1 | App boots and loads corpus | Browser, real load | ✅ 22 / 3 / 3 / 3 / 1 |
| A2 | Search by command name (`journalctl`) | Typed into search box | ✅ 1 correct hit |
| A3 | Search by task phrasing (`can not get an ip`) | Typed | ✅ DHCP entries ranked first |
| A4 | Search by symptom (`169.254`) | Typed | ✅ found the scenario |
| A5 | Search by alias (`ccna`) | Typed | ✅ 5 hits |
| A6 | Search by partial prefix (`enabl`) | Typed | ✅ `systemctl enable --now` first |
| A7 | Empty result state | Typed nonsense | ✅ proper empty state |
| A8 | Command detail page | Navigated | ✅ title, facts, 2+ code blocks, sources |
| A9 | Copy to clipboard | Clicked, read button state | ✅ "Copied" |
| A10 | Scenario staged reveal | Opened step 5 | ✅ 9 steps, only step 1 open by default |
| A11 | Quiz scoring + feedback | Answered 6, submitted | ✅ "2 of 6", options marked right/wrong |
| A12 | Notes persist across reload | Wrote, reloaded, read | ✅ |
| A13 | Bookmarks persist across reload | Toggled, reloaded | ✅ 1 bookmark |
| A14 | Progress and weak spots persist | Retook quiz, reloaded | ✅ 4 weak spots listed |
| A15 | **Offline: server killed, page reloaded** | `Stop-Process` on the server | ✅ **full app works** |
| A16 | Offline search | Searched while server dead | ✅ |
| A17 | Offline copy-to-clipboard | Clicked | ✅ "Copied" |
| A18 | Export produces valid JSON | Called `exportPersonal()` | ✅ 8 documented keys |
| A19 | Import rejects invalid JSON | `{` | ✅ "not valid JSON" |
| A20 | Import rejects wrong format | `format: something/else` | ✅ rejected with explanation |
| A21 | Import rejects future version | `version: 99` | ✅ rejected |
| A22 | Import rejects array at top level | `[]` | ✅ rejected |
| A23 | Import reports per-entry problems | Bad notes array | ✅ problem reported, valid data still imported |
| A24 | Theme toggle | Clicked both ways | ✅ light ↔ dark |
| A25 | Slash focuses search | Keypress | ✅ |
| A26 | No unlabelled buttons or images | DOM query | ✅ 0 and 0 |
| A27 | Dark theme contrast | Computed WCAG ratio | ✅ 15.8:1 |
| A28 | Light theme contrast | Computed WCAG ratio | ✅ 16.4:1 |
| A29 | Lighthouse accessibility, **dark** | Lighthouse | ✅ **100**, 0 failures |
| A30 | Lighthouse accessibility, **light** | Lighthouse | ✅ **100**, 0 failures |
| A31 | Lighthouse best practices + SEO | Lighthouse | ✅ **100 / 100** |
| A32 | No horizontal overflow | `scrollWidth` vs `innerWidth` | ✅ |
| A33 | Code blocks scroll internally | measured | ✅ no page blow-out |
| A34 | Service-worker update prompt | Edited a file, waited | ✅ bar appeared, reload worked |
| A35 | Static validation gate | `node scripts/validate.mjs` | ✅ passes, 0 errors 0 warnings |

---

## 3. Technical content verification — the honest state

| Area | Level | Notes |
|---|---|---|
| RHEL 10 — systemd, journalctl, ss, dnf, SELinux, firewalld, nmcli | **Source-checked** | Syntax compared against Red Hat's current docs. **Not yet executed.** |
| Windows — ipconfig, DISM/SFC, diskpart, chkdsk, bcdedit | **Source-checked** | Against Microsoft Learn |
| Windows Server — Install-WindowsFeature, Add-DhcpServerv4Scope | **Source-checked** | Cmdlet names and parameters verified |
| Cisco — show commands, VLAN creation, ping/traceroute | **Source-checked** | Against Cisco command references |
| MikroTik — /ip address, firewall filter, dhcp-server | **Source-checked** | Against help.mikrotik.com |
| CompTIA A+ — diskpart, chkdsk | **Source-checked** | |
| **Everything in the app** | **Execution-tested** | See §2 |

### Not yet execution-tested, and why

| Area | Reason | How to close it |
|---|---|---|
| RHEL 10 | The three RHEL VMs exist but were not running | Boot `R H E L 10`, run the commands, record output |
| Cisco | No IOS available; Packet Tracer/CML not yet installed | Install Packet Tracer (free) |
| MikroTik | No CHR installed | Install CHR, note the 1 Gbit/s P1 limit |
| Windows Server | No Server VM | Create one |

---

## 4. Execution-test record — template

When you promote an entry, append to this table. **Do not skip the fields.**

| Date | Entry | Platform & version | Environment | Command run | Observed result | Outcome |
|---|---|---|---|---|---|---|
| _pending_ | `rhel-systemctl-status` | RHEL ? | `R H E L 10` VM | `systemctl is-active sshd` | ? | ? |

Then set on the entry:
```json
"verification": "execution-tested",
"tested_on": { "date": "2026-10-XX", "platform": "RHEL 10.2", "environment": "VMware VM 'R H E L 10'" }
```

The validator will fail the build if the second half is missing.

---

## 5. Independent review status

For **security-sensitive and destructive** procedures, a second review is
required before promotion to `execution-tested`:

| Item | Second reviewer | Status |
|---|---|---|
| `aplus-disk-management` (`clean`, `convert`) | — | **Required before execution** |
| `aplus-chkdsk` (`/r`) | — | **Required before execution** |
| `win11-flags-bcdedit` | — | **Required before execution** |
| `mikrotik-ip-firewall-filter` | — | **Required before execution** |
| RHEL `firewalld` changes over SSH | — | **Required before execution** |

**Independent review has not been performed for any technical entry yet.** This
is a real limitation, not an oversight. Re-reading your own generated text is not
independent review and does not count.

---

## 6. Where the manual admits ignorance

Every one of these is stated in the content itself, not hidden here:

- `dnf4` vs `dnf5` — "Verify with `dnf --version` on your system"
- systemd version number — "Do not state a number; confirm with `systemctl --version`"
- `wheel` group default at install — flagged unverified
- RouterOS v6 vs v7 menu layout — both shown, difference flagged
- Cisco 2960-class vs Catalyst 9000 VLAN creation — both shown
- Windows Server 2019 vs 2025 — neutral cmdlets, differences flagged

> **The honest summary:** the application's behaviour is thoroughly tested. The
> technical content is well-sourced but not yet executed, and no entry has had an
> independent review. Both gaps are closable with equipment you already own.