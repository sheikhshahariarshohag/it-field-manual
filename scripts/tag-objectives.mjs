#!/usr/bin/env node
/**
 * tag-objectives.mjs — attach exam objective codes to content.
 *
 * WHY THIS EXISTS
 * The manual was originally written from technical documentation and my own
 * knowledge. That is correct for a *field manual*, but it left no traceable
 * link between a lesson and an official exam objective — so a learner cannot
 * tell whether a topic is examined, and I could not honestly claim the content
 * covers a syllabus.
 *
 * This script writes that mapping down explicitly, from a source-controlled
 * table of official objectives (docs/data/exam-objectives.json). It is
 * idempotent: running it twice changes nothing.
 *
 *   node scripts/tag-objectives.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const DOCS = join(HERE, "..", "docs");
const DRY = process.argv.includes("--dry-run");

const objectives = JSON.parse(readFileSync(join(DOCS, "data", "exam-objectives.json"), "utf8"));

/**
 * The mapping. Deliberately hand-written and reviewable rather than inferred —
 * an automatic guess at which objective a lesson serves would be exactly the
 * kind of unverified claim this project refuses to make.
 *
 * Each entry is [contentId, objectiveId, note?]
 */
const MAP = [
  // ---- CCNA 200-301 -------------------------------------------------------
  ["ccna-longest-prefix-match", "CCNA-3.1", "Reading a routing table; prefix length beats metric"],
  ["ccna-longest-prefix-match", "CCNA-3.2", "Static routing behaviour"],
  ["ccna-subnetting-that-sticks", "CCNA-1.3", "Network design and addressing"],
  ["ccna-subnetting-that-sticks", "CCNA-3.1", "Prefix length is what makes a route specific"],
  ["ccna-switch-learns-mac", "CCNA-2.3", "STP listening/learning delay; portfast"],
  ["ccna-switch-learns-mac", "CCNA-2.6", "MAC flooding and why controls exist"],
  ["cisco-show-ip-route", "CCNA-3.1"],
  ["cisco-ip-route", "CCNA-3.2", "Default, network, host and floating static routes"],
  ["cisco-show-spanning-tree", "CCNA-2.3"],
  ["cisco-ip-access-list", "CCNA-4.6", "Standard and extended IPv4 ACLs"],
  ["cisco-show-interfaces-switchport", "CCNA-2.1"],
  ["cisco-interface-no-shutdown", "CCNA-2.1", "Port state"],
  ["cisco-show-mac-address-table", "CCNA-2.6"],
  ["cisco-copy-running-config", "CCNA-4.2", "Configuration management"],

  // ---- MikroTik MTCNA -----------------------------------------------------
  ["mikrotik-bridge-broadcast-domains", "MTCNA-M3.1"],
  ["mikrotik-firewall-chains", "MTCNA-M6.2"],
  ["mikrotik-firewall-chains", "MTCNA-M6.3", "input chain"],
  ["mikrotik-firewall-chains", "MTCNA-M6.4", "forward chain"],
  ["mikrotik-ip-firewall-filter", "MTCNA-M6.2"],
  ["mikrotik-ip-firewall-nat", "MTCNA-M6.6", "masquerade and src-nat"],
  ["mikrotik-ip-firewall-nat", "MTCNA-M6.7", "dst-nat and redirect"],
  ["mikrotik-ip-dhcp-server-network", "MTCNA-M2.3"],
  ["mikrotik-ip-route-print", "MTCNA-M4.1"],
  ["mikrotik-bridge-port-print", "MTCNA-M3.1"],
  ["mikrotik-system-resource-print", "MTCNA-M9", "Support output and logs"],
  ["mikrotik-system-backup-save", "MTCNA-M1.6"],
  ["scn-dhcp-client-no-lease", "MTCNA-M2.3", "DHCP failures on a MikroTik router"],

  // ---- CompTIA A+ ---------------------------------------------------------
  ["aplus-post-boot-sequence", "APLUS-C2-3.2", "Boot order, WinRE, recovery"],
  ["aplus-post-boot-sequence", "APLUS-C1-5.1", "Apply the troubleshooting process"],
  ["aplus-reading-post-codes", "APLUS-C1-3.4", "Motherboard, RAM, CPU, power"],
  ["aplus-reading-post-codes", "APLUS-C1-5.1"],
  ["aplus-disk-management", "APLUS-C1-3.5", "Partitioning, MBR vs GPT"],
  ["aplus-chkdsk-sfc", "APLUS-C1-3.5", "File system repair"],
  ["win11-sfc-dism", "APLUS-C2-3.2", "Windows recovery and repair"],
  ["win11-flags-bcdedit", "APLUS-C2-3.2", "Safe mode and boot options"],
  ["win11-boot-repair-decision", "APLUS-C2-3.2"],
  ["win11-get-netadapter", "APLUS-C1-2.1", "IP configuration"],
  ["win11-ipconfig-all", "APLUS-C1-2.1", "IPv4 addressing, gateway, DNS"],
  ["win11-get-physicaldisk", "APLUS-C1-3.5", "Storage health"],
  ["win11-netsh-wlan", "APLUS-C1-2.1", "Wireless networking"],

  // ---- Windows Server / AZ-800 --------------------------------------------
  ["winserver-ad-forests-and-trusts", "AZ800-1.1", "Forest, domain and trust deployment"],
  ["winserver-ad-forests-and-trusts", "AZ800-4.2", "AD-integrated DNS and the Global Catalog"],
  ["winserver-group-policy-troubleshooting", "AZ800-1.3", "Implement and reset Group Policy"],
  ["winserver-install-addfeature", "AZ800-1.1", "Installing the AD DS role"],
  ["winserver-dhcp-scope-create", "AZ800-4.1", "Scopes, options and reservations"],
  ["winserver-dcdiag", "AZ800-4.2", "Diagnosing DNS and domain controller health"],
  ["winserver-get-dnsserverscope", "AZ800-4.2"],
  ["winserver-get-adcomputer", "AZ800-1.2", "Managing computers with PowerShell"],
  ["win11-gpresult", "AZ800-1.3", "Client-side Group Policy result"],
  ["win11-domain-join", "AZ800-1.1", "Joining a computer to the domain"],
  ["win11-net-user", "AZ800-1.2", "Local and domain account administration"],
  ["scn-ad-dns-resolution-failure", "AZ800-4.2", "DNS and DHCP interaction in AD"],
  ["scn-ad-dns-resolution-failure", "AZ800-10.2", "Troubleshooting a Windows Server environment"],
  ["proj-small-office", "AZ800-1.1", "Bringing the whole design together"],

  // ---- RHEL / RHCSA EX200 -------------------------------------------------
  // The exam is 100% hands-on on RHEL 10 with no documentation allowed, so a
  // lot of these are the user's own converted service profiles.
  ["rhel-service-systemd-systemctl", "RHCSA-7.2", "Start, stop, enable and disable services"],
  ["rhel-service-systemd-systemctl", "RHCSA-4.1", "Boot and shut down; targets"],
  ["rhel-service-systemd-systemctl", "RHCSA-7.3", "Boot into a specific target; modify the bootloader"],
  ["rhel-service-systemd-journald", "RHCSA-4.5", "Locate and interpret system journals"],
  ["rhel-service-systemd-journald", "RHCSA-4.5", "Preserve journals so they survive reboot"],
  ["rhel-service-cron-crond", "RHCSA-7.1", "Schedule tasks using cron and systemd timer units"],
  ["rhel-service-chronyd", "RHCSA-7.4", "Configure time service clients"],
  ["rhel-service-autofs", "RHCSA-6.3", "Configure autofs"],
  ["rhel-service-nfs", "RHCSA-6.2", "Mount and unmount network file systems using NFS"],
  ["rhel-service-selinux", "RHCSA-10.4", "Enforcing and permissive modes"],
  ["rhel-service-selinux", "RHCSA-10.5", "File and process context; restorecon"],
  ["rhel-service-selinux", "RHCSA-10.6", "Manage SELinux port labels"],
  ["rhel-service-selinux", "RHCSA-10.7", "Boolean settings"],
  ["rhel-service-firewalld", "RHCSA-10.1", "Configure firewall settings using firewall-cmd"],
  ["rhel-service-firewalld", "RHCSA-8.4", "Restrict network access"],
  ["rhel-service-openssh-sshd", "RHCSA-1.4", "Access remote systems using SSH"],
  ["rhel-service-openssh-sshd", "RHCSA-10.3", "Configure key-based authentication for SSH"],
  ["rhel-service-openssh-sshd", "RHCSA-8.3", "Configure network services to start at boot"],
  ["rhel-service-sssd", "RHCSA-9.1", "User accounts from an identity provider"],
  ["rhel-service-sssd", "RHCSA-9.3", "Groups and group membership"],
  ["rhel-service-auditd", "RHCSA-10", "Security auditing — audit rules and logs"],
  ["rhel-service-rsyslog", "RHCSA-4.5", "Locate and interpret system log files"],
  ["rhel-service-bind-named", "RHCSA-8.2", "Configure hostname resolution"],
  ["rhel-service-dhcp", "RHCSA-8.3", "Configure network services to start at boot"],
  ["rhel-service-apache-httpd", "RHCSA-7.2", "Start and stop services; start automatically at boot"],
  ["rhel-service-samba-smb", "RHCSA-6", "File systems — Samba is assessed indirectly, not by name"],
  ["rhel-service-postgresql", "RHCSA-2", "Installing and running a server package; database packages are not named in EX200"],
  ["rhel-service-podman", "RHCSA-2", "Containers are not a named EX200 objective; package/container management overlap only"],
  ["rhel-service-libvirt-kvm-qemu", "RHCSA-7.2", "Virtualisation is not a named EX200 objective; only service management applies"],

  ["rhel-systemctl-status", "RHCSA-7.2"],
  ["rhel-systemctl-enable-now", "RHCSA-7.2", "enable --now is exactly the 'start now and at boot' pattern the exam wants"],
  ["rhel-journalctl-unit", "RHCSA-4.5", "Interpret system journals"],
  ["rhel-sudo-dnf", "RHCSA-2.3", "Install and update packages from a repository"],
  ["rhel-ss-lntup", "RHCSA-4.6", "Start, stop and check the status of network services"],
  ["rhel-nmcli-connection", "RHCSA-8.1", "Configure IPv4 and IPv6 addresses"],
  ["rhel-firewall-cmd-list", "RHCSA-10.1"],
  ["rhel-getenforce-ausearch", "RHCSA-10.5", "Identify SELinux context"],
  ["rhel-getenforce-ausearch", "RHCSA-10.4"],
  ["linux-dns-resolution", "RHCSA-8.2", "Configure hostname resolution"],
  ["scn-rhel-service-running-not-working", "RHCSA-4.6", "A service can be running and still not working"],
  ["quiz-rhel-basics", "RHCSA-1", "Essential tools"],
  ["quiz-rhel-basics", "RHCSA-4"],

  // ---- Cross-domain -------------------------------------------------------
  ["cisco-show-ip-interface-brief", "CCNA-3.1", "Interface addresses are what the routing table is built from"],
  ["cisco-show-run-interface", "CCNA-2.1", "Port state and switchport configuration"],
  ["cisco-vlan-database", "CCNA-2.1", "Configure and verify VLANs"],
  ["cisco-ping-traceroute", "CCNA-3.1", "Confirming a path and its next hop"],
  ["mikrotik-ip-address-print", "MTCNA-M1.2", "RouterOS CLI principles"],
  ["mikrotik-ip-address-print", "MTCRE-M2", "Point to point addressing"],
  ["quiz-switching", "CCNA-2", "Network Access"],
  ["quiz-windows-basics", "AZ800-10.2", "Windows Server troubleshooting and recovery"],

  ["proj-small-office", "CCNA-4.3", "NAT at the edge"],
  ["linux-vlan-troubleshooting", "CCNA-2.1"],
  ["linux-vlan-troubleshooting", "MTCNA-M3.1", "The same problem on MikroTik"],
];

