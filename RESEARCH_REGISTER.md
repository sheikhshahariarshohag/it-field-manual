# Research Register

Every free or official resource this project relies on, with the date it was
checked, what it was used for, and its limits. If a resource is not listed here,
the manual should not be citing it.

**All entries checked: 2026-10-10.**

---

## 1. Vendor documentation — primary authority

| Resource | Publisher | URL | Used for | Access | Limits |
|---|---|---|---|---|---|
| RHEL 10 Documentation Portal | Red Hat | `docs.redhat.com/en/documentation/red_hat_enterprise_linux/10` | RHEL 10 baseline, administration guides | Free | Official but version-pinned |
| RHEL 10.2 Release Notes | Red Hat | `docs.redhat.com/.../10/html/10.2_release_notes` | Kernel 6.12, glibc 2.39, GCC 14.3, removed modularity | Free | Minor-release specific |
| RHEL Life Cycle | Red Hat | `access.redhat.com/support/policy/updates/errata` | Support dates | Free | Login for some errata |
| What's new in RHEL | Red Hat | `redhat.com/en/whats-new-red-hat-enterprise-linux` | Minor release cadence | Free | Marketing page |
| MikroTik Downloads / Changelog | MikroTik | `mikrotik.com/download/routeros` | RouterOS versions, channels, dates | Free | — |
| MikroTik Documentation | MikroTik | `help.mikrotik.com/docs/spaces/ROS` | Command syntax | Free | Version-tagged paths |
| RouterOS CVE-2026-89021 advisory | MikroTik | `mikrotik.com/supportsec/cve-2026-89021/` | Container CVE, no 7.23.x backport | Free | — |
| Windows client supported versions | Microsoft | `learn.microsoft.com/en-us/windows/release-health/supported-versions-windows-client` | Win11 26H1/25H2/24H2/23H2, EOL dates | Free | — |
| Windows Server release info | Microsoft | `learn.microsoft.com/en-us/windows/release-health/windows-server-release-info` | Server 2025 LTSC, support to 2029-11-13 | Free | — |
| Windows Server 2025 update history | Microsoft | `support.microsoft.com/.../windows-server-2025-update-history` | Build numbers, known issues | Free | — |
| Learn — PowerShell 7.6 reference | Microsoft | `learn.microsoft.com` | PowerShell cmdlets (also held offline, 3011 pp) | Free | — |
| Learn — ipconfig / chkdsk / diskpart / bcdedit | Microsoft | `learn.microsoft.com` | Windows command reference | Free | — |
| Learn — DHCP & ServerManager cmdlets | Microsoft | `learn.microsoft.com` | Windows Server roles and scope cmdlets | Free | — |
| 200-301 CCNA official exam topics (v2.0) | Cisco | `learningcontent.cisco.com/documents/marketing/exam-topics/200-301_CCNA_v2.0_Exam_Topics_PDF.pdf` | Domain weights, scope | Free, Cisco Public | Marketing pages disagree ("v1.1"); PDF wins |
| Cisco CCNA exam page | Cisco | `cisco.com/.../exams/ccna` | Exam structure | Free | — |

## 2. Free lab and simulation environments

| Tool | Cost | Best for | Limits — stated honestly |
|---|---|---|---|
| **Cisco Packet Tracer** | Free (Networking Academy account) | Switching, VLANs, routing, ACLs, DHCP, NAT, OSPF, WLC | **Simulated, not real IOS.** Some behaviour differs from hardware. |
| **Cisco CML Free** | Free tier | Real IOS images, realistic troubleshooting, automation | Free tier has a node limit; higher tiers are paid |
| **GNS3 / EVE-NG** | Free software | Mixed-vendor topologies | **You must supply your own legal device images.** Biggest stumbling block. |
| **MikroTik CHR** | Free for non-commercial lab only | RouterOS without hardware | **P1 profile caps throughput at 1 Gbit/s.** Not a production option, not free commercially. |
| **VMware Workstation** | Already installed | Run all your RHEL/Windows VMs | Your existing licence |
| **DevNet Sandbox / Cisco Learning Labs** | Free | Guided device labs online | Needs account; sessions time out |

## 3. Standards and neutral references

| Resource | Publisher | Used for |
|---|---|---|
| `man7.org` | Michael Kerrisk / man-pages project | Linux syscall, `ss(8)`, `nsswitch.conf` semantics |
| IETF RFCs (free) | IETF | IPv4/IPv6, DHCP, DNS, Kerberos, OSPF — authoritative where vendor docs are vague |
| NIST SP 800 series | NIST | Security controls, hardening baselines (no invented "banking practice") |
| CIS Benchmarks | Center for Internet Security | Hardening baselines — **licensed**, so link, do not redistribute |
| MITRE ATT&CK | MITRE | Threat behaviour framing in security scenarios |

## 4. Personal library

