#!/usr/bin/env node
/**
 * exec-test.mjs — run the manual's commands against a real RHEL 10 host.
 *
 * WHY
 * Every entry in this manual was marked `source-checked`: the syntax was read
 * from documentation, never executed. That is the single largest honesty gap in
 * the project (KNOWN_LIMITATIONS B1). This script closes it by actually
 * running the commands and recording what came back.
 *
 * WHAT IT DOES NOT DO
 * It does not run anything destructive. Every command is either read-only or
 * explicitly whitelisted as safe-to-run. It does not claim a command is
 * correct because it exited 0 — several commands exit 0 while doing nothing
 * useful, so the output is recorded alongside the exit code and a human (or a
 * later pass) judges it.
 *
 * The password is passed through the environment and the askpass helper lives
 * in the system temp directory. NEITHER is written to the repository.
 *
 *   set SSH_HOST / SSH_USER / SSH_PASS, then:
 *   node scripts/exec-test.mjs [--all] [--only <id>]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ROOT = join(HERE, "..");
const OUT = join(ROOT, "private", "exec-test");
const RESULTS = join(ROOT, "private", "exec-test", "results.json");

const HOST = process.env.SSH_HOST;
const USER = process.env.SSH_USER;
const PASS = process.env.SSH_PASS;

if (!HOST || !USER || !PASS) {
  console.error("set SSH_HOST, SSH_USER and SSH_PASS first — never pass them as arguments, they land in process listings");
  process.exit(1);
}

/* ------------------------------------------------------------------- ssh */

const HELPER = join(process.env.TEMP || process.env.TMPDIR, "fm-askpass.cmd");
writeFileSync(HELPER, "@echo off\r\necho " + PASS + "\r\n", "ascii");
process.env.SSH_ASKPASS = HELPER;
process.env.SSH_ASKPASS_REQUIRE = "force";
process.env.DISPLAY = "dummy";
const KH = join(OUT, "known_hosts");
// ssh refuses to write known_hosts if the directory does not exist.
mkdirSync(OUT, { recursive: true });

function ssh(cmd, timeoutMs = 25000) {
  try {
    return {
      ok: true,
      out: execFileSync("ssh", [
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", `UserKnownHostsFile=${KH}`,
        "-o", "ConnectTimeout=10",
        "-o", "NumberOfPasswordPrompts=1",
        `${USER}@${HOST}`, cmd,
      ], { encoding: "utf8", timeout: timeoutMs, windowsHide: true }).trim(),
    };
  } catch (e) {
    return { ok: false, out: String((e.stdout || "") + (e.stderr || e.message)).trim(), code: e.status };
  }
}

/* -------------------------------------------------------------- the tests */

