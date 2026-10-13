/**
 * prose.js — one renderer for explanatory text.
 *
 * THE PROBLEM THIS SOLVES
 * Two places in the app render large bodies of mixed text: the Study Manual
 * sections and the Library book chunks. Both dumped it verbatim — study blocks
 * became a bare <p>, the library text a bare <pre>. A reader could not tell in
 * one glance which line was a command to type and which line was an
 * explanation to read, because nothing on the page distinguished them.
 *
 * The content already contains the distinction. Shell commands start with a
 * known command name or a path; configuration files are KEY=value; command
 * output is indented or follows a command. This module finds that structure
 * and marks it, rather than asking the reader to spot it.
 *
 * DESIGN RULES
 *   - one glance: a command is unmistakably a command, without reading it
 *   - consistent: the same treatment everywhere, in every view
 *   - accessible: every colour pair re-checked for WCAG AA in both themes
 *   - never interactive: this is a renderer, not a UI. Only h() is used and
 *     no innerHTML, so a line of book text can never become markup.
 *
 * The classification is a heuristic and says so. It favours false positives —
 * showing a short prose line as a command is a minor cosmetic wobble, while
 * showing a real command as prose is the failure the learner actually hits.
 */
import { h } from "./ui.js";

/* ------------------------------------------------------------ classify */

/**
 * Commands that appear at the start of a line in this material. Deliberately
 * not exhaustive: an unlisted command still gets caught by the structural
 * tests below. This list only short-circuits the ambiguous cases.
 */
const COMMANDS = new Set([
  // general
  "ls", "cd", "pwd", "cp", "mv", "rm", "mkdir", "rmdir", "touch", "cat", "less",
  "more", "head", "tail", "wc", "sort", "uniq", "cut", "tr", "tee", "echo",
  "printf", "grep", "egrep", "fgrep", "sed", "awk", "find", "locate", "xargs",
  "which", "type", "file", "stat", "ln", "readlink", "basename", "dirname",
  "du", "df", "tree", "diff", "patch", "date", "whoami", "id", "hostname",
  "uname", "history", "alias", "export", "source", "sleep", "true", "false",
  "env", "ps", "top", "htop", "kill", "killall", "pkill", "nice", "renice",
  "uptime", "free", "lsof", "strace", "vmstat", "iostat", "mpstat", "lscpu",
  "lsblk", "lsof", "chmod", "chown", "chgrp", "umask", "setfacl", "getfacl",
  "tar", "gzip", "gunzip", "bzip2", "xz", "zcat", "dd",
  // users
  "useradd", "usermod", "userdel", "groupadd", "groupmod", "groupdel",
  "passwd", "chage", "gpasswd", "newgrp", "id", "getent",
  // packages
  "dnf", "yum", "rpm", "apt", "apt-get", "zypper", "subscription-manager",
  "semanage", "getsebool", "setsebool", "restorecon", "chcon", "sealert",
  "ausearch", "audit2allow", "semodule",
  // services
  "systemctl", "service", "journalctl", "chkconfig", "lslogins",
  // storage
  "mount", "umount", "mkfs", "fsck", "fdisk", "parted", "partprobe", "blkid",
  "swapon", "swapoff", "mkswap", "fstab", "lsinitrd",
  "pvcreate", "pvremove", "pvdisplay", "pvs", "vgs", "lvs",
  "vgcreate", "vgextend", "vgreduce", "lvcreate", "lvextend", "lvremove",
  "pvmove", "stratis", "vdo", "xfs_growfs", "resize2fs",
  // network
  "ip", "ss", "netstat", "nmcli", "nmstatectl", "ping", "ping6", "tracepath",
  "traceroute", "dig", "host", "nslookup", "getent", "firewall-cmd",
  "curl", "wget", "ssh", "sshd", "scp", "sftp", "rsync", "ssh-keygen",
  "ssh-copy-id",
  // boot
  "grub2", "grubby", "mkinitrd", "dracut", "systemd-analyze",
  "systemd-tmpfiles", "crontab", "at", "atq", "systemd-analyze",
  // interpreters and automation
  "bash", "sh", "python", "python3", "perl", "ansible", "ansible-playbook",
  "ansible-doc", "ansible-galaxy", "vim", "vi", "nano", "less", "man", "info",
  "apropos", "ldconfig", "getcap", "setcap", "getent", "sestatus", "getenforce",
  "setenforce", "systemctl-cgls", "tr", "column", "split",
]);