See `SOURCE_INVENTORY.md` for the full table. Only three items are treated as
close to authoritative: the two Michael Kerrisk man-pages books, the offline
**Microsoft Learn PowerShell 7.6** export, and your own RHEL 10 service
profiles (which are excellent but source-checked only).

---

## 5. What was learned during this research pass

Concrete, dated findings — not a summary of what I already knew.

1. **RHEL 10.2 is current** (2026-05-20), kernel 6.12, and RHEL 10 has **removed
   modularity Application Streams**. Any `dnf module install` instruction is
   RHEL 8/9-era and wrong on RHEL 10.
2. **RouterOS has three supported lines**: stable 7.24.4, long-term 7.23.7, and
   v6 long-term 6.49.22. 7.22 hit EOL on 2026-05-26.
3. **CVE-2026-89021 will not be backported to RouterOS 7.23.x.** Affects how a
   CHR lab should be built.
4. **Windows Server 2025** is the current LTSC, and AD DS now supports a
   32,000-page database domain controller.
5. **Windows 11 24H2 Home/Pro stops getting updates on 2026-10-13** — three days
   from now. 23H2 Enterprise ends 2026-11-10.
6. **Cisco's official topics PDF is v2.0 and adds an AI domain at 10%.** The
   marketing pages still say v1.1 — a live example of why vendor documentation
   must be dated.
7. **CML Free exists** — a free Cisco lab tier with real IOS images. Better than
   Packet Tracer for troubleshooting work, and it is genuinely free.
8. Two library files are **misnamed**: `M-11 … RH254` is actually the RHEL 8
   *System Design Guide*, and `Red_Hat_Certificate_System-10` is about PKI, not
   RHEL 10.

---

## 6. Certification objectives — checked against the publishers

The manual was originally written from vendor documentation, with **no traceable
link to any exam syllabus**. That was a real gap and it is now closed. Each
objective in `docs/data/exam-objectives.json` carries its source and the date it
was read.

| Exam | Status | Source | Read |
|---|---|---|---|
| CCNA 200-301 v2.0 | **Verified** | Cisco's own exam topics PDF (published 2026-05-14) | 2026-10-10 |
| CompTIA A+ 220-1201/1202 | **Verified** | CompTIA published objectives; current since March 2025 | 2026-10-10 |
| MTCNA | **Verified** | MikroTik's published training outline | 2026-10-10 |
| MTCRE | **Verified** | MikroTik's published training outline | 2026-10-10 |
| RHCSA EX200 | **Verified** | Red Hat's EX200 objectives page | 2026-10-10 |
| AZ-800 | **Verified** | Microsoft Learn, "Assessed on this exam" | 2026-10-10 |

### Two corrections this produced

1. **RHCSA is EX200, not EX294.** EX294 is the RHCE/Ansible exam. I had the
   wrong code in the first draft.
2. **My unverified RHCSA guess was wrong in substance, not just detail.** I had
   guessed 9 category names; the real exam has **10**, and my guess missed
   **Flatpak**, **autofs**, **tuning profiles**, **systemd timer units**,
   **chronyd**, **SSH key authentication** and **SELinux port labels and
   Booleans** entirely. Flagging it unverified rather than presenting it as fact
   is what kept that from becoming a wrong "exam fact".

### The most useful line on the Red Hat page

> "This exam is based on Red Hat® Enterprise Linux® 10."

The manual targets RHEL 10, so that is the correct base version.

Also worth knowing before sitting RHCSA: it is **100% hands-on**, no
multiple-choice, **no internet access and no permitted documentation**, and
configurations must survive a reboot without intervention. That is why so many
objectives are phrased as "configure to start automatically at boot".

### What is deliberately not covered

AZ-800 is substantially a **hybrid and Azure** exam — domains 2, 3, 7, 8 and 9
are largely Azure Arc, Azure IaaS, availability sets, Site Recovery and workload
migration. This manual is on-premises focused and covers **none** of that. It
maps to AZ-800 domains 1, 4, 5, 6 and 10 only. Stated in the app itself, not
buried here.

---

## 7. Outstanding research

| Item | Why it blocks | Priority |
|---|---|---|
| Cisco command reference for a specific model | Cannot verify platform-specific syntax without picking models | **High** |
| RHEL 10.2 execution testing on your VMs | Only way to promote entries from source-checked | **High** |
| Windows Server 2025 cmdlet diffs from 2019 | Library is two releases behind | Medium |
| CompTIA A+ current objectives | No local source at all | ~~Done~~ — verified from CompTIA, 2026-10-10 |
| MikroTik CHR throughput/lab setup specifics | Needed before RHEL-free MikroTik labs | Medium |
| RHCSA EX200 per-category weights | Red Hat publishes objectives but not percentage weights | Low |
| MTCRE content | Objectives verified, but **0 MTCRE lessons exist** | Medium |

> If internet access is ever unavailable, the offline Microsoft Learn PowerShell
> export and the local library still cover a large share of the Windows and RHEL
> material. Everything else would be flagged as unverified rather than guessed.