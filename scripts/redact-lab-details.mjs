/**
 * redact-lab-details.mjs
 *
 * Removes the lab VM's own addressing and account name from tracked files.
 *
 * WHY THIS IS NEEDED
 * `check-secrets.mjs` reported CLEAN for the entire life of the project
 * because its regexes used doubled backslashes and could never match. Once
 * fixed, it immediately found the real address and account name that
 * execution testing had written into the content:
 *
 *   - VERIFICATION_REGISTER.md and the DHCP/NFS fix scripts recorded the
 *     lab VM's address as execution evidence
 *   - docs/data/lessons/services.json used the lab subnet in its worked
 *     Kea example
 *   - docs/data/commands/index.json contained a genuine sshd log excerpt
 *     naming the rejected account and the client address
 *
 * The evidence stays honest — what was observed is preserved in shape, with
 * the identifying parts replaced by clearly-marked placeholders. A reader
 * still sees "UNCONN ... <vm-ip>:67", which is the fact that matters.
 *
 *   node scripts/redact-lab-details.mjs [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DRY = process.argv.includes("--dry-run");

// Ordered: the /24 form first so the CIDR is replaced before a bare address.
const SUBSTITUTIONS = [
  // The lab subnet used as an example range -> a documentation range that is
  // the conventional choice in every RHEL networking guide.
  [/192\.168\.174\.0\/24/g, "192.168.10.0/24"],
  [/192\.168\.174\.133/g, "<vm-ip>"],
  [/192\.168\.174\.1(?!\d)/g, "<client-ip>"],
  // A real rejected account name from an sshd log excerpt.
  [/Invalid user U1 from/g, "Invalid user <lab-user> from"],
  [/\bU1\b(?!\d)/g, "<lab-user>"],
  // Catch-all for any remaining address in the lab subnet that a specific rule
  // above missed — pool ranges, gateway and DNS values inside the worked Kea
  // example, which the /24 and single-address rules do not touch.
  [/192\.168\.174\.(\d{1,3})/g, "192.168.10.$1"],
];

const files = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" })
  .trim().split("\n")
  .filter((f) => /\.(json|md|mjs|js|html|css)$/i.test(f))
  .filter((f) => f !== "scripts/check-secrets.mjs");  // holds the patterns by design

let total = 0;
for (const f of files) {
  const p = join(ROOT, f);
  if (!existsSync(p)) continue;
  const before = readFileSync(p, "utf8");
  let after = before;
  for (const [rx, to] of SUBSTITUTIONS) after = after.replace(rx, to);
  if (after === before) continue;
  if (!DRY) writeFileSync(p, after, "utf8");
  const n = (before.match(/192\.168\.174\.|Invalid user U1|\bU1\b(?!\d)/g) || []).length;
  total += n;
  console.log(`  ${f.padEnd(42)} ${n} replacement(s)`);
}

console.log(DRY ? "\n  (dry run)" : `\n  ${total} replacement(s) total`);