/* ---------------------------------------------------------------- apply */

const CLEAN = MAP;

const valid = new Set();
for (const ex of objectives.exams) {
  for (const d of ex.domains) valid.add(d.id);
  for (const s of ex.subtopics) valid.add(s.id);
}

const FILES = [
  "data/commands/index.json", "data/commands/cisco.json",
  "data/commands/windows.json", "data/commands/mikrotik.json",
  "data/lessons/index.json", "data/lessons/services.json",
  "data/lessons/networking.json", "data/lessons/windows.json",
  "data/scenarios/index.json", "data/quizzes/index.json",
  "data/projects/index.json",
];

const byId = new Map();
for (const rel of FILES) {
  const full = join(DOCS, rel);
  if (!existsSync(full)) continue;
  const items = JSON.parse(readFileSync(full, "utf8"));
  for (const it of items) byId.set(it.id, { item: it, file: full, rel });
}

let changed = 0;
const unmatched = [];
const unknownObjective = [];
const problems = [];

// Pass 1 — validate the whole mapping before touching anything, so a typo in an
// objective id cannot half-apply and wipe good links.
const byContent = new Map();
for (const [id, obj, note] of CLEAN) {
  if (!byId.has(id)) { unmatched.push(id); continue; }
  if (!valid.has(obj)) { unknownObjective.push(`${id} -> ${obj}`); continue; }
  if (!byContent.has(id)) byContent.set(id, []);
  const list = byContent.get(id);
  if (!list.some((o) => o.id === obj)) list.push(note ? { id: obj, note } : { id: obj });
}

