#!/usr/bin/env node
/**
 * tag-knowledge-map.mjs — attach hand-written metadata to the Knowledge Map.
 *
 * WHY THIS IS A SCRIPT AND NOT JUST EDITED JSON
 * docs/data/knowledge-map.json is MECHANICALLY extracted from the user's PDF
 * (146 sessions, 10 layers). Regenerating it must not destroy hand-written
 * material, so the structure and the prose live apart: the extractor owns the
 * shape, this script owns the summaries and the backlinks. Running the
 * extractor again is safe.
 *
 * Each entry is:
 *   [sessionNumber, one-line summary, [contentIds this session maps to]]
 *
 * The contentIds are the ONLY connection to the rest of the manual. A session
 * with no ids is honestly shown as "not covered in the manual yet" rather than
 * being padded with a link to something tangentially related.
 *
 *   node scripts/tag-knowledge-map.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ROOT = join(HERE, "..");
const KM = join(ROOT, "docs", "data", "knowledge-map.json");
const DRY = process.argv.includes("--dry-run");

if (!existsSync(KM)) {
  console.error("docs/data/knowledge-map.json is missing. Run extract-knowledge-map.mjs first.");
  process.exit(1);
}

const MAP = [
  /* ================================================ Layer 1 - Hardware (1-9) */
  [1,   "What a CPU actually is: cores, threads, clock speed, cache, and why 'GHz' is not a performance score.", []],
  [2,   "RAM: modules, channels, ECC vs non-ECC, speeds, and how virtual memory swaps to disk.", []],
  [3,   "Disks and storage tiers: HDD vs SSD vs NVMe, SMART health, RAID levels, and partitioning.", ["aplus-disk-management", "win11-get-physicaldisk"]],
  [4,   "The motherboard: chipset, buses, slots, POST codes, and what each diagnostic beep means.", ["aplus-reading-post-codes"]],
  [5,   "Power supplies and power delivery: wattage, efficiency, transient spikes, and UPS sizing.", []],
  [6,   "Firmware: BIOS vs UEFI, Secure Boot, TPM, and flashing risk.", []],
  [7,   "Virtualisation concepts, hypervisors, Type 1 vs Type 2, and VM resource overhead.", ["rhel-service-libvirt-kvm-qemu"]],
  [8,   "The full cold-boot sequence from power-on to a login prompt, and where it can break.", ["aplus-post-boot-sequence", "win11-flags-bcdedit"]],
  [9,   "A disciplined hardware troubleshooting process: identify, theorise, test, verify.", ["aplus-reading-post-codes", "aplus-chkdsk-sfc"]],

  /* ================================================ Layer 2 - OS (10-24) */
  [10,  "Windows as an operating system: editions, features, registry, and the shell.", ["win11-boot-repair-decision", "win11-sfc-dism", "quiz-windows-basics"]],
  [11,  "Linux as an operating system: distributions, the filesystem layout, and package managers.", ["quiz-rhel-basics"]],
  [12,  "The kernel: system calls, modules, and what runs in ring 0 versus user space.", []],
  [13,  "Processes: creating, inspecting, signalling and terminating them.", ["rhel-ss-lntup"]],
  [14,  "Threads and concurrency: scheduling, contention, and why a thread can starve.", []],
  [15,  "Memory management: virtual memory, paging, swapping, and OOM behaviour.", []],
  [16,  "Drivers: the kernel interface, the driver store, and why signed drivers matter.", []],
  [17,  "Services and init systems, and how they differ between Windows and Linux.", ["rhel-service-systemd-systemctl", "rhel-systemctl-status", "rhel-systemctl-enable-now", "rhel-service-cron-crond", "scn-rhel-service-running-not-working"]],
  [18,  "Operating-system level logging: Windows event logs, syslog and journald.", ["rhel-service-rsyslog", "rhel-service-systemd-journald", "rhel-journalctl-unit"]],
  [19,  "File systems: NTFS, ext4, XFS and their journaling behaviour.", ["rhel-service-nfs", "rhel-service-samba-smb", "rhel-service-autofs"]],
  [20,  "Permissions and ownership: ugo/rwx, ACLs, and diagnosing permission problems.", []],
  [21,  "Users: local accounts, password aging, and service accounts.", ["rhel-service-sssd", "win11-net-user"]],
  [22,  "Groups, memberships, and the difference between primary and supplementary groups.", ["rhel-service-sssd"]],
  [23,  "Package management: RPM and dnf, repositories, and what Flatpak changes in RHEL 10.", ["rhel-sudo-dnf"]],
  [24,  "The networking stack: sockets, the port table, and which services listen by default.", ["rhel-ss-lntup", "rhel-nmcli-connection", "rhel-service-openssh-sshd"]],

  /* ============================================== Layer 3 - Networking (25-50) */
  [25,  "The OSI model, what each layer actually does, and where real devices sit.", []],
  [26,  "The TCP/IP model and how it maps onto OSI. Encapsulation and headers.", []],
  [27,  "Ethernet: frames, MAC addresses, switches and how a switch learns.", ["ccna-switch-learns-mac", "cisco-show-mac-address-table"]],
  [28,  "Switching: frame forwarding, VLANs, and the switchport lifecycle.", ["ccna-switch-learns-mac", "cisco-show-interfaces-switchport", "cisco-vlan-database", "cisco-show-run-interface", "cisco-interface-no-shutdown", "quiz-switching"]],
  [29,  "Routing: longest-prefix match, administrative distance, metric, next hop.", ["ccna-longest-prefix-match", "cisco-show-ip-route", "cisco-ip-route", "cisco-show-ip-interface-brief", "mikrotik-ip-route-print"]],
  [30,  "Subnetting that survives contact with a real network, including IPv4 exhaustion.", ["ccna-subnetting-that-sticks"]],
  [31,  "IPv4 addressing, subnet masks, private ranges, and special addresses.", ["win11-ipconfig-all", "win11-get-netadapter", "mikrotik-ip-address-print"]],
  [32,  "IPv6: addressing, compression, and transition mechanisms.", []],
  [33,  "VLANs: why they exist, 802.1Q tagging, and trunking.", ["linux-vlan-troubleshooting", "mikrotik-bridge-broadcast-domains", "mikrotik-bridge-port-print"]],
  [34,  "Spanning Tree Protocol: why loops are catastrophic, and the states that prevent them.", ["cisco-show-spanning-tree"]],
  [35,  "Link aggregation: LACP, bonding, and hashing rules that surprise people.", []],
  [36,  "Dynamic routing protocols: distance vector vs link state, and when to use each.", []],
  [37,  "NAT and PAT: how translation breaks return traffic, and how it is undone.", ["mikrotik-ip-firewall-nat", "proj-small-office"]],
  [38,  "Access control lists: standard vs extended, and why rule order decides everything.", ["cisco-ip-access-list"]],
  [39,  "DNS: records, resolvers, caching, and how name resolution fails.", ["linux-dns-resolution", "scn-ad-dns-resolution-failure"]],
  [40,  "DHCP: the DORA exchange, scopes, options, reservations, and lease failure modes.", ["mikrotik-ip-dhcp-server-network", "rhel-service-dhcp", "winserver-dhcp-scope-create", "scn-dhcp-client-no-lease"]],
  [41,  "ARP: building the L2-to-L3 map, and why a wrong ARP cache is so hard to see.", []],
  [42,  "ICMP: ping, traceroute, and what each reply type actually tells you.", ["cisco-ping-traceroute"]],
  [43,  "TCP: the three-way handshake, sequence numbers, and what a SYN flood is.", []],
  [44,  "UDP: connectionless, and why DNS and DHCP both depend on it.", []],
  [45,  "VPN fundamentals: tunnels, encapsulation and the trust boundary.", []],
  [46,  "IPSec: transport vs tunnel mode, and the two phases that negotiate security.", []],
  [47,  "SSL/TLS: the handshake, certificate chain validation, and why padlocks are not proof.", []],
  [48,  "Load balancing: algorithms, health checks, and where sessions stick.", []],
  [49,  "Quality of Service: classification, marking, queuing and shaping.", []],
  [50,  "Wireless: channels, interference, and how 802.11 differs from Ethernet.", ["win11-netsh-wlan"]],

  /* ================================================ Layer 4 - Identity (51-66) */
  [51,  "Directory services: what a directory is, and why nearly everything binds to one.", []],
  [52,  "Active Directory: the forest, domain, DC and Global Catalog, and how a client finds them.", ["winserver-ad-forests-and-trusts", "winserver-install-addfeature", "win11-domain-join"]],
  [53,  "LDAP: the protocol under AD, bind types, and how to query it.", ["winserver-get-adcomputer"]],
  [54,  "Kerberos: tickets, the KDC, and why time skew breaks authentication.", []],
  [55,  "NTLM: the older protocol, its weaknesses, and how it still appears in mixed networks.", []],
  [56,  "How AD DNS actually works: SRV records, the _msdcs zones, and why DNS breaks join first.", ["winserver-dcdiag", "winserver-get-dnsserverscope", "scn-ad-dns-resolution-failure"]],
  [57,  "Trusts: one-way, two-way, transitive, and the security cost of each.", ["winserver-ad-forests-and-trusts"]],
  [58,  "Forests, domains and the Global Catalog as the price of scale.", ["winserver-ad-forests-and-trusts"]],
  [59,  "Domains, OUs, and structuring an object model that survives staff turnover.", ["win11-domain-join"]],
  [60,  "Group Policy: scopes, security filtering, and the order settings apply in.", ["winserver-group-policy-troubleshooting", "win11-gpresult"]],
  [61,  "PKI: what a certificate authority is for and how trust anchors work.", []],
  [62,  "Certificates: issuing, renewal, and the expiry outage nobody planned for.", []],
  [63,  "Federation and ADFS: joining two identity worlds without duplicating passwords.", []],
  [64,  "Single sign-on: the promise, the trade-offs, and where it breaks.", []],
  [65,  "Multi-factor authentication: factors, fatigue attacks, and recovery paths.", []],
  [66,  "Identity governance: joiners, movers and leavers as a security control.", []],

  /* ========================================= Layer 5 - Enterprise Services (67-82) */
  [67,  "Enterprise DNS design: zones, delegation, forwarders and caching.", ["rhel-service-bind-named", "linux-dns-resolution"]],
  [68,  "Deploying DHCP at enterprise scale: scopes, reservations, failover and relay.", ["rhel-service-dhcp", "winserver-dhcp-scope-create"]],
  [69,  "Time synchronisation: NTP/chrony, and why unsynchronised clocks cause outages.", ["rhel-service-chronyd"]],
  [70,  "File services: shares, permissions, quotas, and the NTFS vs share distinction.", ["rhel-service-samba-smb"]],
  [71,  "Print services: queues, drivers, and why printing breaks on every migration.", []],
  [72,  "Application servers: deployment, runtime, and service management.", []],
  [73,  "Database servers: installing, initialising and securing a database service.", ["rhel-service-postgresql"]],
  [74,  "Web servers: Apache httpd, virtual hosts, TLS termination.", ["rhel-service-apache-httpd"]],
  [75,  "Reverse proxies: TLS offload, header rewriting, and health checks.", []],
  [76,  "Forward proxies: filtering, caching, and egress control.", []],
  [77,  "Storage: SAN vs NAS, iSCSI, NFS, and the trade-offs.", ["rhel-service-nfs"]],
  [78,  "Backup: full, incremental and differential, and why backup is not restore.", ["mikrotik-system-backup-save"]],
  [79,  "High availability: failover clustering, load balancing, and quorum.", []],
  [80,  "Disaster recovery: RPO, RTO, and designing for the day it all fails.", []],
  [81,  "Monitoring: what to watch, alert thresholds, and alert fatigue.", ["mikrotik-system-resource-print"]],
  [82,  "Centralised logging: shipping, retention, and reading logs under pressure.", ["rhel-service-rsyslog"]],

  /* ================================================ Layer 6 - Security (83-103) */
  [83,  "The CIA triad and how each property fails in a real incident.", []],
  [84,  "Authentication, authorisation and accounting, and where MFA fits.", []],
  [85,  "Least privilege: granting the minimum, and auditing what was granted.", []],
  [86,  "Defence in depth: layers that must fail independently.", []],
  [87,  "Zero trust: never trust, always verify, and what it costs to retrofit.", []],
  [88,  "Firewalls: stateful inspection, zones, and rules that quietly block you out.", ["rhel-service-firewalld", "rhel-firewall-cmd-list", "mikrotik-firewall-chains", "mikrotik-ip-firewall-filter"]],
  [89,  "Intrusion detection: signatures, anomalies, and false positives.", []],
  [90,  "Intrusion prevention: blocking in-line and the cost of a wrong block.", []],
  [91,  "Endpoint detection and response: telemetry, containment, forensics.", []],
  [92,  "SIEM: collecting security events and making them actionable.", []],
  [93,  "SOAR: automating response and the risk of automating the wrong thing.", []],
  [94,  "Threat intelligence: using it without being overwhelmed by it.", []],
  [95,  "Threat hunting: hypotheses, queries, and proving a negative.", []],
  [96,  "Hardening: baselines, CIS guidance, and the cost of locking yourself out.", ["rhel-service-selinux", "rhel-getenforce-ausearch"]],
  [97,  "Vulnerability management: finding, prioritising, and actually fixing.", []],
  [98,  "Patch management: cadence, reboots, and the services that break on update.", []],
  [99,  "Security logging: what to record so an investigation is possible later.", ["rhel-service-auditd"]],
  [100, "Incident response: preparation, containment, eradication, recovery.", []],
  [101, "Forensics: preserving evidence, and the order you must work in.", []],
  [102, "Security monitoring: dashboards that answer a question, not collect a metric.", []],
  [103, "MITRE ATT&CK mapping: describing behaviour instead of products.", []],

  /* ============================================= Layer 7 - Automation (104-113) */
  [104, "PowerShell: objects, pipelines, remoting, and why text output is not enough.", []],
  [105,  "Bash: variables, redirection, pipelines, and writing scripts you can trust.", []],
  [106, "Python for administration: automating the boring parts safely.", []],
  [107, "Git: commits, branches, merges, and using it as an audit trail.", []],
  [108, "REST APIs: methods, status codes, idempotency, and authentication.", []],
  [109, "Infrastructure as Code: declarative vs imperative, and state drift.", []],
  [110, "Configuration management: Ansible, idempotence, and push vs pull.", ["cisco-copy-running-config"]],
  [111, "CI/CD: pipelines, gates, and the difference between building and deploying.", []],
  [112, "Secrets management: why config files leak credentials, and what to do instead.", []],
  [113, "Automation pipelines: orchestration, dependencies and failure handling.", []],

  /* ============================== Layer 8 - Containers & Observability (114-122) */
  [114, "Docker: images, containers, layers, and why builds are not deployments.", ["rhel-service-podman"]],
  [115, "Container networking: bridge vs host, port publishing, and DNS between containers.", []],
  [116, "Container storage: volumes, bind mounts, and persistence across restarts.", []],
  [117, "Container security: capabilities, namespaces, and rootless containers.", []],
  [118, "Image lifecycle: tagging, registries, and immutable tags vs latest.", []],
  [119, "Kubernetes: control plane, scheduling, and the objects you actually manage.", []],
  [120, "Helm: templating, values, and the cost of hiding complexity in charts.", []],
  [121, "Service mesh: sidecars, mTLS, and traffic policy.", []],
  [122, "Observability: metrics, logs and traces, and how they answer different questions.", []],

  /* ==================================================== Layer 9 - Cloud (123-135) */
  [123, "Cloud IAM: identities, roles, policies, and least privilege at scale.", []],
  [124, "VPCs: subnets, route tables, and why the default is not always safe.", []],
  [125, "Cloud networking: gateways, peering, and hybrid connectivity.", []],
  [126, "Cloud storage: object vs block, access tiers, and lifecycle rules.", []],
  [127, "Cloud compute: instances, images, scaling groups and instance types.", []],
  [128, "Cloud databases: managed instances, replicas, and the shared-responsibility trap.", []],
  [129, "Cloud identity: federation with on-premises directories.", []],
  [130, "Cloud logging: centralised retention, and the egress bill that follows.", []],
  [131, "Cloud security: the shared responsibility model, precisely.", []],
  [132, "Cloud monitoring: metrics, alerting, and cost visibility.", []],
  [133, "Serverless: functions, cold starts, and the limits that make them unsuitable.", []],
  [134, "Cloud containers: managed Kubernetes and the differences that matter.", []],
  [135, "Cloud automation: policy as code and drift detection.", []],

  /* ============================ Layer 10 - Architecture & Governance (136-146) */
  [136, "Enterprise design: making choices that stay defensible for years.", []],
  [137, "Scalability: vertical vs horizontal, and where bottlenecks actually appear.", []],
  [138, "Reliability: failure domains, MTBF/MTTR, and designing for graceful failure.", []],
  [139, "Performance: latency, throughput, queues, and measuring before optimising.", []],
  [140, "Security architecture: where controls belong and how they are evidenced.", []],
  [141, "Compliance: frameworks, evidence collection, and the cost of assurance.", []],
  [142, "Business continuity: BIA, recovery objectives, and testing that counts.", []],
  [143, "Cost optimisation: knowing what things cost before you build them.", []],
  [144, "Documentation: runbooks, architecture decision records, and keeping them true.", []],
  [145, "Change management: CABs, risk assessment, and emergency changes.", []],
  [146, "Governance: policy, ownership, review cycles, and enforcement that works.", []],
];

