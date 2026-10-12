#!/usr/bin/env node
/**
 * promote-exec-tested.mjs
 *
 * Promotes RHEL entries from `source-checked` to `execution-tested` using real
 * output from a real RHEL 10 host, and rewrites the entries so the recorded
 * output is what the app shows.
 *
 * THE RULES, which exist so this cannot silently become a rubber stamp:
 *
 *  1. Only entries whose tech is `rhel` are eligible. Nothing else was run.
 *  2. Only the FIRST non-comment line of `commands` is executed — the primary
 *     command. A command that does nothing still exits 0, so exit code alone is
 *     not accepted.
 *  3. A promotion requires the command to exit 0 AND produce output that looks
 *     like a real answer. "command not found", "No such file", usage text and
 *     empty output all REJECT the promotion.
 *  4. Anything rejected is reported loudly. Nothing is quietly left behind.
 *  5. The real output is written into the entry's `verify` array, replacing the
 *     placeholder, with the host and date recorded. That is the difference
 *     between execution-tested and source-checked: evidence travels with the
 *     claim.
 *
 *   set SSH_HOST / SSH_USER / SSH_PASS, then:
 *   node scripts/promote-exec-tested.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const ROOT = join(HERE, "..");
const DRY = process.argv.includes("--dry-run");

const HOST = process.env.SSH_HOST, USER = process.env.SSH_USER, PASS = process.env.SSH_PASS;
if (!HOST || !USER || !PASS) { console.error("set SSH_HOST / SSH_USER / SSH_PASS"); process.exit(1); }

const RUN = join(ROOT, "private", "exec-test");
mkdirSync(RUN, { recursive: true });
const HELPER = join(process.env.TEMP, "fm-askpass.cmd");
writeFileSync(HELPER, "@echo off\r\necho " + PASS + "\r\n", "ascii");
process.env.SSH_ASKPASS = HELPER;
process.env.SSH_ASKPASS_REQUIRE = "force";
process.env.DISPLAY = "dummy";
const KH = join(RUN, "known_hosts");

function ssh(cmd, timeoutMs = 25000) {
  try {
    const out = execFileSync("ssh", ["-o", "StrictHostKeyChecking=accept-new", "-o", `UserKnownHostsFile=${KH}`,
      "-o", "ConnectTimeout=10", "-o", "NumberOfPasswordPrompts=1", `${USER}@${HOST}`, cmd],
      { encoding: "utf8", timeout: timeoutMs, windowsHide: true });
    return { code: 0, out: String(out).trim() };
  } catch (e) {
    return { code: e.status ?? -1, out: String((e.stdout || "") + (e.stderr || e.message)).trim() };
  }
}

/** Output that means the command did not actually do the job. */
function isUnhelpful(out, code) {
  if (code !== 0) return "non-zero exit";
  if (!out.trim()) return "no output";
  const t = out.toLowerCase();
  if (/command not found|no such file or directory|not installed|is not a directory|no such device|inactive|failed to|error:/.test(t)) return "looks like an error";
  if (/^usage:|^usage$/.test(t)) return "printed usage";
  return null;
}

/**
 * The command worth executing for an entry.
 *
 * Commands (docs/data/commands/*.json) carry a top-level `commands` string.
 * Lessons — including all 19 service profiles — do NOT: their runnable text
 * lives in `quickRef` (a cheat sheet), in `sections[].code`, and in
 * `lab[].cmd`. The first version of this harness only looked at `commands`,
 * so it silently skipped every service profile and reported "promoted: 0"
 * without explaining why.
 *
 * Order of preference: the explicit commands block, then quickRef, then the
 * first section that actually contains a shell command.
 */
