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

  // ---- Windows Server -----------------------------------------------------
  ["winserver-ad-forests-and-trusts", "WS-AD.1"],
  ["winserver-ad-forests-and-trusts", "WS-NET.2", "AD-integrated DNS and the Global Catalog"],
  ["winserver-group-policy-troubleshooting", "WS-AD.3"],
  ["winserver-install-addfeature", "WS-AD.1", "AD DS role installation"],
  ["winserver-dhcp-scope-create", "WS-NET.1"],
  ["winserver-dcdiag", "WS-NET.2"],
  ["winserver-get-dnsserverscope", "WS-NET.2"],
  ["win11-get-netadapter", "WS-NET.1"],
  ["win11-gpresult", "WS-AD.3"],
  ["winserver-get-adcomputer", "WS-AD.2"],
  ["win11-domain-join", "WS-AD.1", "Client domain join"],
  ["scn-ad-dns-resolution-failure", "WS-NET.2", "DNS and DHCP interaction in AD"],

  // ---- RHEL (RHCSA — objective list is UNVERIFIED, see the json) -----------
  ["rhel-systemctl-status", "RHCSA-7.1"],
  ["rhel-systemctl-enable-now", "RHCSA-7.1"],
  ["rhel-journalctl-unit", "RHCSA-6.1", "systemd and journald"],
  ["rhel-sudo-dnf", "RHCSA-8.1"],
  ["rhel-ss-lntup", "RHCSA-5.1", "Checking listening services"],
  ["rhel-nmcli-connection", "RHCSA-5.1"],
  ["rhel-firewall-cmd-list", "RHCSA-2", "Basic security tasks"],
  ["rhel-getenforce-ausearch", "RHCSA-6.2", "SELinux"],
  ["linux-dns-resolution", "RHCSA-5.1", "Name resolution"],
  ["rhel-service-systemd-systemctl", "RHCSA-7.1"],
  ["rhel-service-firewalld", "RHCSA-2"],
  ["rhel-service-selinux", "RHCSA-6.2"],
  ["rhel-service-sshd" /* placeholder replaced below */, "RHCSA-2"],

  // ---- Cross-domain -------------------------------------------------------
  ["proj-small-office", "WS-AD.1", "Bringing the whole design together"],
  ["proj-small-office", "CCNA-4.3", "NAT at the edge"],
  ["linux-vlan-troubleshooting", "CCNA-2.1"],
];

/* ---------------------------------------------------------------- apply */

// Remove a placeholder used above to keep the list readable.
const CLEAN = MAP.filter(([id]) => id !== "rhel-service-sshd");

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

for (const [id, obj, note] of CLEAN) {
  if (!byId.has(id)) { unmatched.push(id); continue; }
  if (!valid.has(obj)) { unknownObjective.push(`${id} -> ${obj}`); continue; }
  const { item } = byId.get(id);
  item.objectives = item.objectives || [];
  const entry = { id: obj };
  if (note) entry.note = note;
  if (!item.objectives.some((o) => o.id === obj)) {
    item.objectives.push(entry);
    changed++;
  }
}

for (const u of unmatched) problems.push(`no content with id "${u}"`);
for (const u of unknownObjective) problems.push(`unknown objective in ${u}`);

if (problems.length) {
  console.error("Mapping problems:\n" + problems.map((p) => "  x " + p).join("\n"));
  process.exit(1);
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
console.log(`Tagged ${changed} objective link(s)${DRY ? " (dry run, nothing written)" : ""}.\n`);
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