/* ------------------------------------------------------------- apply */

const doc = JSON.parse(readFileSync(KM, "utf8"));
const byN = new Map(doc.sessions.map((s) => [s.n, s]));

const problems = [];
for (const [n] of MAP) if (!byN.has(n)) problems.push(`session ${n} is not in the extracted outline`);

const dupes = MAP.map((m) => m[0]).filter((n, i, a) => a.indexOf(n) !== i);
for (const n of new Set(dupes)) problems.push(`session ${n} appears twice in this map`);

const missing = [...byN.keys()].filter((n) => !MAP.some((m) => m[0] === n));
for (const n of missing) problems.push(`session ${n} has no summary in this map`);

if (problems.length) {
  console.error("Mapping problems:\n" + problems.map((p) => "  x " + p).join("\n"));
  process.exit(1);
}

// Verify every contentId resolves to a real document, so no dead links ship.
const DOCS = join(ROOT, "docs");
const FILES = [
  "data/commands/index.json", "data/commands/cisco.json",
  "data/commands/windows.json", "data/commands/mikrotik.json",
  "data/lessons/index.json", "data/lessons/services.json",
  "data/lessons/networking.json", "data/lessons/windows.json",
  "data/scenarios/index.json", "data/quizzes/index.json", "data/projects/index.json",
];
const known = new Set();
for (const rel of FILES) {
  const p = join(DOCS, rel);
  if (!existsSync(p)) continue;
  for (const it of JSON.parse(readFileSync(p, "utf8"))) known.add(it.id);
}
const badLinks = [];
for (const [n, , ids] of MAP) {
  for (const id of ids) {
    if (!known.has(id)) badLinks.push(`session ${n} -> "${id}" does not exist in the manual`);
  }
}
if (badLinks.length) {
  console.error("Dead backlinks:\n" + badLinks.map((b) => "  x " + b).join("\n"));
  process.exit(1);
}

