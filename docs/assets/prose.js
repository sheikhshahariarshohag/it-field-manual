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
import { h, copyText } from "./ui.js";

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

/**
 * Inline-marked nodes for a string, for views outside this module.
 *
 * The Knowledge Map stores its paragraphs as plain strings rather than
 * {level, text} blocks, so it needs the same backtick / path / flag / CONST
 * treatment without reimplementing the tokenizer.
 */
export function markedNodes(text) {
  return marked(String(text == null ? "" : text));
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
/* ================================================================ learning
 * elements
 *
 * WHAT THIS IS FOR
 * The classifier above answers "is this line a command or a sentence?". It
 * cannot answer "is this a question, or a step in a procedure, or an
 * analogy?". That second question is what a technical textbook needs, so this
 * section adds it.
 *
 * IMPORTANT - EVERY RULE BELOW IS MEASURED AGAINST THE CORPUS, NOT GUESSED.
 * The Study Manual holds 10,479 blocks. The counts that shaped these rules:
 *
 *   callout marker  (WARNING / NOTE / Why this matters / tip)     325  3.1%
 *   line ends in "?"                                               224  2.1%
 *   Step N / First, / Next, / Then, / Finally,                      56  0.5%
 *   Verify / Check / To confirm                                     86  0.8%
 *   Analogy / Think of it / In plain terms                           7  0.1%
 *   explicit "Q:" or "Question:"                                    0  0.0%
 *
 * That last row is why these rules are narrow. The content does NOT contain
 * learning objectives, and it does not label its answers. Inventing either
 * would be writing new technical content during a UI change, so:
 *
 *   - questions are detected from the real "1. Q1 - text" pattern the guides
 *     actually use, not from a question mark alone, because most lines ending
 *     in "?" in this corpus are not knowledge checks at all;
 *   - answers are detected from "Q1 - text", the same marker without the list
 *     number, which pairs them unambiguously;
 *   - "analogy" and "verify" require an explicit ":" or em dash after the
 *     keyword, so "Check the logs first" stays an ordinary sentence;
 *   - a run of step markers must be at least two long before it is treated as
 *     an ordered procedure, which removes the false positives.
 *
 * Everything unmatched renders as ordinary prose. That is the safe default: an
 * unmarked paragraph reads as a paragraph rather than being promoted into a
 * card it has not earned.
 */

/** The callout markers present in this corpus, and what each earns. */
/**
 * The callout markers present in this corpus, and what each earns.
 *
 * Group 1 of every rule is the body, and it is the only capture group, so the
 * extraction below does not have to know which rule matched.
 *
 * The separator is `(dash|colon)?` and it is CONSUMED. Both halves matter:
 *
 *   - optional, because the corpus uses both "Remember - text" and
 *     "Remember: text", and a required separator silently demoted every
 *     colon form to ordinary prose;
 *   - consumed, because the rules previously used `[dash]?`, which matched the
 *     colon form and then left the colon in the body. "Remember: A script
 *     turns..." rendered as a "Remember" note whose text began ": A script
 *     turns...". Found by scripts/check-content-preserved.mjs.
 */
const CALLOUTS = [
  { re: /^(?:RHCSA EXAM CRITICAL|EXAM CRITICAL|CRITICAL|WARNING|CAUTION|DANGER)\b\s*(?:[\u2014\u2013-]\s*|:\s*)?([\s\S]*)$/i, cls: "note--risk", name: null },
  { re: /^(?:NOTE|Tip|TIP|Remember)\b\s*(?:[\u2014\u2013-]\s*|:\s*)?([\s\S]*)$/,             cls: "note",       name: null },
  { re: /^(?:Why this matters)\b\s*(?:[\u2014\u2013-]\s*|:\s*)?([\s\S]*)$/,                    cls: "note",       name: "Why this matters" },
  // The lightbulb keeps its own sentence.
  { re: /^\uD83D\uDCA1\s*([\s\S]+)$/,                                                          cls: "note--ok",   name: null },
];

/* "1. Q1 - text" is a question; "Q1 - text" is its answer. The list number is
 * the only difference, which is what makes the pair safe to match. */
const RE_QUESTION   = /^\s*\d+[.)]\s*Q\s*(\d+)\s*[—–-]\s*([\s\S]+)$/;
const RE_ANSWER     = /^\s*Q\s*(\d+)\s*[—–-]\s*([\s\S]+)$/;
const RE_ANSWERS_HD = /^\s*(?:NOTE|Note)?\s*[—–-]\s*Answers\s*:?\s*$/;

