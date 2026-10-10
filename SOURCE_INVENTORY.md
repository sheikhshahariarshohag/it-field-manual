# Source Inventory — the private book library

**Scanned:** 2026-10-10
**Location:** `C:\Users\<your-name>\Desktop\<your-notes>\IT Infrastructure\` (read-only; never modified)
**Method:** `tools/pdfextract` (Node + pdfjs-dist, dev-only). Page counts and
character counts below are measured, not estimated.
**Total:** 23 PDFs · 11,061 pages · ~12.6 M extractable characters · **0 scanned
documents** — every file has a real text layer, so nothing here is unreadable.

> **Licence note.** Every item below is a commercial or restricted publication
> held for private study. Nothing in this repository reproduces them. Content is
> original; sources are cited by title and URL. Where a freely-licensed work is
> used as a reference it is marked as such.

---

## Legend

| Status | Meaning |
|---|---|
| **SEED** | Directly usable as a source for Field Manual content |
| **CONCEPT** | Good for explaining *why*; procedure must come from current docs |
| **REFERENCE** | Lookup/verification aid, not a teaching source |
| **GAP** | Subject with no coverage |
| **OUTDATED** | Materially superseded — use only with explicit caveats |

---

## 1. Red Hat / Linux (strongest area)

| File | Pages | Real title | Ver | Use |
|---|---|---|---|---|
| `M-9 … RH124 … Student Workbook.pdf` | 658 | Red Hat System Administration I — Student Workbook | **CONCEPT** | RH124 concepts: users, permissions, files, basic security. **Covers RHEL 8, not 10.** |
| `Red Hat Enterprise Linux 8.0 RH124 …pdf` | 658 | *(byte-identical duplicate of the above)* | — | **Duplicate confirmed** by identical page + character count. Keep one. |
| `M-10 … RH134 …pdf` | 430 | Red Hat System Administration II — Student Workbook | **CONCEPT** | Networking, name resolution, storage, SELinux, containers. RHEL 8. |
| `M-11 … RH294 …pdf` | 540 | RH294: Red Hat System Administration III — **Linux Automation** — Student Workbook | **CONCEPT** | Ansible, Bash/Python scripting, automation. Directly useful. |
| `M-11 … RH254 …pdf` | 1070 | ⚠ **Filename says RH254; actual title is "Red Hat Enterprise Linux 8 System Design Guide"** | **REFERENCE** | System design, deployment. **Misnamed — do not file it under RH254.** |
| `Red Hat Enterprise Linux Troubleshooting.pdf` | 507 | Red Hat Enterprise Linux Troubleshooting Guide (Benjamin Cane) | **REFERENCE** | Diagnostic method. Watermarked copy. |
| `Red_Hat_Linux_Networking_and_System_Admi.pdf` | 889 | (Red Hat networking/admin) | **CONCEPT** | Networking fundamentals for admins. |
| `Linux All-in-one Desk Reference for Dummies.pdf` | 836 | Linux All-in-One Desk Reference For Dummies, 2nd ed. | **REFERENCE** | Broad command lookup. Old; verify every command. |
| `LinuxNotesForProfessionals.pdf` | 65 | Linux Notes for Professionals (GoalKicker) | **REFERENCE** | Concise community notes. Not an authority. |
| `Linux_System_Programming_Essentials — Kerrisk.pdf` | 127 | Linux System Programming Essentials — **Michael Kerrisk**, 2026 | **REFERENCE** | Authoritative on syscalls/processes. man7.org text. |
| `Linux_Security_and_Isolation_APIs_Essentials — Kerrisk.pdf` | 145 | Linux Security and Isolation APIs Essentials — **Michael Kerrisk**, 2026 | **REFERENCE** | Namespaces, capabilities, seccomp. man7.org text. |
| `RH254_Instructor_Demo.pdf` | 83 | RH254 demo (Travis Michette) | **REFERENCE** | Instructor material. Low authority. |
| `Securing Linux Servers for Service Providers.pdf` | 55 | Securing Linux Servers for Service Providers (Bill Hilf) | **OUTDATED** | Useful concepts, pre-hardened-baseline era. |
| `Red Hat Linux Security and Optimization.pdf` | 721 | Red Hat Linux Security and Optimization (Mohammed J. Kabir) | **OUTDATED** | Old. Concepts only. |
| `Red_Hat_Certificate_System-10-Administration_Guide-en-US.pdf` | 540 | ⚠ **Red Hat Certificate System 10** (PKI), **not RHEL 10** | **REFERENCE** | PKI/certificates. **Filename is misleading — this is about certificates.** |

### Your own RHEL 10 work (highest-value RHEL source)

Not books — **your own 25-section service profiles**, written 2026-10-10, with
🟢/🟡/🟠/🔴 risk classification. Format already validated; adopted by the manual.

`00-master-index.md`, `01-systemd-systemctl.md`, `03-firewalld.md`,
`04-openssh-sshd.md`, `05-selinux.md`, `06-systemd-journald.md`,
`07-chronyd.md`, `08-auditd.md`, `09-cron-crond.md`, `10-rsyslog.md`,
`11-apache-httpd.md`, `12-nfs.md`, `13-samba-smb.md`, `14-sssd.md`,
`15-bind-named.md`, `16-dhcp.md`, `17-autofs.md`, `18-podman.md`,
`19-libvirt-kvm-qemu.md`, `20-postgresql.md`,
`21-final-cross-service-sections.md`

> ⚠ **Gap:** `02-networkmanager.md` is listed in `00-master-index.md` but
> **the file is missing from the folder.** Recorded, not silently ignored.

> ⚠ These profiles self-declare *"checked against RHEL 10 documentation … current
> as of September 2026"* but are **source-checked only** — none was
> execution-tested. Carried into the manual with that status intact.

---

## 2. Networking

| File | Pages | Ver | Use |
|---|---|---|---|
| `Networking-with-MikroTik-MTCNA-Study-Guide-by-Tyler-Hart.pdf` | 351 | **SEED** | The only MikroTik source. Routing, switching, VLAN, DHCP, firewall, NAT, wireless, VPN, troubleshooting. **Verify commands against current RouterOS docs — this targets older v6 syntax.** |

### ⚠ GAP — Cisco / CCNA: **no source material of any kind**

There is no Cisco book, no CCNA study guide, no IOS reference in the workspace.
This is the **single largest gap** in the library.

Cisco command syntax in the Field Manual is therefore written from Cisco's own
public documentation, and every entry carries a source citation. Flagged as the
top build priority in `PROJECT_PLAN.md`.

---

## 3. Windows

| File | Pages | Real title | Ver | Use |
|---|---|---|---|---|
| `win 11 original.pdf` | 817 | **Windows 11 Inside Out** (Ed Bott) | **SEED** | Windows 11 in depth. Excellent for the subject. |
| `Windows Server 2019 & PowerShell by Sara Perrott.pdf` | 1034 | Windows Server 2019 & PowerShell All-in-One For Dummies | **CONCEPT** | Server + PowerShell. **2019 — two releases behind current.** |
| `Windows Server 2019 New Book.pdf` | 516 | (Windows Server, 2019) | **CONCEPT** | **2019 — superseded.** |
| `Windows Server CMD.pdf` | 14 | Windows Server command cheat sheet | **REFERENCE** | Small. Verify every line. |
| `powershell-scripting-powershell-7.6.pdf` | **3011** | **Microsoft Learn — PowerShell 7.6 reference** | **SEED** ⭐ | Official current Microsoft documentation, offline. **The single most authoritative item in the library.** |

---

## 4. Security

| File | Pages | Ver | Use |
|---|---|---|---|
| `CEH - Official Certified Ethical Hacker …pdf` | 265 | CEH study material, publisher unknown | **REFERENCE — low confidence** | Filename and metadata are unreliable ("Unknown_1242", no author). Useful only as a topic checklist. **Do not treat any claim in it as verified.** |

---

## 5. Other workspace material (context, not primary sources)

| File | Note |
|---|---|
| `01_Master_Assignment_RHEL10_NAT_Port_Forwarding.doc(x)` | Active assignment — RHEL 10 NAT port forwarding |
| `DAG_Daily_Completion_Plan_October_2026.docx` | Current study plan |
| `Plan for Linux_Shohag.(doc/odt/pdf)` | Learning plan, three formats |
| `Interview_Questions_Master.docx` | Interview Q&A across 10 layers |
| `RH124/134/294_Complete_Guide.(docx/pdf)` | Your condensed RHCSA notes |
| `RHEL8_Core_Services_Assignment.docx` | RHEL 8 services assignment |
| `containerization-with-docker-assignment.pdf` | Containers assignment |
| `Linux_Security_and_Isolation_APIs_Essentials*.pdf` (also in Downloads) | Duplicate copies exist in `Downloads\` |
| `notice_30-Nov-2024.pdf`, `notice_27-Nov-2025.docx` | Administrative notices |
| `Sheikh_Shahariar Shohag_1295069.*` | Personal/academic records |

---

## 6. Coverage verdict

| Subject | Library | Lab | Verdict |
|---|---|---|---|
| CompTIA A+ | **none** | — | 🔴 Build from free current sources |
| Cisco / CCNA | **none** | — | 🔴 Largest gap; build from Cisco public docs |
| MikroTik | strong (351 pp) | CHR needed | 🟡 Good |
| Windows 11 | **strong** (817 pp) | host | 🟢 Good |
| Windows Server | moderate, 2019-era | Server VM needed | 🟡 Usable + current docs |
| RHEL 10 | **very strong** + your 20 profiles | **3 VMs available** | 🟢 Best-supported |

## 7. Outstanding research

1. **Cisco** — build from free Cisco material; no local fallback exists.
2. **CompTIA A+** — build from current objectives and free references.
3. **RHEL 10 execution testing** — promote entries via the three existing VMs.
4. **Windows Server 2025** — confirm role/PowerShell differences from 2019.
5. **RouterOS v7** — confirm the MTCNA guide's v6-era syntax against current docs.