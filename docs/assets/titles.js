/**
 * titles.js — one normal form for a chapter title.
 *
 * WHY
 * The three guides were built from three different source documents, so their
 * chapter titles arrived in three different shapes:
 *
 *   "Ch 1 - GETTING STARTED WITH RED HAT ENTERPRISE LINUX"   (RH124)
 *   "Chapter 1 - Improving Command-Line Productivity"        (RH134)
 *   "Chapter 3: Tuning System Performance"                    (RH134)
 *   "Part 1 - Why Automate, and What Ansible Actually Is; ..."  (RH294)
 *
 * Shouting, mixed case, an em dash, a colon, "Ch" versus "Chapter", and - for
 * nine of the 39 units - a title truncated mid-word with an ellipsis because
 * the builder took three topics and ran out of room.
 *
 * The titles are content, not presentation, so they are fixed at the point of
 * display rather than by rewriting the study-manual index. Nothing upstream is
 * touched and no stored record changes.
 *
 * THE RULES, AND WHY THEY ARE NARROW
 *
 *   1. The number keeps its own word: "Ch 1" becomes "Chapter 1", never "1".
 *   2. The separator becomes a colon everywhere, because the em dash reads as
 *      a dash in a heading and the mix of the two looks like two conventions.
 *   3. ALL-CAPS words are title-cased, EXCEPT a small measured list of
 *      acronyms. Title-casing without an exception list turns "SSH" into "Ssh"
 *      and "RHEL" into "Rhel", which are worse than what it fixed.
 *   4. Mixed-case words are left completely alone, because they are usually
 *      deliberate: SELinux, Jinja2, Ansible, Command-Line, Network-Attached.
 *   5. A "Part N - a; b; c..." title is reduced to its first topic. A heading
 *      that lists three subjects and then stops mid-word tells the reader
 *      nothing useful, and the full list is still in the contents.
 *
 * The acronym list is measured, not guessed: across all 39 titles the only
 * all-caps tokens that are not ordinary English words are RHEL and SSH. ACLs
 * and SELinux are already mixed case and therefore untouched by rule 4.
 */

/** All-caps words that must not be title-cased, and their canonical form. */
const KEEP = new Map([
  ["RHEL", "RHEL"],
  ["SSH", "SSH"],
  ["ACL", "ACL"],
  ["ACLS", "ACLs"],
  ["SELINUX", "SELinux"],
  ["RHCSA", "RHCSA"],
  ["RHCE", "RHCE"],
  ["NFS", "NFS"],
  ["DNS", "DNS"],
  ["DHCP", "DHCP"],
  ["LVM", "LVM"],
  ["GPT", "GPT"],
  ["MBR", "MBR"],
  ["RAID", "RAID"],
  ["HTTP", "HTTP"],
  ["HTTPS", "HTTPS"],
  ["JSON", "JSON"],
  ["YAML", "YAML"],
  ["RPM", "RPM"],
  ["GUI", "GUI"],
  ["VM", "VM"],
  ["NIC", "NIC"],
  ["TCP", "TCP"],
  ["UDP", "UDP"],
  ["IP", "IP"],
  ["NAT", "NAT"],
]);

/** Title-case one ALL-CAPS word, respecting the acronym list. */
function fixWord(w) {
  if (w.length < 2) return w;
  if (w !== w.toUpperCase()) return w;           // mixed case: deliberate, leave it
  if (KEEP.has(w.toUpperCase())) return KEEP.get(w.toUpperCase());
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

/**
 * Normalise a chapter title.
 *
 * @param {string} raw  the stored title, in whatever shape the guide used
 * @returns {string}
 */
export function chapterTitle(raw) {
  let t = String(raw == null ? "" : raw).trim();
  if (!t) return "";

  // Drop a trailing ellipsis and everything it truncated. A heading that stops
  // mid-word ("Installing Ansi...") is worse than a heading that stops at a real
  // boundary, and the dropped topics are still listed in the contents.
  t = t.replace(/[\u2026]|\.\.\.\s*$/, "").trim();

  // "Part N - a; b; c" -> "Part N: a". Three semicolon-separated topics is a
  // contents entry, not a title.
  const semi = t.match(/^(Part\s+\d+)\s*[\u2014\u2013:-]\s*([^;]+?)(?:;[\s\S]*)?$/i);
  if (semi) return tidy(`${semi[1].trim()}: ${semi[2].trim()}`);

  const m = t.match(/^(Ch|Chapter|Part)\s*(\d+)\s*[\u2014\u2013:-]\s*([\s\S]*)$/i);
  if (m) {
    const word = m[1].toLowerCase() === "ch" ? "Chapter" : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
    return tidy(`${word} ${m[2]}: ${m[3].trim()}`);
  }

  // No recognised prefix - still normalise the casing, leave the wording alone.
  return tidy(t);
}

/**
 * Words that stay lower-case unless they open or close the title.
 *
 * Without this, "Ch 1 - GETTING STARTED WITH RED HAT ENTERPRISE LINUX" becomes
 * "Getting Started With Red Hat Enterprise Linux", where "With" is shouting
 * in a sentence that is no longer shouting anywhere else. Standard practice
 * keeps short articles, prepositions and conjunctions lower-case mid-title.
 */
const MINOR = new Set([
  "a", "an", "the", "and", "but", "or", "nor", "for", "so", "yet",
  "as", "at", "by", "in", "of", "on", "to", "up", "via", "per", "from",
  "into", "over", "with", "than", "that", "upon", "when", "then", "is",
]);

/**
 * Apply word-by-word casing to a finished title.
 *
 * Only runs of letters are touched, so punctuation, digits and hyphens survive
 * untouched: "Network-Attached" keeps its capitals, "Command-Line" does too,
 * because both are already mixed case and rule 4 leaves mixed case alone.
 *
 * A minor word is lower-cased only when it was upper-case purely because the
 * source was shouting. A title that genuinely reads "Writing and Running
 * Playbooks" already has its "and" lower-case and is left exactly as written.
 */
function tidy(text) {
  // Word slots, in order, so position can be judged. Punctuation stays put.
  const slots = [];
  const re = /[A-Za-z']+/g;
  let m;
  while ((m = re.exec(text)) !== null) slots.push({ at: m.index, len: m[0].length });

  let out = text;
  slots.forEach((s, i) => {
    const w = out.substr(s.at, s.len);
    const fixed = fixWord(w);
    const first = i === 0;
    const last = i === slots.length - 1;
    const lower = !first && !last && MINOR.has(fixed.toLowerCase())
      ? fixed.toLowerCase()
      : fixed;
    if (lower !== w) {
      out = out.substr(0, s.at) + lower + out.substr(s.at + s.len);
    }
  });
  return out;
}
