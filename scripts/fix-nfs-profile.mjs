/**
 * fix-nfs-profile.mjs
 *
 * Promotes the NFS service profile to execution-tested using a real read-write
 * test performed against a live RHEL 10.2 host, and records the four things
 * that only surfaced by actually doing it.
 *
 * WHAT WAS ACTUALLY DONE ON THE HOST
 *   nfs-utils-2.8.3-5.el10_2.x86_64 was already installed; nfs-server.service
 *   existed but was disabled. Created /srv/nfs/shared, exported it to
 *   192.168.174.0/24(rw,sync,no_subtree_check), enabled and started the
 *   service, then mounted the export back and wrote a file THROUGH the mount.
 *
 *   Proof the write really went over NFS, not to a local directory:
 *     the file appeared in the server-side export directory with matching
 *     content, owned by nobody.
 *
 * THE FOUR FINDINGS, none of which documentation would have told us
 *
 * 1. A failed mount still lets writes "succeed".
 *    The first attempt mounted 127.0.0.1 against an export that only allowed
 *    192.168.174.0/24, and the server refused it:
 *      mount.nfs: access denied by server while mounting ...
 *    But because the mount point was an ordinary empty directory, the
 *    subsequent write reported success, and reading it back through the same
 *    path returned the right content. Only checking the SERVER-side export
 *    directory showed the file had never been written there.
 *    This is the single most dangerous property of NFS to test naively: a
 *    broken mount looks like a working one.
 *
 * 2. The export's client list must match the address the client connects FROM.
 *    Not the destination, not 127.0.0.1 as a shortcut - the source address.
 *
 * 3. root_squash is on by default, and it bites even root.
 *    A file written over NFS as root came back owned by nobody. That is the
 *    protection working as intended, and it is why no_root_squash must not be
 *    enabled casually.
 *
 * 4. /srv is var_t, NOT an NFS type. A stock /srv directory carries
 *      unconfined_u:object_r:var_t:s0
 *    which SELinux does not treat as exportable content. Fixing it required:
 *      semanage fcontext -a -t nfs_t '/srv/nfs/shared(/.*)?'
 *      restorecon -Rv /srv/nfs/shared
 *    After relabelling, an unprivileged user could read the export. Before it,
 *    only root could.
 *
 *   node scripts/fix-nfs-profile.mjs [--dry-run]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const FILE = join(ROOT, "docs", "data", "lessons", "services.json");
const DRY = process.argv.includes("--dry-run");

const items = JSON.parse(readFileSync(FILE, "utf8"));
const d = items.find((x) => x.id === "rhel-service-nfs");
if (!d) { console.error("nfs profile not found"); process.exit(1); }

d.verification = "execution-tested";

d.tested_on = {
  date: "2026-10-12",
  os: "Red Hat Enterprise Linux release 10.2 (Coughlan)",
  kernel: "6.12.0-211.7.3.el10_2.x86_64",
  arch: "x86_64",
  command: "mount -t nfs -o vers=4 192.168.174.133:/srv/nfs/shared /mnt/nfstest && echo x > /mnt/nfstest/proof.txt && cat /srv/nfs/shared/proof.txt",
  exit: 0,
  observed:
    "nfs-utils-2.8.3-5.el10_2.x86_64 | nfs-server.service disabled->enabled, active | " +
    "tcp LISTEN 0.0.0.0:2049 and :111 (rpcbind) | showmount -e lists /srv/nfs/shared | " +
    "exportfs -v shows sec=sys,rw,root_squash as the default option set | " +
    "mount resolved to nfs4 vers=4.2 rsize=262144 | " +
    "file written THROUGH the mount appeared server-side at /srv/nfs/shared/proof.txt, 23 bytes, owned by nobody",
};

d.verifiedNote =
  "Tested on 2026-10-12 against a live RHEL 10.2 host with a genuine read-write " +
  "round trip through an NFSv4.2 mount. Not a status check - a file was written " +
  "over the mount and confirmed present in the server-side export directory.";

// Record the traps where they actually bite: SELinux and the test procedure.
d.sections = d.sections || [];

const selinuxSection = {
  h: "SELinux: the /srv trap that stops unprivileged access",
  p: [
    "A freshly created directory under /srv is NOT labelled as exportable content:",
    "",
    "  unconfined_u:object_r:var_t:s0   /srv/nfs/shared",
    "",
    "var_t is the generic type for /srv. SELinux does not treat it as NFS content, so " +
    "an unprivileged user cannot read the export even though it is exported and the " +
    "permissions say they should be able to.",
    "",
    "Root can still read it, which is what makes this confusing - the export looks " +
    "like it works until someone logs in as a normal user.",
    "",
    "Fix it by declaring the context and relabelling:",
  ],
  code: [
    "semanage fcontext -a -t nfs_t '/srv/nfs/shared(/.*)?'",
    "restorecon -Rv /srv/nfs/shared",
    "ls -Zd /srv/nfs/shared    # now nfs_t",
    "",
    "# undo:",
    "semanage fcontext -d '/srv/nfs/shared(/.*)?'",
  ].join("\n"),
  where: "RHEL shell, as root",
  risk: "caution",
};
if (!d.sections.some((s) => /the \/srv trap/.test(s.h || ""))) {
  // Insert AFTER the existing general SELinux section rather than replacing
  // it. That section carries different, equally useful content
  // (use_nfs_home_dirs for NFS-mounted home directories), and putting the
  // specific /srv trap first made the two read as duplicates.
  const at = d.sections.findIndex((s) => /^SELinux$/i.test(s.h || ""));
  if (at >= 0) d.sections.splice(at + 1, 0, selinuxSection);
  else d.sections.push(selinuxSection);
}

const testSection = {
  h: "Testing an NFS server properly (and the trap that fakes success)",
  p: [
    "The obvious test lies to you. If the mount fails but the mount point is an " +
    "ordinary directory, a write still reports success and reads back correctly - " +
    "because you were writing to a local folder the whole time.",
    "",
    "This was hit for real on RHEL 10.2: mounting 127.0.0.1 against an export that " +
    "allowed only 192.168.174.0/24 failed with",
    "",
    "  mount.nfs: access denied by server while mounting",
    "",
    "yet the follow-up write and read both appeared to work. Only looking at the " +
    "server-side export directory revealed the file was never there.",
    "",
    "The rule: always confirm the write from the SERVER's side, never from the mount " +
    "point. And make sure the address you connect FROM matches the export's client " +
    "list - 127.0.0.1 is not a shortcut past an access list.",
  ],
  code: [
    "# 1. does a client even see the export?",
    "showmount -e 192.168.1.101",
    "",
    "# 2. mount from an address the export actually allows",
    "mount -t nfs -o vers=4 192.168.1.101:/srv/nfs/shared /mnt/nfstest",
    "findmnt -no SOURCE,FSTYPE /mnt/nfstest",
    "",
    "# 3. write THROUGH the mount",
    "echo proof > /mnt/nfstest/proof.txt",
    "",
    "# 4. THE ACTUAL PROOF - read it from the server side, not the mount",
    "ls -l /srv/nfs/shared/proof.txt",
    "cat /srv/nfs/shared/proof.txt",
    "",
    "# 5. clean up",
    "umount /mnt/nfstest",
  ].join("\n"),
  where: "RHEL shell",
  risk: "caution",
};
if (!d.sections.some((s) => /Testing an NFS server properly/.test(s.h || ""))) {
  const at = d.sections.findIndex((s) => /^Verifying it/i.test(s.h || ""));
  if (at >= 0) d.sections.splice(at, 0, testSection);
  else d.sections.push(testSection);
}

// Dedupe by the distinctive opening of each why, so re-running this script
// does not stack duplicate entries. An earlier version appended unconditionally
// and grew the list from 9 to 12 over three runs.
const NEW_FAILURES = [
  {
    why: "A failed mount still accepts writes and reads them back. ",
    fix:
      "If the mount fails, the mount point stays an ordinary directory, so writing to it " +
      "succeeds and reads back the right content while nothing has touched the export. " +
      "Verify from the SERVER's export directory, never from the mount point, and connect " +
      "from an address the export's client list actually allows. Seen on RHEL 10.2."
  },
  {
    why: "Unprivileged users cannot read a freshly created /srv export. ",
    fix:
      "A new directory under /srv is labelled `var_t`, which SELinux does not treat as " +
      "exportable content. Root can still read it, so it looks correct until a normal user " +
      "tries. Run `semanage fcontext -a -t nfs_t '/srv/nfs/shared(/.*)?'` then " +
      "`restorecon -Rv /srv/nfs/shared`, and confirm with `ls -Zd`."
  },
  {
    why: "Files written over NFS are owned by nobody, even by root. ",
    fix:
      "That is `root_squash`, which is on by default and is the protection working as " +
      "intended. It is not a permissions bug. Only change it with `no_root_squash` if you " +
      "have a specific reason and understand the consequence."
  },
];
const kept = (d.failures || []).filter(
  (f) => !NEW_FAILURES.some((n) => (f.why || "").startsWith(n.why.slice(0, 40))));
d.failures = [...kept, ...NEW_FAILURES];

d.quickRef = `Service:        NFS (Network File System)
Package:        nfs-utils                    # provides server AND client
systemd unit:   nfs-server.service
Daemon:         kernel nfsd + rpcbind
Configuration:  /etc/exports, /etc/nfs.conf
Logs:           journalctl -u nfs-server
Ports:          TCP/UDP 2049 (NFSv4), TCP/UDP 111 (rpcbind)

  Server:
    systemctl enable --now nfs-server
    exportfs -ra            # apply /etc/exports
    exportfs -v             # what is exported, with resolved options
    showmount -e SERVER     # what a client can see

  Client:
    mount -t nfs -o vers=4 SERVER:/path /mnt/point
    findmnt -no SOURCE,FSTYPE /mnt/point

  ALWAYS verify a write from the SERVER side:
    cat /srv/nfs/shared/proof.txt
    (checking through the mount point proves nothing - a failed mount
     leaves a plain directory that still accepts writes)

  SELinux - a new /srv dir is var_t, not exportable content:
    semanage fcontext -a -t nfs_t '/srv/nfs/shared(/.*)?'
    restorecon -Rv /srv/nfs/shared

  Critical warnings:
    - root_squash is ON by default: files you write over NFS come back owned by nobody.
    - NFSv4 is unencrypted; use Kerberos sec=krb5p across untrusted networks.
    - The export client list matches the address the client connects FROM.
`;

if (!DRY) writeFileSync(FILE, JSON.stringify(items, null, 2), "utf8");

console.log(`  verification : ${d.verification}`);
console.log(`  tested_on    : present (${d.tested_on.os})`);
console.log(`  sections     : ${d.sections.length}`);
console.log(`  failures     : ${d.failures.length}`);
console.log(DRY ? "  (dry run)" : "  written");