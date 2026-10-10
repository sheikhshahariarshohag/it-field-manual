# Version Policy

**Verified:** 2026-10-10. Every date below was checked against the vendor's own
site on that date. Re-check before each release; record the new date here.

> **The rule.** The version a book was printed in tells you nothing about the
> version the technology is in today. Every instruction in this manual names the
> platform and version it applies to, and anything version-sensitive is either
> verified against that version or explicitly flagged.

---

## 1. Baseline table

| Subject | Baseline for this manual | Status on 2026-10-10 | Support ends |
|---|---|---|---|
| **RHEL** | **RHEL 10.2** | **Current** (GA 2026-05-20) | Full Support 2030-05-31; Maintenance 2035-05-31 |
| **RouterOS** | **7.24.x stable**; 7.23.x long-term for LTS labs | 7.24.4 (2026-09-16); 7.23.7 LT (2026-09-16) | 7.22 reached EOL 2026-05-26 |
| **Windows Server** | **Windows Server 2025** | **Current LTSC** (2024-11-01, build 26100.x / 24H2) | 2029-11-13 |
| **Windows 11** | **24H2+**, current servicing option **26H1** | 26H1 build 28000 (GA 2026-02-10) | 26H1 Home EOL 2028-03-14, Enterprise 2029-03-13 |
| **Cisco** | **200-301 CCNA**, IOS / IOS XE | v1.1 in effect; official topics doc now labelled **v2.0** (2026-05-14) | CCNA cert valid 3 years |
| **CompTIA A+** | Current objectives | — | — |

---

## 2. RHEL 10 — what actually changed

Verified from Red Hat's 10.2 release notes and the RHEL documentation portal.

**RHEL 10.2 ships:**
- Kernel **6.12.0-211.7.3**
- glibc **2.39**
- GCC **14.3**
- Python **3.14**, Go **1.26**, LLVM **21**, Rust **1.92**, PostgreSQL **18**

**RHEL 10 removed modularity Application Streams.** Red Hat does not ship
modularity content in RHEL 10. Application Streams are now installed directly
with `dnf install`. *This matters:* instructions that say `dnf module install`
or reference modular streams are RHEL 8/9-era and are wrong on RHEL 10.

**Version-sensitive points to state on every RHEL page:**

| Claim | Status |
|---|---|
| `dnf4` is the default `dnf` in RHEL 10 GA | Believed correct from your own notes; **must be re-confirmed with `dnf --version` on the actual VM** — Red Hat has signalled this may change |
| firewalld backed by **nftables** | Correct; iptables backend present but legacy |
| NetworkManager keyfile profile storage; `ifcfg` deprecated | Correct |
| SELinux **Enforcing** by default, targeted policy | Correct |
| New users added to `wheel` during interactive install | **Flagged unverified** — confirm on your own install |
| chronyd preferred over systemd-timesyncd | Correct |
| systemd version number | **Do not state a number.** Confirm with `systemctl --version` |

> Your existing service profiles say "RHEL 10.0 GA" in places. 10.2 is current;
> minor-specific behaviour must be checked against the 10.2 release notes.

### RHEL 8 books: how to use them

The RH124/RH134/RH294 workbooks are **RHEL 8**. Use them for *concepts*
(users, groups, permissions, filesystem hierarchy, systemd architecture, name
resolution theory). Do **not** let them dictate procedure. Specific known
differences: dnf modularity, PEP 668 / `dnf install` restrictions, the
`/usr/lib` vs `/usr/local` split, and default `firewalld` zones.

---

## 3. RouterOS 7

| Channel | Version | Date | Use |
|---|---|---|---|
| **stable** | **7.24.4** | 2026-09-16 | Default baseline |
| long-term | 7.23.7 | 2026-09-16 | LTS / production-like labs |
| long-term (legacy) | 7.21.5 | 2026-07-06 | Only for long-term-support labs |
| v6 long-term | 6.49.22 | 2026-09-21 | Legacy compatibility only |

### ⚠ Security finding that affects lab planning

**CVE-2026-89021** (container image trust) is fixed in **7.24.2 and later**, and
**there is no backport planned for the 7.23.x long-term branch.**

Practical consequence: if you build a CHR lab on 7.23.x and pull images from a
public registry, you are knowingly running an unpatched branch. For a learning
lab that never touches untrusted container images this is acceptable — but say
so, and prefer **7.24.x** for any lab that does use containers.

### v6 vs v7 — the difference that matters

The MTCNA study guide in your library predates v7 and uses v6 menu layout.
The single most important change for your notes:

- v6: `/interface vlan`, `/interface bridge port` all under `/interface`
- **v7: `/interface/bridge/port` and `/interface/ethernet` are separate menus**

