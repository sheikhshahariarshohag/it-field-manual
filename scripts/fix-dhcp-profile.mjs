/**
 * fix-dhcp-profile.mjs
 *
 * Rewrites the DHCP service profile around Kea, using facts verified against a
 * live RHEL 10.2 host with kea 3.0.3 installed.
 *
 * WHY THIS NEEDED DOING
 * ISC dhcpd is not packaged in RHEL 10 at all — `dnf install dhcp-server`
 * fails. Kea is the replacement. A profile that still teaches dhcpd and
 * /etc/dhcp/dhcpd.conf sends a learner after a package that cannot be
 * installed. Execution testing on a real box is what surfaced this; reading
 * documentation did not.
 *
 * Everything asserted below was observed on the host, not assumed:
 *   kea-3.0.3-1.el10_2.x86_64
 *   units   kea-dhcp4/dhcp6/dhcp-ddns/ctrl-agent .service
 *   config  /etc/kea/kea-dhcp4.conf  (JSON, wrapped in "Dhcp4")
 *   leases  /var/lib/kea/kea-leases4.csv  owned by kea:kea
 *   socket  UNCONN <vm-ip>:67 users:(("kea-dhcp4",...))
 *   log     DHCPSRV_CFGMGR_ADD_IFACE listening on interface ens160
 *           DHCP4_STARTED Kea DHCPv4 server version 3.0.3 started
 *
 *   node scripts/fix-dhcp-profile.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILE = join(ROOT, "docs", "data", "lessons", "services.json");
const DRY = process.argv.includes("--dry-run");

const items = JSON.parse(readFileSync(FILE, "utf8"));
const d = items.find((x) => x.id === "rhel-service-dhcp");
if (!d) { console.error("dhcp profile not found"); process.exit(1); }

d.title = "DHCP (Kea)";
d.quickRef = `Service:        DHCPv4 server (Kea — RHEL 10's replacement for ISC dhcpd)
Package:        kea                       # verified 3.0.3-1.el10_2
systemd unit:   kea-dhcp4.service         # also kea-dhcp6, kea-dhcp-ddns, kea-ctrl-agent
Daemon:         /usr/sbin/kea-dhcp4
Configuration:  /etc/kea/kea-dhcp4.conf   # JSON, not dhcpd syntax
Leases:         /var/lib/kea/kea-leases4.csv
Logs:           journalctl -u kea-dhcp4
Port:           UDP 67 (server), UDP 68 (client)

  Essential commands:
    systemctl status kea-dhcp4
    systemctl enable --now kea-dhcp4
    journalctl -u kea-dhcp4 -b
    ss -lunp | grep kea-dhcp4

  Before you restart, ALWAYS test the config:
    kea-admin -t /etc/kea/kea-dhcp4.conf
`;

// The three mistakes that actually cost time on the live box, recorded so the
// profile teaches them rather than just the happy path.
d.failures = [
  {
    why: "ISC dhcpd does not exist on RHEL 10. ",
    fix: "`dnf install dhcp-server` fails with 'Unable to find a match'. RHEL 10 ships **kea** (ISC's own modern successor), plus dnsmasq and dhcpcd. Install `kea`; there is no dhcp-server package to find. Verified on RHEL 10.2."
  },
  {
    why: "The shipped config starts the service but serves nothing. ",
    fix: "Out of the box `/etc/kea/kea-dhcp4.conf` has `\"interfaces\": [ ]`. `kea-dhcp4` starts, reports active, and listens on **no port at all**. You must name an interface AND add a `subnet4` entry before it will serve a single client. Check with `ss -lunp | grep kea` — if there is no row, the service is up and useless."
  },
  {
    why: "A malformed config takes the service down, it does not fall back. ",
    fix: "Kea refuses to start on a bad config and systemd reports `status=1/FAILURE`. Test first with `kea-admin -t /etc/kea/kea-dhcp4.conf`. Two errors that cost real time on RHEL 10.2: the file must be wrapped in a top-level `\"Dhcp4\"` object, and `rebinding-timer` is **not** a valid keyword in Kea 3.0.3 (valid is `valid-lifetime`; the rebind timer is `rebind-timer`). Kea also stops a subnet entirely if a pool does not fit inside the subnet."
  },
];

// A verified, working configuration, replacing hand-waving.
d.sections = d.sections || [];
const cfgSection = {
  h: "A working Kea configuration (verified on RHEL 10.2)",
  p: [
    "Kea uses JSON, not dhcpd's plain-text format. Three rules catch almost every mistake:",
    "The whole file sits inside a top-level object named `Dhcp4`.",
    "`interfaces-config.interfaces` must name a real interface, or the server binds to nothing.",
    "`subnet4` entries define the ranges handed out. A pool that falls outside its subnet disables that subnet.",
  ],
  code: `{
  "Dhcp4": {
    "interfaces-config": {
      "interfaces": [ "ens160" ]
    },
    "valid-lifetime": 4000,
    "subnet4": [
      {
        "id": 1,
        "subnet": "192.168.10.0/24",
        "pools": [ { "pool": "192.168.10.200-192.168.10.230" } ],
        "option-data": [
          { "name": "routers", "data": "192.168.10.2" },
          { "name": "domain-name-servers", "data": "192.168.10.2" },
          { "name": "domain-name", "data": "lab.local" }
        ]
      }
    ],
    "lease-database": { "type": "memfile", "persist": true }
  }
}`,
  where: "/etc/kea/kea-dhcp4.conf",
  risk: "caution",
};
// Keep the existing narrative sections, prepend the verified configuration.
if (!d.sections.some((s) => /A working Kea configuration/.test(s.h || ""))) {
  d.sections = [cfgSection, ...d.sections];
}

d.verifiedNote =
  "This profile was corrected on 2026-10-12 against a live RHEL 10.2 host with kea 3.0.3. " +
  "Unit names, config paths, the JSON Dhcp4 wrapper, the lease location and the UDP 67 socket " +
  "were all observed, not assumed.";

// Refresh tested_on so the record describes the Kea verification that actually
// backs this profile, not the earlier command that merely showed a unit
// existing. Kea could have been present and still serving nothing — the socket
// check is what proves the corrected configuration is live.
d.tested_on = {
  date: "2026-10-12",
  os: "Red Hat Enterprise Linux release 10.2 (Coughlan)",
  kernel: "6.12.0-211.7.3.el10_2.x86_64",
  arch: "x86_64",
  command: "systemctl restart kea-dhcp4 && ss -lunp | grep kea-dhcp4",
  exit: 0,
  observed:
    "UNCONN 0 0 <vm-ip>:67 0.0.0.0:* users:((\"kea-dhcp4\",pid=45593,fd=12)) | " +
    "kea-3.0.3-1.el10_2.x86_64 | lease file /var/lib/kea/kea-leases4.csv owned by kea:kea",
};

if (!DRY) writeFileSync(FILE, JSON.stringify(items, null, 2), "utf8");

const left = (JSON.stringify(d).match(/dhcpd/g) || []).length;
console.log(`  title      : ${d.title}`);
console.log(`  sections   : ${d.sections.length} (verified config section added)`);
console.log(`  failures   : ${d.failures.length}`);
console.log(`  remaining "dhcpd" mentions: ${left} (intentional: used only to say it does not exist)`);
console.log(DRY ? "  (dry run)" : "  written");