/** Sub-commands and verbs that read as commands on their own. */
const VERBS = new Set([
  "config-manager", "useradd", "groupadd", "module", "repo", "history",
  "state", "conditionals", "users", "install", "remove",
]);

const CONFIG_KEY = /^[A-Za-z_][A-Za-z0-9_.-]*\s*=\s*\S/;
const PATH_START = /^(\/|~\/|\.\/|\.\.\/|\$HOME)/;
const FLAG_ONLY = /^\s*-{1,2}[A-Za-z]/;
const PROMPT = /^\s*[\w.-]+@[\w.-]+[:~][$#]\s/;

/**
 * @returns {"command"|"output"|"path"|"config"|"list"|"table"|"heading"|"prose"}
 */
export function classify(line) {
  const t = line.trim();
  if (!t) return "blank";

  // Markdown heading.
  if (/^#{1,6}\s+\S/.test(t)) return "heading";
  if (/^(Chapter|Module|Part|Section|Topic|Lesson)\b.*\d/.test(t)) return "heading";

  // List item.
  if (/^([-*+•]|\d+[.)])\s+/.test(t)) return "list";

  // A shell prompt means what follows is typed.
  if (PROMPT.test(line)) return "command";

  const first = t.split(/[\s;|&]+/)[0];
  const bare = first.replace(/^.*[\\\/]/, "");

  if (COMMANDS.has(bare) || COMMANDS.has(first) || VERBS.has(bare)) {
    // "systemctl is-active sshd" and friends.
    return "command";
  }

  if (CONFIG_KEY.test(t) && !/[a-z] [a-z]/i.test(t)) return "config";
  if (PATH_START.test(t) && !/[.!?]$/.test(t)) return "path";
  if (FLAG_ONLY.test(t) && t.length < 90) return "command";

  // Indented continuation under a command is output.
  if (/^\s{2,}\S/.test(line)) return "output";

  // Error and status lines are output wherever they appear.
  if (/^(Error|Warning|FAILED|failed|OK|ok|ACTIVE|active|Loaded|loaded|Total|total)\b[:\s]/.test(t)) {
    return "output";
  }
  if (/^\s*[-─═║│┌└├]/.test(t)) return "table";

  return "prose";
}

/* ------------------------------------------------------- inline marks */

/**
 * Split a line into text and inline marks: `backticked`, /paths/ and -flags.
 *
 * Backticks win over everything else, so a path already inside backticks is
 * not double-marked.
 */
function inlineTokens(text) {
  const out = [];
  const re = /`([^`]+)`|(\/(?:[\w.-]+)(?:\/[\w.-]+)*)|(-\{1,2}[A-Za-z][\w-]*)|([A-Z_][A-Z0-9_]{2,})\b/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push({ code: m[1] });
    else if (m[2] !== undefined) out.push({ path: m[2] });
    else if (m[3] !== undefined) out.push({ flag: m[3] });
    else out.push({ const: m[4] });
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Build the element for one inline mark. */
function markNode(mark) {
  if (mark.code !== undefined) return h("code.inline", mark.code);
  if (mark.path !== undefined) return h("code.path", mark.path);
  if (mark.flag !== undefined) return h("code.flag", mark.flag);
  if (mark.const !== undefined) return h("code.const", mark.const);
  return document.createTextNode(String(mark));
}

/** Inline-marked nodes for one line. */
function marked(text) {
  return inlineTokens(text).map((p) =>
    (typeof p === "string" ? document.createTextNode(p) : markNode(p)));
}

/* -------------------------------------------------------------- render */

/** Strip the Markdown heading hashes, keeping the text. */
function headingText(line) {
  return line.trim().replace(/^#{1,6}\s+/, "");
}

/**
 * Render one line of body text into an element.
 *
 * The class names are what carry the visual language; app.css owns their
 * appearance so the two never drift apart.
 */
export function renderLine(line) {
  const kind = classify(line);
  switch (kind) {
    case "blank":
      return h("div.pl-blank");
    case "heading":
      return h("p.pl-h", ...marked(headingText(line)));
    case "command":
      return h("div.pl-cmd", h("span.pl-cmd__tag", "command"), h("code.pl-cmd__body", ...marked(line.trim())));
    case "config":
      return h("div.pl-cfg", h("code.pl-cfg__body", ...marked(line.trim())));
    case "path":
      return h("div.pl-path", h("code.pl-path__body", ...marked(line.trim())));
    case "output":
      return h("pre.pl-out", ...marked(line.trimEnd()));
    case "list": {
      const m = line.match(/^\s*([-*+•]|\d+[.)])\s+(.*)$/);
      return h("div.pl-li",
        h("span.pl-li__mark", m ? m[1] : "•"),
        h("span.pl-li__body", ...marked(m ? m[2] : line.trim())));
    }
    case "table":
      return h("pre.pl-tbl", ...marked(line.trimEnd()));
    default:
      return h("p.pl-p", ...marked(line));
  }
}

/**
 * Render a plain-text body (a book chunk) into elements.
 *
 * Consecutive blank lines are collapsed and a run of the same kind is grouped,
 * so a block of commands reads as one block rather than as a stack of
 * identical single-line boxes.
 */
export function renderText(text) {
  const lines = String(text || "").split(/\r?\n/);
  const frag = document.createDocumentFragment();
  let i = 0;
  while (i < lines.length) {
    const kind = classify(lines[i]);
    if (kind === "blank") { i++; continue; }

    if (kind === "command" || kind === "config" || kind === "path" || kind === "output") {
      const run = [];
      while (i < lines.length && classify(lines[i]) === kind) run.push(lines[i++]);
      const box = h(`div.pl-box.pl-box--${kind}`);
      box.appendChild(h(`span.pl-box__tag`, kind === "command" ? "command" : kind));
      const body = h("div.pl-box__body");
      for (const l of run) body.appendChild(h(kind === "output" ? "pre.pl-out" : "div.pl-line", ...marked(l)));
      box.appendChild(body);
      frag.appendChild(box);
      continue;
    }
    frag.appendChild(renderLine(lines[i]));
    i++;
  }
  return frag;
}

/**
 * Render Study Manual content blocks ({level, text}).
 *
 * Keeps the callout handling that was already in studyBlock — the guides use
 * consistent markers and they deserve surfacing — and routes everything else
 * through the same classifier as the books, so a command looks identical in
 * both places.
 */
export function renderBlocks(items) {
  const frag = document.createDocumentFragment();
  const arr = Array.isArray(items) ? items : [];

  // Group runs of the same kind so commands in the manual are boxed too.
  let i = 0;
  while (i < arr.length) {
    const b = arr[i];
    const t = String((b && b.text) || "");
    if (!t) { i++; continue; }

    const callout = t.match(/^(RHCSA EXAM CRITICAL|EXAM CRITICAL|CRITICAL|WARNING|NOTE|Why this matters|💡)\b\s*[—\-–]?\s*([\s\S]*)$/);
    if (callout) {
      const kind = callout[1].toLowerCase();
      const cls = /critical|warning|watch/.test(kind) ? "note--risk"
        : /why/.test(kind) ? "note" : "note--ok";
      frag.appendChild(h("div", { class: `note ${cls}` },
        h("strong", callout[1].replace(/^💡\s*/, "")), h("span", ...marked(callout[2].trim()))));
      i++;
      continue;
    }

    if (b.level === 2 || b.level === 3) { frag.appendChild(h("h3", ...marked(t))); i++; continue; }
    if (b.level === 4) { frag.appendChild(h("h4", ...marked(t))); i++; continue; }

    const kind = classify(t);
    if (kind === "command" || kind === "config" || kind === "path" || kind === "output") {
      const run = [];
      while (i < arr.length) {
        const x = String((arr[i] && arr[i].text) || "");
        const k = classify(x);
        if (k !== kind) break;
        run.push(x);
        i++;
      }
      const box = h(`div.pl-box.pl-box--${kind}`);
      box.appendChild(h("span.pl-box__tag", kind === "command" ? "command" : kind));
      const body = h("div.pl-box__body");
      for (const l of run) body.appendChild(h(kind === "output" ? "pre.pl-out" : "div.pl-line", ...marked(l)));
      box.appendChild(body);
      frag.appendChild(box);
      continue;
    }

    if (kind === "list") {
      const m = t.match(/^\s*([-*+•]|\d+[.)])\s+(.*)$/);
      frag.appendChild(h("div.pl-li",
        h("span.pl-li__mark", m ? m[1] : "•"),
        h("span.pl-li__body", ...marked(m ? m[2] : t.trim()))));
      i++;
      continue;
    }

    frag.appendChild(h("p.pl-p", ...marked(t)));
    i++;
  }
  return frag;
}