let changed = 0;
for (const [n, summary, ids] of MAP) {
  const s = byN.get(n);
  const want = { summary, manual: ids };
  if (JSON.stringify({ summary: s.summary, manual: s.manual }) !== JSON.stringify(want)) changed++;
  s.summary = summary;
  s.manual = ids;
}

if (!DRY) writeFileSync(KM, JSON.stringify(doc, null, 2), "utf8");

/* ------------------------------------------------------------- report */

const linked = doc.sessions.filter((s) => s.manual && s.manual.length);
console.log(`Updated ${changed} session(s)${DRY ? " (dry run)" : ""}.\n`);
for (const l of doc.layers) {
  const inLayer = doc.sessions.filter((s) => s.layer === l.n);
  const withLinks = inLayer.filter((s) => s.manual && s.manual.length).length;
  const bar = "#".repeat(Math.round((withLinks / inLayer.length) * 20)).padEnd(20, ".");
  console.log(
    `  L${String(l.n).padStart(2)} ${l.name.padEnd(28)} ` +
    `${String(withLinks).padStart(2)}/${String(inLayer.length).padStart(2)} linked  ${bar}`
  );
}
console.log(`\nSessions with at least one link into the manual: ${linked.length} of ${doc.sessions.length}`);
const manual = new Set();
for (const s of linked) for (const id of s.manual) manual.add(id);
console.log(`Distinct manual items referenced: ${manual.size} of ${known.size}`);
const unreferenced = [...known].filter((id) => !manual.has(id));
if (unreferenced.length) console.log(`Not yet linked from the map (${unreferenced.length}): ${unreferenced.join(", ")}`);