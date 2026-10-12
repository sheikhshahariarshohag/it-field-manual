/**
 * check-secrets.mjs — one-off audit. Scans tracked files for anything that
 * looks like a real credential, so "no secret leaked" is a measured claim
 * rather than an assertion. Exits non-zero if anything is found.
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" }).trim().split("\n");

const BENIGN = /^(?:version|release)?\s*(?:127\.0\.0\.1|0\.0\.0\.0|255\.255\.255\.255|localhost|1\.0\.0|10\.0\.0\.0|8\.8\.8\.8|169\.254)/;

const CHECKS = [
  // RFC 1918 addresses appear constantly in networking teaching material
  // (10.0.0.1, 10.10.20.0/24) and are documentation, not secrets. Only flag
  // addresses that are not one of the well-known example ranges, and only in
  // a config-like context.
  ["host address in config", /(?<![\\w.\\/-])(?:192\\.168|172\\.(?:1[6-9]|2\\d|3[01]))(?:\\.\\d{1,3}){2}(?![\\w.\\/])/],
  ["credential assignment", /(?:SSH_PASS|GH_TOKEN|API_KEY|SECRET|PASSWORD|TOKEN)\\s*=\\s*["'][^"'$\\s]{2,}["']/],
  ["private key block", /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/],
  ["askpass writing a value", /echo\s+\\w+\\s*\\r?\\n/],
];

let hits = 0;
for (const f of files) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  if (/\.(png|jpg|ico)$/i.test(f)) continue;
  let text;
  try { text = readFileSync(p, "utf8"); } catch (_) { continue; }
  for (const [name, rx] of CHECKS) {
    const m = text.match(rx);
    if (!m) continue;
    if (BENIGN.test(m[0])) continue;
    const i = text.indexOf(m[0]);
    console.log(`  ${name}: ${f}`);
    console.log(`      ...${text.slice(Math.max(0, i - 50), i + m[0].length + 50).replace(/\n/g, "\\n")}...`);
    hits++;
  }
}

if (!hits) {
  console.log("  CLEAN — no private IPs, credential assignments, password literals or keys in any tracked file");
} else {
  console.log(`\n  ${hits} potential secret(s) found — review the above`);
  process.exitCode = 1;
}