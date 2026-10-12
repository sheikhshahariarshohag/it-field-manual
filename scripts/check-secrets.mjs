/**
 * check-secrets.mjs — privacy gate.
 *
 * Scans tracked files for anything that identifies this project's owner or
 * leaks a real credential, so "nothing private is published" is a measured
 * claim rather than an assertion. Exits non-zero if anything is found.
 *
 * WHY THIS FILE WAS REWRITTEN 2026-10-12
 * Every pattern here used doubled backslashes. In a regex literal `\\` is an
 * escaped backslash and `.` is "any character", so `\\.` searched for a
 * literal backslash followed by any character. The private-IP check therefore
 * asked for the text `192\X168`, which occurs in no IP address — it could
 * never match. The scanner reported CLEAN on every run for the entire life of
 * the project, including after execution testing wrote a real lab address
 * into the DHCP and NFS profiles. The self-test below now fails loudly if any
 * pattern stops catching the thing it exists to catch.
 *
 * WHAT COUNTS AS A LEAK, AND WHAT COUNTS AS TEACHING MATERIAL
 * Fixing the regex honestly exposed the opposite problem: a broad RFC 1918
 * scan produces ~30 hits, almost all legitimate. 192.168.1.101 in a subnetting
 * lesson and 172.25.250.10 in a sample log transcript are the universal
 * examples — they teach something and identify nobody.
 * What genuinely identifies the owner is the specific VMware NAT subnet the
 * lab VM lives in and the lab account name. Those are what the blocking gate
 * targets. The broad sweep is kept behind --strict for auditing, because a
 * gate that cries wolf is a gate that gets ignored.
 *
 *   node scripts/check-secrets.mjs              gate (blocks on real leaks)
 *   node scripts/check-secrets.mjs --selftest   check the patterns only
 *   node scripts/check-secrets.mjs --strict     also flag all RFC 1918 addresses
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const SELF = "scripts/check-secrets.mjs";
const files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" }).trim().split("\n");

const LAB_SUBNET = "192\\.168\\.174\\.";  // the lab VM's VMware NAT subnet
const LAB_ACCOUNT = "\\bU1\\b";            // the rejected login name in sshd logs

const CHECKS = [
  ["lab subnet address", new RegExp(LAB_SUBNET + "\\d{1,3}", "g")],
  ["lab account name", new RegExp(LAB_ACCOUNT, "g")],
  ["credential assignment", /(?:SSH_PASS|GH_TOKEN|API_KEY|SECRET|PASSWORD|TOKEN)\s*=\s*["'][^"'\s$]{2,}["']/g],
  ["private key block", /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/g],
  // The askpass helper writes a password into a Windows batch file, so this
  // check only applies to those. Applied to every file it produced false
  // positives on ordinary shell code like `&& echo HAVE || echo MISSING`.
  ["askpass writing a value", /echo\s+(?!["']?\$)[^\s"']+\s*\r?\n/g, /\.(cmd|bat)$/i],
];

// Opt-in broad sweep, not part of the gate. These ranges appear constantly in
// networking material; flagging them makes the check useless.
const STRICT_CHECKS = [
  ["RFC 1918 address (strict)", /(?<![\w.\/-])(?:192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2}(?![\w.\/])/g],
];

const STRICT = process.argv.includes("--strict");

/** Each pattern must still match a known-bad sample. */
const SELF_TEST = [
  ["lab subnet address", "192.168.174.133"],
  ["lab subnet address", "192.168.174.1"],
  ["lab account name", "Invalid user U1 from 192.168.174.1"],
  ["credential assignment", 'SSH_PASS="hunter2"'],
  ["credential assignment", 'API_KEY="abcd1234"'],
  ["private key block", "-----BEGIN OPENSSH PRIVATE KEY-----"],
  ["askpass writing a value", "echo hunter2\r\n"],
];

/** And must not match ordinary teaching text, so a too-broad pattern is caught. */
const NEGATIVE_TEST = [
  ["askpass writing a value", 'echo $HOME\n'],
  ["askpass writing a value", 'echo "text"\n'],
  ["lab subnet address", "192.168.1.101"],
  ["lab account name", "U1000"],   // must not trip on a longer token
];

function selfTest() {
  let bad = 0;
  for (const entry of SELF_TEST) {
    const [name, sample, scope] = entry;
    const rx = CHECKS.find(([n]) => n === name)?.[1];
    if (!rx) { console.log(`  no pattern named "${name}"`); bad++; continue; }
    if (scope && !scope.test("x.cmd")) continue;   // scoped checks are tested via the scope
    rx.lastIndex = 0;
    if (!rx.test(sample)) {
      console.log(`  BROKEN: "${name}" does not match its own sample ${JSON.stringify(sample)}`);
      bad++;
    }
  }
  for (const [name, sample] of NEGATIVE_TEST) {
    const rx = CHECKS.find(([n]) => n === name)?.[1];
    rx.lastIndex = 0;
    if (rx.test(sample)) {
      console.log(`  TOO BROAD: "${name}" matches ordinary text ${JSON.stringify(sample)}`);
      bad++;
    }
  }
  if (!bad) {
    console.log(`  self-test: ${SELF_TEST.length} positives caught, ${NEGATIVE_TEST.length} negatives spared`);
  }
  return bad;
}

if (process.argv.includes("--selftest")) process.exit(selfTest() ? 1 : 0);
if (selfTest()) {
  console.error("\n  refusing to report CLEAN: the scanner itself is broken");
  process.exit(2);
}

const active = STRICT ? [...CHECKS, ...STRICT_CHECKS] : CHECKS;
let hits = 0;

for (const f of files) {
  if (f === SELF) continue;             // this file holds the patterns by design
  if (/\.(png|jpg|ico)$/i.test(f)) continue;
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  let text;
  try { text = readFileSync(p, "utf8"); } catch (_) { continue; }
  for (const entry of active) {
    const [name, rx, scope] = entry;
    if (scope && !scope.test(f)) continue;
    rx.lastIndex = 0;
    const m = rx.exec(text);
    if (!m) continue;
    const i = m.index;
    console.log(`  ${name}: ${f}`);
    console.log(`      ...${text.slice(Math.max(0, i - 45), i + m[0].length + 45).replace(/\n/g, "\\n")}...`);
    hits++;
  }
}

if (!hits) {
  console.log(`  CLEAN — no lab address, lab account, credential or key in any tracked file${STRICT ? " (strict)" : ""}`);
} else {
  console.log(`\n  ${hits} potential leak(s) found — review the above`);
  process.exitCode = 1;
}