function primaryCommand(it) {
  const lines = (s) => String(s || "").split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (it.commands) {
    const l = lines(typeof it.commands === "string" ? it.commands : it.commands.text);
    if (l.length) return l[0];
  }
  if (it.quickRef) {
    // quickRef is a cheat sheet that mixes runnable commands with prose and
    // "Label: value" rows. A line is only a command if the binary is followed
    // by whitespace and then a flag, argument or subcommand — never a
    // parenthesis or a sentence. Without this test, "chronyd (client mode:
    // ...)" was extracted and handed to bash, which failed on the parenthesis.
    const l = lines(it.quickRef).filter((x) => {
      // Reject metadata rows. The cheat sheets open with lines like
      //   systemd unit:   httpd.service
      //   Package:        httpd
      //   Config:         /etc/httpd/conf/httpd.conf
      // An earlier filter treated "systemd" in the first row as a binary and
      // then probed `command -v systemd unit:` — which of course failed, and
      // every one of the 19 profiles was rejected for "binary not on this host".
      if (/^[A-Za-z][\w .()/-]{0,24}:\s/.test(x)) return false;   // "Label:  value"
      if (/^[a-z][a-z0-9-]*\s*\(/.test(x)) return false;         // prose
      if (/^[A-Z]/.test(x)) return false;
      // A command is a bare binary followed by a flag, subcommand or argument.
      const m = x.match(/^([a-z][a-z0-9-]*)\s+(-{1,2}\S|[a-z0-9./]+)/);
      return !!m;
    });
    if (l.length) return l[0];
  }
  for (const sec of (it.sections || [])) {
    if (!sec.code) continue;
    const l = lines(sec.code);
    // A section's first code line is often an ASCII diagram ("Kernel boot ↓ ...").
    const real = l.find((x) => /^[a-z][a-z0-9-]*\s|^\//.test(x) && x.length > 4);
    if (real) return real;
  }
  return null;
}

/**
 * For a service profile, verify the SERVICE rather than an arbitrary line of
 * its cheat sheet.
 *
 * The cheat sheets list mutating commands early — `systemctl reload X`,
 * `systemctl enable X` — which must not be run by a verification harness, and
 * which fail anyway if the unit is inactive. Each profile's own metadata names
 * its unit ("systemd unit:  httpd.service"), so the honest test is whether that
 * unit is running and what it reports.
 */
function serviceUnitCheck(it) {
  const q = String(it.quickRef || "");
  const m = q.match(/systemd unit:\s*([a-z0-9_.@-]+\.service)/i);
  if (!m) return null;
  const unit = m[1];
  return { cmd: `systemctl status ${unit} --no-pager -n 3`, unit };
}

const FILES = [
  "docs/data/commands/index.json",
  "docs/data/lessons/services.json",
];

const promoted = [];
const rejected = [];

for (const rel of FILES) {
  const full = join(ROOT, rel);
  const items = JSON.parse(readFileSync(full, "utf8"));

  for (const it of items) {
    if (it.tech !== "rhel") continue;
    if (it.verification === "execution-tested" || it.verification === "release-approved") continue;

    const raw = typeof it.commands === "string" ? it.commands : (it.commands || {}).text || "";
    const svc = serviceUnitCheck(it);
    const primary = svc ? svc.cmd : primaryCommand(it);
    if (!primary) { rejected.push([it.id, "no runnable command found"]); continue; }

    // A pre-flight probe only makes sense for a bare command. When the service
    // path is in use the "binary" is systemctl and the real failure will be a
    // non-zero exit, which is already handled below.
    if (!svc) {
      const bin = primary.split(/\s+/)[0].replace(/^\//, "").split("/").pop();
      const probe = ssh(`command -v ${bin} >/dev/null 2>&1 && echo HAVE || echo MISSING`);
      if (!/HAVE/.test(probe.out)) { rejected.push([it.id, "binary not on this host"]); continue; }
    }

    const r = ssh(primary);
    const why = isUnhelpful(r.out, r.code);
    if (why) { rejected.push([it.id, why]); continue; }

    const host = ssh("cat /etc/redhat-release").out;
    const kernel = ssh("uname -r").out;
    const recorded = [
      `$ ${primary}`,
      r.out.split("\n").slice(0, 12).join("\n"),
      "",
      `[executed ${new Date().toISOString().slice(0, 10)} on ${host}, kernel ${kernel}]`,
    ].join("\n");

    it.verification = "execution-tested";
    // The field is named `tested_on` because validate.mjs has always required
    // exactly that for any execution-tested claim — the evidence must travel
    // with the assertion or the claim is refused at build time.
    it.tested_on = {
      date: new Date().toISOString().slice(0, 10),
      os: host,
      kernel,
      arch: ssh("uname -m").out,
      command: primary,
      exit: r.code,
    };
    it.verify = [recorded];
    promoted.push(it.id);
    if (!DRY) writeFileSync(full, JSON.stringify(items, null, 2), "utf8");
  }
}

console.log(`\nPROMOTED to execution-tested: ${promoted.length}`);
for (const id of promoted) console.log("  + " + id);
console.log(`\nNOT promoted: ${rejected.length}`);
for (const [id, why] of rejected) console.log(`  - ${id.padEnd(34)} ${why}`);
console.log(`\n${DRY ? "(dry run - nothing written)" : "written"}`);

try { (await import("node:fs")).unlinkSync(HELPER); } catch (_) {}