for (const u of unmatched) problems.push(`no content with id "${u}"`);
for (const u of unknownObjective) problems.push(`unknown objective in ${u}`);

if (problems.length) {
  console.error("Mapping problems:\n" + problems.map((p) => "  x " + p).join("\n"));
  process.exit(1);
}

// Pass 2 — the mapping above is the single source of truth. Each item's
// objectives are REBUILT from it rather than appended to, so an objective that
// has been renamed (e.g. WS-AD.1 -> AZ800-1.1) is pruned instead of being left
// behind pointing at an id that no longer exists.
let pruned = 0;
for (const { item } of byId.values()) {
  const want = byContent.get(item.id) || [];
  const before = JSON.stringify(item.objectives || []);
  const after = JSON.stringify(want);
  if (before !== after) changed++;
  if ((item.objectives || []).length > want.length) pruned += (item.objectives || []).length - want.length;
  item.objectives = want;
}

// Write from the MUTATED objects in byId, not from a fresh read of the file —
// re-reading here serialises the original untagged data and silently writes
// nothing back.
if (!DRY) {
  const byFile = new Map();
  for (const { item, file } of byId.values()) {
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push(item);
  }
  let written = 0;
  for (const [file, items] of byFile) {
    const before = readFileSync(file, "utf8");
    const after = JSON.stringify(items, null, 2);
    if (before !== after) {
      writeFileSync(file, after, "utf8");
      written++;
    }
  }
  console.log(`Wrote ${written} data file(s).\n`);
}

// Report coverage per exam, so gaps are visible rather than assumed.
console.log(`Tagged ${changed} item(s)${pruned ? `, pruned ${pruned} stale link(s)` : ""}${DRY ? " (dry run, nothing written)" : ""}.\n`);
for (const ex of objectives.exams) {
  const linked = CLEAN.filter(([, obj]) => {
    const o = ex.domains.find((d) => d.id === obj);
    const s = ex.subtopics.find((t) => t.id === obj);
    return o || s;
  }).length;
  const total = ex.domains.length + ex.subtopics.length;
  console.log(`  ${ex.id.padEnd(16)} ${String(linked).padStart(3)} of ${String(total).padStart(3)} objectives covered  ${ex.verified ? "(verified)" : "(UNVERIFIED)"}`);
}
console.log("\nContent carrying at least one objective: " +
  [...byId.values()].filter((v) => (v.item.objectives || []).length).length + " of " + byId.size);