RouterOS 7 also rewrote the firewall's simple-address-list model. Both remain
valid; this manual teaches v7 and flags v6 where relevant.

**CHR limitation to state honestly:** CHR is *not* free for anything beyond
non-commercial evaluation. It is limited to 1 Gbit/s throughput on the free
P1 profile. Do not describe it as a free production option.

---

## 4. Windows Server 2025

Current LTSC, released **2024-11-01**, build family **26100.x** (24H2).
Support runs to **2029-11-13**.

Your library is Windows Server **2019** — two releases behind. Use it for
concepts and for PowerShell fundamentals; confirm every cmdlet and parameter
against Microsoft Learn.

**2025-specific facts to check before repeating:**
- AD DS: a new **32,000-page database** domain controller option — a genuine
  change from 2019.
- Group Policy administrative templates (`.admx`) are versioned separately from
  the OS and must be downloaded for 2025.
- Hyper-V: support for up to **240 TB RAM / 2048 vCPUs** per VM.
- Desktop Experience vs Server Core differences in 2025.

**Your current `Install-WindowsFeature`, `Add-DhcpServerv4Scope` and related
entries are written as version-neutral and apply to 2019/2022/2025.** Confirm
with `Get-WindowsFeature` and `Get-Command -Syntax` on the target server.

---

## 5. Windows 11

| Version | Build | GA | Home/Pro EOL | Enterprise EOL |
|---|---|---|---|---|
| **26H1** | 28000 | 2026-02-10 | 2028-03-14 | 2029-03-13 |
| 25H2 | 26200 | 2025-09-30 | 2027-10-12 | 2028-10-10 |
| 24H2 | 26100 | 2024-10-01 | **2026-10-13** | 2027-10-12 |
| 23H2 | 22631 | 2023-10-31 | ended | **2026-11-10** |
| LTSC 2024 | 26100 | 2024-10-01 | — | 2029-10-09 |

⚠ **24H2 Home/Pro loses updates on 2026-10-13 — three days from now.** If you
are still on 24H2 at home, upgrade. 23H2 Enterprise ends 2026-11-10.

Windows 10 reached end of updates **2025-10-14**. Anything Windows-10-specific is
legacy.

---

## 6. Cisco

- Current exam: **200-301 CCNA**, 120 minutes, US$300 or Learning Credits.
- Cisco's official topics PDF is titled
  **"Implementing and Administering Cisco Solutions (200-301 CCNA) v2.0"**,
  published **2026-05-14**. Cisco's marketing pages still say "v1.1".
  **The official topics PDF wins**; where they conflict, the PDF is cited.

**Domain weights (v2.0):**
1. Network Fundamentals — 20%
2. Network Access — 20%
3. IP Connectivity — 25%
4. Network Services and Security — 20%
5. AI, and Network Operations and Management — 10%

**Platform:** teach **IOS / IOS XE**, and say which one. This matters:
- VLAN creation is in `vlan database` on Catalyst 2960-class (IOS 15.x), but in
  `configure terminal` on Catalyst 9000 (IOS XE).
- `switchport trunk encapsulation dot1q` is required on 2960-class and
  **rejected** on many IOS XE platforms.
- Interface names differ: `GigabitEthernet0/1` vs `GigabitEthernet1/0/1` on a
  stack.

The manual teaches the difference rather than hiding it, because the difference
is the thing that actually breaks people's configurations.

**Free lab tools (both confirmed free as of 2026-10-10):**
- **Cisco Packet Tracer** — free with a free Cisco Networking Academy account.
  Simulated, not real IOS; some behaviour differs from hardware.
- **CML Free** — free tier of Cisco Modeling Labs, real IOS images.
- **GNS3 / EVE-NG** — free software, but **you must supply your own legal
  device images**. This is the usual stumbling block and must be disclosed.

---

## 7. CompTIA A+

No local source material exists for this subject (see `SOURCE_INVENTORY.md`).
Content must be built from CompTIA's current published objectives and free
technical references, then verified against current hardware documentation.

Keep it **durable support knowledge** — what a fault looks like, what to check,
in what order — rather than exam trivia. That is both more useful to you and
harder to make obsolete.

---

## 8. Re-verification schedule

| When | What to re-check |
|---|---|
| Every release of this manual | All baselines above |
| Quarterly | RHEL 10.x minor; RouterOS stable; Windows Server CU/EDIFACT |
| Before any RHEL execution test | `dnf --version`, `systemctl --version`, `uname -r`, `firewall-cmd --version` |
| Before writing a Cisco page | The current official topics PDF and the model-specific command reference |

**The single most valuable habit:** record the actual output of
`dnf --version; systemctl --version; uname -r` from your RHEL 10 VM and put it
in `VERIFICATION_REGISTER.md`. That converts an assumption into a fact.