// Read-only or explicitly safe. Anything destructive is excluded on purpose:
// this is a verification harness, not a change-management tool.
const TESTS = [
  // --- the B6 question, recorded as a test so it cannot regress ------------
  { id: "dnf-version",     cmd: "dnf --version | head -1", expect: /^4\./ },
  { id: "dnf5-absent",     cmd: "command -v dnf5 >/dev/null && echo PRESENT || echo ABSENT", expect: /ABSENT/ },

  // --- commands/index.json : the RHEL command entries ----------------------
  { id: "systemctl-status",   cmd: "systemctl status chronyd --no-pager | head -1" },
  { id: "systemctl-enable-now", cmd: "systemctl is-enabled chronyd" },
  { id: "journalctl-unit",    cmd: "journalctl -u chronyd -n 2 --no-pager" },
  { id: "ss-lntup",           cmd: "ss -lntup | head -4" },
  { id: "nmcli-connection",   cmd: "nmcli -t -f DEVICE,TYPE,STATE con show --active" },
  { id: "firewall-cmd-list",  cmd: "firewall-cmd --list-all | head -3" },
  { id: "getenforce-ausearch", cmd: "getenforce" },
  { id: "getenforce-ausearch2", cmd: "ausearch -m avc -ts recent 2>&1 | tail -3" },

  // --- general RHEL facts the manual asserts ------------------------------
  { id: "os-release",       cmd: "cat /etc/redhat-release", expect: /10\./ },
  { id: "selinux-mode",     cmd: "getenforce", expect: /Enforcing|Permissive|Disabled/ },
  { id: "firewalld-state",  cmd: "firewall-cmd --state" },
  { id: "systemd-version",  cmd: "systemctl --version | head -1" },
  { id: "chrony-installed", cmd: "rpm -q chrony" },
  { id: "podman-installed", cmd: "rpm -q podman" },
  { id: "kernel",           cmd: "uname -r" },
  { id: "filesystems",      cmd: "df -hT /" },
  { id: "block-devices",    cmd: "lsblk -o NAME,SIZE,FSTYPE,MOUNTPOINT" },
  { id: "lvm",              cmd: "vgs 2>&1 | head -3; pvs 2>&1 | head -3" },
  { id: "mount-by-uuid",    cmd: "blkid | head -3" },
  { id: "default-target",   cmd: "systemctl get-default" },
  { id: "bootloader",       cmd: "ls -d /boot/efi 2>/dev/null || echo NO-EFI" },
  { id: "flatpak",          cmd: "command -v flatpak >/dev/null && echo PRESENT || echo ABSENT" },
  { id: "autofs",           cmd: "systemctl is-active autofs 2>&1" },
  { id: "nfs-client",       cmd: "rpm -q nfs-utils 2>&1" },
  { id: "samba",            cmd: "command -v smbclient >/dev/null && echo PRESENT || echo ABSENT" },
  { id: "apache",           cmd: "command -v httpd >/dev/null && echo PRESENT || echo ABSENT" },
  { id: "postgresql",       cmd: "rpm -q postgresql-server 2>&1 | head -1" },
  { id: "ansible",          cmd: "command -v ansible-playbook >/dev/null && ansible-playbook --version | head -1 || echo ABSENT" },
  { id: "rsyslog",          cmd: "rpm -q rsyslog 2>&1" },
  { id: "audit",            cmd: "rpm -q audit 2>&1" },
  { id: "sssd",             cmd: "rpm -q sssd 2>&1" },
  { id: "libvirt",          cmd: "rpm -q libvirt-daemon-kvm 2>&1 | head -1" },
  { id: "named",            cmd: "rpm -q bind 2>&1" },
  { id: "dhcp-server",      cmd: "rpm -q dhcp-server 2>&1" },
];

/* -------------------------------------------------------------------- run */

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const list = only ? TESTS.filter((t) => t.id === only || t.id.startsWith(only)) : TESTS;

console.log(`Execution test against ${USER}@${HOST}\n`);
console.log("  id                          exit  result");
console.log("  " + "-".repeat(58));

const results = [];
let pass = 0, fail = 0, mismatch = 0;

for (const t of list) {
  const r = ssh(t.cmd);
  const first = (r.out.split("\n")[0] || "").slice(0, 40);
  let verdict = "ok";
  if (!r.ok) { verdict = "ERROR"; fail++; }
  else if (t.expect && !t.expect.test(r.out)) { verdict = "UNEXPECTED"; mismatch++; }
  else pass++;

  console.log(
    `  ${t.id.padEnd(28)} ${String(r.ok ? 0 : r.code).padStart(4)}  ${verdict.padEnd(10)} ${first}`
  );

  results.push({
    id: t.id, cmd: t.cmd, exit: r.ok ? 0 : (r.code ?? -1),
    verdict, expect: t.expect ? String(t.expect) : null,
    output: r.out.split("\n").slice(0, 20),
  });
}

console.log("  " + "-".repeat(58));
console.log(`  ${pass} ok · ${mismatch} unexpected · ${fail} error  (of ${list.length})`);

if (!args.includes("--dry-run")) {
  const prior = existsSync(RESULTS) ? JSON.parse(readFileSync(RESULTS, "utf8")) : { runs: [] };
  prior.runs.push({
    at: new Date().toISOString(),
    host: HOST, user: USER,
    os: ssh("cat /etc/redhat-release").out,
    results,
  });
  writeFileSync(RESULTS, JSON.stringify(prior, null, 2), "utf8");
  console.log(`\n  recorded to ${RESULTS}`);
}

try { (await import("node:fs")).unlinkSync(HELPER); } catch (_) {}