/* Keyword forms require a colon terminator.
 *
 * "Check how many CPU cores are available." is a sentence and stays prose.
 * "Verify the result:", "Verify the ACL:" and "Check:" are labels, and there
 * are 13 of those in the corpus. The colon is what separates the two, so it is
 * required - up to six words may sit between the keyword and the colon, which
 * covers "Verify the result on the directory and selected files:" without
 * swallowing an ordinary sentence that happens to end in a colon. */
const RE_ANALOGY = /^\s*(Analogy|Think of it(?: this way)?|In plain (?:terms|language)|Simple analogy)\b\s*[:—–-]\s*([\s\S]+)$/i;
const RE_VERIFY  = /^\s*(Verify|Verification|To verify|How to verify|Check|Checking|Confirm)\b((?:\s+[\w'-]+){0,6})\s*[:—–-]\s*([\s\S]*)$/i;

/* Step markers only become a procedure when several appear together.
 *
 * The body must start with a capital or a digit. Without that, `then -`
 * matched a line in the shell-scripting chapter that was *defining* the `then`
 * keyword ("then - introduces the action to perform if the test succeeds"), and
 * the classifier quietly ate the word. A real instruction starts with a verb. */
const RE_STEP = /^\s*(?:Step\s+(\d+)|First|Second|Third|Next|Then|Finally|Lastly)\b\s*[,.:—–-]\s*([A-Z0-9][\s\S]*)$/i;

/**
 * Classify one block of chapter content.
 *
 * @param {{level?:number, text:string}} block
 * @returns {{type:string, level?:number, text:string, num?:string,
 *            body?:string, label?:string, cls?:string}}
 */
export function classifyBlock(block) {
  const b = block || {};
  const t = String(b.text == null ? "" : b.text);
  const level = Number(b.level || 0);

  if (!t.trim()) return { type: "blank", text: t, level };

  // Checked BEFORE the callouts, and this ordering matters.
  //
  // "NOTE - Answers" matches the NOTE callout pattern, so if callouts ran first
  // it would be swallowed as a note and the answers that follow would never be
  // paired with their questions. That is exactly what happened the first time
  // this was built: 3 questions rendered, 0 answers attached, 3 of them
  // labelled "No answer is given in the source material" - which was not true,
  // the answers were two lines further down.
  let m = t.match(RE_ANSWERS_HD);
  if (m) return { type: "answersHeader", text: t, level };

  for (const c of CALLOUTS) {
    const m2 = t.match(c.re);
    if (m2) {
      const raw = (m2[1] || "").trim();
      // A lightbulb line opens "💡 Why this matters - text". That phrase is the
      // label, so it moves out of the body rather than being printed twice -
      // the reader showed "Why this matters" as the heading and again as the
      // first words of the sentence underneath it.
      const lead = raw.match(/^(Why this matters|Remember|Tip|Note)\b\s*(?:[—–-]\s*|:\s*)?/i);
      let label = c.name;
      if (!label && lead) {
        // Normalised, because the corpus writes this marker both as
        // "Why this matters" and as "WHY THIS MATTERS" (the RH294 book), and a
        // heading should not change shape between chapters.
        label = { "why this matters": "Why this matters", remember: "Remember",
                  tip: "Tip", note: "Note" }[lead[1].toLowerCase()];
      }
      if (!label && !raw) {
        // A line that is nothing but the marker, e.g. a bare "warning" on its
        // own line. Without this it rendered as a note headed "Note" with no
        // text at all, which tells the reader nothing.
        const word = t.trim().split(/\s+/)[0] || "";
        label = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return {
        type: "callout", cls: c.cls, level,
        label: label || "Note",
        body: lead ? raw.slice(lead[0].length).trim() : raw,
      };
    }
  }

  m = t.match(RE_QUESTION);
  if (m) return { type: "question", num: m[1], body: m[2].trim(), level, text: t };

  m = t.match(RE_ANSWER);
  if (m) return { type: "answer", num: m[1], body: m[2].trim(), level, text: t };

  m = t.match(RE_ANALOGY);
  if (m) return { type: "analogy", label: m[1], body: m[2].trim(), level, text: t };

  m = t.match(RE_VERIFY);
  if (m) {
    // `Verify:` on its own is a label with the content in the next block;
    // `Verify the result: ls -l /home` carries its body inline.
    return {
      type: "verify", level, text: t,
      label: (m[1] + (m[2] || "")).trim(),
      body: (m[3] || "").trim(),
    };
  }

  const mStep = t.match(RE_STEP);
  if (mStep) {
    return { type: "stepCandidate", num: mStep[1] || "", body: (mStep[2] || "").trim(), level, text: t };
  }

  if (level === 2 || level === 3) return { type: "subheading", level, text: t };
  if (level === 4) return { type: "minorheading", level, text: t };

  return { type: classify(t), level, text: t };
}

/* ------------------------------------------------------------- components */

/** A copy button for any code-ish block. Uses the shared clipboard helper. */
function copyButton(getText) {
  const btn = h("button.pl-copy", {
    type: "button",
    "aria-label": "Copy this block to the clipboard",
  }, "Copy");
  btn.addEventListener("click", async () => {
    const ok = await copyText(getText());
    btn.textContent = ok ? "Copied" : "Select and copy";
    btn.dataset.done = ok ? "1" : "0";
    setTimeout(() => { btn.textContent = "Copy"; }, 1600);
  });
  return btn;
}

/**
 * A boxed command / config / path / output run, with a copy button.
 *
 * The tag stays visible because the brief requires a reader to be able to tell
 * a line to type from a line the system printed back without relying on colour.
 */
function codeRun(lines, kind) {
  const box = h(`div.pl-box.pl-box--${kind}`);
  box.appendChild(h("span.pl-box__tag", kind === "command" ? "command" : kind));
  box.appendChild(copyButton(() => lines.join("\n")));
  const body = h("div.pl-box__body");
  for (const l of lines) {
    body.appendChild(h(kind === "output" || kind === "table" ? "pre.pl-out" : "div.pl-line", ...marked(l)));
  }
  box.appendChild(body);
  return box;
}

/** A bulleted or numbered run rendered as a real list, not stacked divs. */
function listRun(items, ordered) {
  const list = h(ordered ? "ol.pl-list.pl-list--num" : "ul.pl-list");
  for (const it of items) list.appendChild(h("li", ...marked(it)));
  return list;
}

/**
 * A run of steps, rendered as a genuinely ordered procedure.
 * The number shown is the number in the content, so nothing is renumbered.
 */
function stepRun(steps) {
  const box = h("div.pl-steps");
  box.appendChild(h("div.pl-steps__hd", h("span.pl-steps__tag", "procedure")));
  const ol = h("ol.pl-steps__list");
  for (const s of steps) {
    const li = h("li.pl-steps__item");
    if (s.num) li.appendChild(h("span.pl-steps__n", s.num));
    li.appendChild(h("div.pl-steps__body", ...marked(s.body)));
    ol.appendChild(li);
  }
  box.appendChild(ol);
  return box;
}

/**
 * Knowledge check: the questions, with the answers folded away.
 *
 * Answers are paired by their own Q number, so a question is never shown with
 * somebody else's answer and an answer with no question is still shown rather
 * than silently dropped. <details> is used because it is keyboard operable,
 * screen-reader labelled, and works with zero script.
 */
function knowledgeCheck(questions, answers) {
  const box = h("div.kc");
  box.appendChild(h("div.kc__hd",
    h("span.kc__tag", "knowledge check"),
    h("span.kc__n", `${questions.length} question${questions.length === 1 ? "" : "s"}`)));

  const byNum = new Map();
  for (const a of answers || []) if (!byNum.has(a.num)) byNum.set(a.num, a);

  const list = h("ol.kc__list");
  for (const q of questions) {
    const li = h("li.kc__item");
    li.appendChild(h("p.kc__q", ...marked(q.body)));
    const a = byNum.get(q.num);
    if (a) {
      const det = h("details.kc__ans");
      det.appendChild(h("summary.kc__sum", "Show answer"));
      det.appendChild(h("p.kc__abody", ...marked(a.body)));
      li.appendChild(det);
    } else {
      // No answer in the content. Say so rather than implying the renderer lost it.
      li.appendChild(h("p.kc__noans", "No answer is given for this question in the source material."));
    }
    list.appendChild(li);
  }
  box.appendChild(list);

  const orphans = (answers || []).filter((a) => !questions.some((q) => q.num === a.num));
  if (orphans.length) {
    const det = h("details.kc__ans");
    det.appendChild(h("summary.kc__sum", `Additional answer${orphans.length === 1 ? "" : "s"}`));
    for (const a of orphans) det.appendChild(h("p.kc__abody", ...marked(a.body)));
    box.appendChild(det);
  }
  return box;
}

/**
 * Render a run of chapter content blocks ({level, text}).
 *
 * This is the single block renderer every chapter in the app uses. It groups
 * runs so a block of commands reads as one block, a list reads as a real list,
 * a procedure reads as ordered steps, and a question set reads as a knowledge
 * check, while an ordinary paragraph stays an ordinary paragraph.
 *
 * `opts.hookHeading(level, text, node)` lets the reader assign an id to each
 * heading, so the table of contents is generated from the content itself
 * rather than maintained by hand.
 */
export function renderBlocks(items, opts = {}) {
  const arr = (Array.isArray(items) ? items : []).map((b) => classifyBlock(b));
  const frag = document.createDocumentFragment();

  let i = 0;
  while (i < arr.length) {
    const b = arr[i];

    switch (b.type) {
      case "blank":
        i++;
        continue;

      case "callout":
        frag.appendChild(h("div", { class: `note ${b.cls || "note"}` },
          h("strong.note__k", b.label),
          h("span", ...marked(b.body))));
        i++;
        continue;

      case "answersHeader":
        i++;
        continue;  // consumed by the knowledge-check pairing below

      case "question": {
        const questions = [];
        while (i < arr.length && arr[i].type === "question") questions.push(arr[i++]);
        const answers = [];
        if (i < arr.length && arr[i].type === "answersHeader") i++;
        while (i < arr.length && arr[i].type === "answer") answers.push(arr[i++]);
        frag.appendChild(knowledgeCheck(questions, answers));
        continue;
      }

      case "answer":
        // An answer with no question before it. Shown, not dropped.
        frag.appendChild(h("div.kc.kc--orphan", h("p.kc__abody", ...marked(b.body))));
        i++;
        continue;

      case "analogy":
        frag.appendChild(h("div.pl-ana",
          h("span.pl-ana__tag", "analogy"),
          h("p.pl-ana__body", ...marked(b.body))));
        i++;
        continue;

      case "verify":
        frag.appendChild(h("div.pl-verify",
          h("span.pl-verify__tag", "verify"),
          h("div.pl-verify__body", ...marked(b.body))));
        i++;
        continue;

      case "stepCandidate": {
        const run = [];
        while (i < arr.length && arr[i].type === "stepCandidate") run.push(arr[i++]);
        if (run.length >= 2) {
          frag.appendChild(stepRun(run.map((r) => ({ num: r.num, body: r.body }))));
        } else {
          for (const r of run) frag.appendChild(h("p.pl-p", ...marked(r.text)));
        }
        continue;
      }

      case "command":
      case "config":
      case "path":
      case "output":
      case "table": {
        const run = [];
        while (i < arr.length && arr[i].type === b.type) run.push(arr[i++].text);
        frag.appendChild(codeRun(run, b.type));
        continue;
      }

      case "list": {
        const run = [];
        let ordered = /^\s*\d+[.)]/.test(arr[i].text);
        while (i < arr.length && arr[i].type === "list") {
          const line = arr[i].text;
          const m = line.match(/^\s*([-*+•]|\d+[.)])\s+(.*)$/);
          run.push(m ? m[2] : line.trim());
          if (/^\s*\d+[.)]/.test(line)) ordered = true;
          i++;
        }
        frag.appendChild(listRun(run, ordered));
        continue;
      }

      case "subheading":
      case "heading": {
        const n = h("h3.rd-h", ...marked(b.text));
        if (opts.hookHeading) opts.hookHeading(3, b.text, n);
        frag.appendChild(n);
        i++;
        continue;
      }

      case "minorheading": {
        const n = h("h4.rd-h", ...marked(b.text));
        if (opts.hookHeading) opts.hookHeading(4, b.text, n);
        frag.appendChild(n);
        i++;
        continue;
      }

      default:
        frag.appendChild(h("p.pl-p", ...marked(b.text)));
        i++;
    }
  }
  return frag;
}

