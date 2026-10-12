/**
 * label-nfs-failures.mjs
 *
 * The NFS profile carried six failures entries all labelled "Common mistake."
 * with genuinely different bodies underneath. The label told a reader nothing,
 * so each now gets a descriptive one derived from its own fix text.
 *
 * Nothing is added or removed - only the six placeholder labels are replaced,
 * and only where the entry still carries the original placeholder.
 *
 *   node scripts/label-nfs-failures.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILE = join(ROOT, "docs", "data", "lessons", "services.json");
const DRY = process.argv.includes("--dry-run");

const items = JSON.parse(readFileSync(FILE, "utf8"));
const d = items.find((x) => x.id === "rhel-service-nfs");

// Matched by a distinctive phrase in the body, so this cannot clobber an entry
// that has already been relabelled or that was written some other way.
const LABELS = [
  ["no_root_squash` without a specific", "🔴 Using `no_root_squash` without a reason. "],
  ["Forgetting `exportfs -ra`", "🟡 Forgetting `exportfs -ra` after editing /etc/exports. "],
  ["Mismatched UID/GID mapping", "🟡 Mismatched UID/GID between server and clients. "],
  ["Exporting to an overly broad subnet", "🟡 Exporting to too broad a range. "],
  ["Assuming NFS traffic is encrypted", "🟡 Assuming NFS traffic is encrypted. "],
  ["Forgetting SELinux booleans", "🟠 Forgetting SELinux booleans for NFS content. "],
];

let changed = 0;
for (const f of d.failures) {
  if (!/^Common mistake\.$/.test(f.why || "")) continue;
  const hit = LABELS.find(([needle]) => f.fix.includes(needle));
  if (!hit) continue;
  f.why = hit[1];
  changed++;
}

if (!DRY) writeFileSync(FILE, JSON.stringify(items, null, 2), "utf8");

console.log(`  relabelled: ${changed}`);
for (const f of d.failures) console.log(`    ${f.why}`);
console.log(DRY ? "  (dry run)" : "  written");