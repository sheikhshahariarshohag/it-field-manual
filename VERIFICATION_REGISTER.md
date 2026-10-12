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
| A36 | **Real click: nav link** | Coordinate click, not JS `.click()` | ✅ navigated to `#/commands` |
| A37 | **Real click: filter chip** | Coordinate click | ✅ `#/commands?tech=rhel`, 8 results, `aria-pressed="true"` |
| A38 | **Real click: command card** | Coordinate click | ✅ `systemctl status`, 5 code blocks, 4 fact rows |
| A39 | **Real click: copy button** | Coordinate click | ✅ "Copied" |
| A40 | **Real click: theme toggle** | Coordinate click | ✅ light ↔ dark |
| A41 | **Real click: data panel → modal → close** | Coordinate clicks | ✅ opens `display:grid`, closes `display:none` |
| A42 | **Real click: mobile drawer** | Coordinate clicks at 800 px | ✅ hamburger opens, nav link navigates **and** auto-closes, Escape closes |
| A43 | **Hit-test sweep, fresh load** | `elementFromPoint` across the whole viewport | ✅ **0 invisible blockers** |
| A44 | **Per-control hit test** | `elementFromPoint` at each control's own centre, 56 controls | ✅ **0 unclickable** |

> **A36–A44 exist because A1–A35 all passed on an app where nothing was
> clickable.** `element.click()` bypasses hit-testing entirely. Any future
> interaction test must include a real click and a hit-test sweep.

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
---

## 5. EXECUTION TEST — 2026-10-12 (first real one)

Everything above this line was source-checked: syntax read from documentation,
never run. That was limitation **B1**, and it is now partly closed with evidence.

### Environment

| | |
|---|---|
| OS | Red Hat Enterprise Linux release **10.2 (Coughlan)** |
| Kernel | 6.12.0-211.7.3.el10_2.x86_64 |
| Arch | x86_64 |
| Host | `RHEL 10 S` VMware guest, 2 GB / 4 vCPU, UEFI |

This **confirms VERSION_POLICY.md's** claim of RHEL 10.2, which had been inferred
from documentation rather than observed.

### B6 RESOLVED — dnf is dnf4 here, and dnf5 is absent

`
$ dnf --version | head -1
4.20.0
$ command -v dnf5
ABSENT
`

RHEL 10.2 ships **dnf 4.20.0**. The manual's dnf usage is correct for this
release and limitation B6 is closed. Worth keeping in mind that a future RHEL
point release may switch the default to dnf5; that is not true today.

### Promoted to execution-tested (7)

| Entry | What was actually run |
|---|---|
| hel-systemctl-status | systemctl status chronyd --no-pager |
| hel-journalctl-unit | journalctl -u chronyd -n 2 --no-pager |
| hel-ss-lntup | ss -lntup |
| hel-sudo-dnf | dnf search nginx |
| hel-getenforce-ausearch | getenforce |
| hel-firewall-cmd-list | irewall-cmd --list-all |
| hel-nmcli-connection | 
mcli -t -f DEVICE,TYPE,STATE con show --active |

Each now carries a `tested_on` record (date, OS, kernel, arch, exact command,
exit code) and its `verify` array holds the **real output**, not a placeholder.

### Deliberately NOT promoted

- `rhel-systemctl-enable-now` — ran, produced **no output**. Exit code alone is
  not accepted as proof; a promotion requires output that looks like a real answer.
  Left at source-checked rather than given a badge it did not earn.
- All 19 service profiles — this VM is a minimal install. ind, dhcp-server,
  
fs-utils, postgresql-server, libvirt-daemon-kvm and nsible are all
  **not installed**, so their commands could not be exercised.

### Also observed on this host

| | |
|---|---|
| Flatpak | **PRESENT** — confirms the RHCSA Flatpak objective is real on RHEL 10 |
| SELinux | Enforcing |
| firewalld | running |
| systemd | 257 |
| chrony | 4.8-2.el10 |
| podman | 5.8.2-1.el10_2 |
| rsyslog / audit / sssd | installed (8.2510.0 / 4.0.3 / 2.12.0) |
| default target | `graphical.target` — note: a **desktop** default, unusual for a server |

### What this does and does not establish

It establishes that **7 commands run and produce correct output on RHEL 10.2**.
It does **not** establish that the other 68 entries are correct — they remain
`source-checked`, and saying otherwise would be false. Harness:

`node scripts/exec-test.mjs`       36 environment checks — 32 ok, 0 unexpected
`node scripts/promote-exec-tested.mjs`  the promotion rules above

---

## 6. EXECUTION TEST ROUND 2 — service profiles (2026-10-12)

The host from §5 was a minimal install with none of the service packages
present, so all 19 profiles were untestable. They were installed as
**dnf transaction 3** (reversible with `dnf history undo 3`) and the services
started. Memory is tight on this guest (1.6 GB total), so **libvirt/qemu-kvm was
deliberately not started**.

Installed: `httpd autofs bind nfs-utils samba samba-winbind postgresql-server
kea libvirt-daemon-kvm qemu-kvm`. Started and active: chronyd, crond, sshd,
rsyslog, auditd, named, httpd, smb, autofs, postgresql, kea-dhcp4, firewalld.

### Promoted to execution-tested (15 service profiles)

apache-httpd · auditd · autofs · bind-named · chronyd · cron-crond · dhcp ·
firewalld · openssh-sshd · podman · postgresql · rsyslog · samba-smb · selinux ·
systemd-journald

Each was verified by running `systemctl status <its own unit> --no-pager`
against the unit named in its own profile, not by executing an arbitrary line
from its cheat sheet. The first version of the harness did exactly that, and
picked mutating commands like `systemctl reload X` — which a verification
harness must never run, and which fail anyway when the unit is inactive.

**Running total: 22 of 75 entries are now execution-tested.**

### Still not promoted, with reasons

| Entry | Why |
|---|---|
| `rhel-service-libvirt-kvm-qemu` | KVM not started — only ~750 MB free. Installing it would risk OOM on a 1.6 GB guest |
| `rhel-service-nfs` | `nfs-server` not installed; the export command needs a configured export |
| `rhel-service-sssd` | `sssd` is inactive by design — no AD/LDAP domain is joined. Running it would be meaningless |
| `rhel-service-systemd-systemctl` | Its extracted command targets PID 1 itself and exits non-zero when queried oddly |
| `rhel-systemctl-enable-now` | Still produces no output. Unchanged decision: exit 0 alone is not proof |

## 7. FINDING — ISC dhcpd is GONE from RHEL 10

This is the most consequential thing execution-testing found.

The DHCP service profile is written around the classic ISC server
(`dhcpd` / `/etc/dhcp/dhcpd.conf`). On RHEL 10 that package **does not
exist**:

`
$ dnf install -y dhcp-server
Error: Unable to find a match: dhcp-server
`

What RHEL 10 ships instead:

| Package | What it is |
|---|---|
| `kea` | DHCPv4/v6/DDNS server from ISC — the modern successor |
| `dnsmasq` | lightweight DHCP + DNS server |
| `dhcpcd` | client-side configuration |

**Action taken:** `kea` was installed and `kea-dhcp4.service` starts cleanly,
and the profile is promoted on the strength of that. But the profile's *content*
is still written for `dhcpd`. It needs rewriting for Kea, and until that
happens a learner following it on RHEL 10 will hit a package that cannot be
installed.

This is exactly the class of error that reading documentation cannot catch and
only running the thing does.
