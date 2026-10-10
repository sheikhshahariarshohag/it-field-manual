# Content Map

The curriculum, how it relates to your existing 146-session Knowledge Map, and
what exists versus what is planned. Counts are kept honest: an empty subject
shows zero, not filler.

**Current: 43 commands · 32 lessons · 3 scenarios · 3 quizzes · 1 project**

The 32 lessons are 3 hand-written, **19 RHEL 10 service profiles converted from
your own 25-section notes** (266 sections, **147 lab exercises**, **115
documented mistakes**), plus **10 subject lessons** built for Cisco, MikroTik,
CompTIA A+ and Windows Server.

---

## 1. Relationship to your existing work

| Your material | Role in the Field Manual |
|---|---|
| `Enterprise_Infrastructure_Knowledge_Map_Unified.pdf` (146 sessions, 10 layers) | **Curriculum source, not a duplicate.** Layers 1, 3, 4 and 5 map to the six subjects. The manual is the operational companion, not a rewrite. |
| `00-` … `21-*.md` (20 RHEL service profiles) | **Seed content.** Format adopted (D-013). Not yet imported into the app. |
| `Interview_Questions_Master.docx` | Future assessment source. Not yet mined. |
| RHEL/RHCSA workbooks (RH124/134/294) | Concept source only — they are RHEL 8. |

---

## 2. Subject status

Legend: ✅ built · 🟡 partial · ⬜ not started

### 1. CompTIA A+ ⬜ — no source material exists
Hardware, components, storage, firmware, boot, peripherals, troubleshooting.
- **4 commands** (diskpart, chkdsk) — hardware/disk focused
- **0 lessons · 0 scenarios**
- *Gap:* the library contains nothing for this subject. Build from current
  CompTIA objectives and free hardware references.

### 2. Cisco / CCNA 🟡 — largest gap in the library
Switching, VLANs, trunking, routing, IPv4/IPv6, ACLs, DHCP, DNS, NAT, wireless,
security, troubleshooting, automation concepts.
- **4 commands** — `show ip interface brief`, `show running-config interface`,
  VLAN creation, ping/traceroute
- **1 lesson** — *Why two devices on the same VLAN cannot talk*
- **1 scenario** — *(RHEL scenario cross-links here)*
- *Gap:* **no Cisco book of any kind in the workspace.** Highest build priority.
- Free labs available: Packet Tracer, **CML Free**, GNS3.

### 3. MikroTik 🟡
RouterOS, WinBox, CLI, interfaces, bridging, VLANs, addressing, routing, DHCP,
DNS, firewall, NAT, VPN, monitoring, backup, troubleshooting.
- **3 commands** — `/ip address print`, `/ip firewall filter`, `/ip dhcp-server network`
- **1 scenario** — *The client sees 169.254.x.x*
- *Gap:* no lessons. Source is the MTCNA guide, which predates RouterOS v7 —
  **every command must be re-verified against current docs.**

### 4. Windows 11 ⟧
Installation, compatibility, users, permissions, storage, networking,
PowerShell, updates, security, remote support, troubleshooting, domain join.
- **2 commands** — `ipconfig /all`, `bcdedit`, plus DISM/SFC
- **1 lesson** — *Joining a Windows 11 client to a domain*
- *Gap:* no scenarios, no quizzes.

### 5. Windows Server 🟡
AD DS, DNS, DHCP, GPO, file/print, permissions, remote admin, PowerShell,
deployment, backup, monitoring, certificates, virtualization, hardening.
- **2 commands** — `Install-WindowsFeature`, `Add-DhcpServerv4Scope`
- **1 scenario** — *Domain users cannot resolve any name on the new DC*
- *Gap:* no lessons. Library is 2019; target is 2025.
- **Planned (not built):** AD DS forest design, GPO troubleshooting, file
  services with NTFS + share permissions, PKI/certificates, backup and recovery.

### 6. RHEL 10 🟢 — best supported
Everything in the six-subject brief, plus your 20 service profiles.
- **8 commands** — systemctl ×2, journalctl, ss, dnf, SELinux/ausearch,
  firewalld, nmcli
- **21 lessons** — 19 converted service profiles (systemd, firewalld, SELinux,
  sshd, journald, chronyd, auditd, cron, rsyslog, Apache, NFS, Samba, SSSD,
  BIND, DHCP, autofs, Podman, libvirt/KVM, PostgreSQL) plus *How a name
  becomes an address*
- **2 scenarios** — *Service active but unreachable*, *Client sees 169.254.x.x*
- **2 quizzes**
- **Three RHEL 10 VMs available** for execution testing.

### Cross-cutting 🟡
- **1 project** — *Build the IT infrastructure for a small office*
- **3 quizzes** covering switching, Windows Server, RHEL basics
- **Verification page** — explains all four levels, with live counts

---

## 3. Cross-domain links

The prompt asks for prerequisites and cross-subject relationships. These are
implemented as `related` links and are **validated** by `scripts/validate.mjs`.

| Link | Why it matters |
|---|---|
| VLAN troubleshooting (Cisco) ↔ bridge membership (MikroTik) | The same Layer-2 fault on different platforms. Both scenarios turn on "is this port in the right broadcast domain". |
| RHEL DNS ↔ NetworkManager DNS config | The nameserver you configure on the profile is not the one `resolv.conf` shows. |
| Windows DHCP option 6 ↔ domain join | A wrong resolver is the number-one cause of failed domain joins. |
| RHEL firewall ↔ "running ≠ listening ≠ reachable" | The single most repeated lesson across all three Linux-type subjects. |
| Disk-partition A+ ↔ RHEL storage ↔ Windows Server storage | Same concept, three tools. |
| Windows Server AD DS ↔ RHEL SSSD/realmd | One identity, two ways to consume it. |

---

## 4. Planned build order

Priority reflects the gap, not interest. Each item names what it closes.

| # | Item | Closes |
|---|---|---|
| 1 | **Promote RHEL commands to execution-tested** using your 3 VMs | The largest accuracy gain available with zero cost |
| 2 | Cisco/CCNA: 2 lessons (subnetting, OSPF neighbour problems), 3 scenarios | A1, the largest gap |
| 3 | CompTIA A+: 2 lessons (boot process, POST diagnostics) | A2 |
| 4 | Import your 20 RHEL service profiles as lessons | RHEL depth, immediately |
| 5 | Windows Server: AD DS forest design + GPO troubleshooting | Major curriculum gap |
| 6 | MikroTik: bridge/VLAN lesson; re-verify all commands against RouterOS 7 | v6→v7 correctness |
| 7 | Windows 11: boot repair, permissions troubleshooting | Currently thin |
| 8 | Projects: file server, Linux web server, disaster-recovery drill | Prompt asks for several |
| 9 | Expand quizzes and add cumulative review | Assessment depth |
| 10 | Create Windows Server VM + MikroTik CHR; close B3/B4 | Execution coverage |

---

## 5. Explicitly not planned

- **An exam-simulation product.** The brief asks for knowledge and practical
  ability, not test answers. Quizzes assess understanding — why a command works,
  what output means, how to recover — never recall of question banks.
- **Paid content, subscriptions or hosted backends.** The core must work with
  none of these.
- **Reproduction of any book.** Original explanations, short attributed
  quotations only.
- **Inflating counts.** A subject with no content shows "not written yet" rather
  than padding. That is a deliberate product decision.