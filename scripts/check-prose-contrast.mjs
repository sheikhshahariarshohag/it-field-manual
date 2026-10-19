/**
 * check-prose-contrast.mjs
 *
 * Verifies the design system's colour tokens against WCAG AA, in BOTH themes.
 *
 *   node scripts/check-prose-contrast.mjs
 *
 * WHY THIS READS app.css INSTEAD OF CARRYING ITS OWN PALETTE
 *
 * It used to. Two colour objects were pasted into this file and checked, and
 * the stylesheet was never opened. That is a gate that measures a copy of the
 * truth: change --accent in app.css to something unreadable and this script
 * still reported "every pair meets AA in both themes", because it was still
 * looking at the copy it had been given months earlier.
 *
 * A gate that cannot fail is worse than no gate, because it is reported as
 * passing. So the tokens are parsed out of the real stylesheet here, and a
 * token the parser cannot find is a FAILURE rather than a skipped check.
 *
 * THE THRESHOLDS
 *   4.5:1  body text (WCAG AA normal text)
 *   3.0:1  large text, and non-text indicators such as borders and fills
 *   1.3:1  the floor below which a 1px rule simply is not visible at all.
 *          This is not a WCAG criterion. It is here because the project has
 *          already shipped a list whose separators measured 1.10:1 and were
 *          invisible, while every rule applied correctly.
 *
 * THE CANVAS IS DARK IN BOTH THEMES
 *
 * The terminal is --code-bg, which is near-black whether or not the page is
 * light. That makes it the one place where a --pl-* token is the wrong choice:
 * those are tuned to sit on a box that matches the page, so on the canvas they
 * invert. It happened once already - the comment colour was pointed at
 * --pl-out-fg (#14532d, a dark green for a pale background) and measured
 * 1.96:1 against #0f172a, which is invisible.
 *
 * So the --code-* tokens are checked as first-class pairs below, in both
 * themes, rather than trusted because they look right.
 */

import { readFileSync } from "node:fs";

const CSS_PATH = new URL("../docs/assets/app.css", import.meta.url);

/* ------------------------------------------------------------ WCAG maths */

const hex = (h) => {
  const s = h.replace("#", "").trim();
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  if (!/^[0-9a-f]{6}$/i.test(v)) return null;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const ca = hex(a);
  const cb = hex(b);
  // Not a colour (a length, a shadow, a font stack). Callers report it as a
  // missing token rather than crashing on `null.map`.
  if (!ca || !cb) return NaN;
  const [x, y] = [lum(ca), lum(cb)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* ------------------------------------------------- read the real tokens */

/**
 * Pull every token block for one selector out of the stylesheet and merge them.
 *
 * ALL of them, not the first. The palette is not one contiguous block: the
 * prose boxes live in a second `:root { --pl-cmd-bg: ... }` further down the
 * file, the contents-edge tokens in a third. Reading only the first block gave
 * "token missing" for fourteen prose pairs - a false failure that would have
 * trained anyone reading this output to ignore it.
 *
 * Later declarations win, which matches the cascade within one block.
 */
function block(selector) {
  // Strip comments FIRST. A declaration carrying a trailing comment looked
  // like this to the value regex:
  //     --bg-sunk: #060911;   /* darker than --bg: a recessed panel ... */
  // and because the capture runs to the next semicolon, the comment text
  // became the token's value. That reported --bg as "not a colour" in the dark
  // theme while it was plainly a hex, which is the kind of false failure that
  // makes people stop reading gate output.
  const css = readFileSync(CSS_PATH, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const out = {};
  const needle = selector + " {";
  let from = 0;
  let found = false;
  for (;;) {
    const at = css.indexOf(needle, from);
    if (at < 0) break;
    found = true;
    const open = css.indexOf("{", at);
    let depth = 0;
    for (let i = open; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) {
        for (const m of css.slice(open + 1, i).matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
          out[m[1]] = m[2].trim();
        }
        from = i;
        break;
      }
    }
    if (from <= at) break;   // no progress; do not spin
  }
  return found ? out : null;
}

const LIGHT = block(":root");
const DARK = block('html[data-theme="dark"]');

// The prefers-color-scheme block must agree with the explicit dark theme, or a
// visitor who never touches the toggle sees a different app from one who does.
const CSS_TEXT = readFileSync(CSS_PATH, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const prefersAt = CSS_TEXT.indexOf('@media (prefers-color-scheme: dark)');
const PREFERS = prefersAt < 0 ? null : (() => {
  const inner = block('html:not([data-theme="light"])');
  return inner;
})();

/* --------------------------------------------------------------- the pairs */

const TEXT = 4.5;
const LARGE = 3.0;
const EDGE = 1.3;

/**
 * [label, foreground token, background token, minimum]
 *
 * The first six are the prose boxes the reader draws most of. The rest are the
 * page chrome: the accent is link text in this app, not a decorative fill, so
 * it is held to body-text contrast rather than the 3:1 non-text rule.
 */
const PAIRS = [
  ["command text on command bg",        "--pl-cmd-fg",       "--pl-cmd-bg",        TEXT],
  ["'command' tag on tag strip",        "--pl-cmd-fg",       "--pl-cmd-tag",       TEXT],
  ["config text on config bg",          "--pl-cfg-fg",       "--pl-cfg-bg",        TEXT],
  ["'config' tag",                      "--pl-cfg-fg",       "--pl-cfg-tag",       TEXT],
  ["path text on path bg",              "--pl-path-fg",      "--pl-path-bg",       TEXT],
  ["'path' tag",                        "--pl-path-fg",      "--pl-path-tag",      TEXT],
  ["output text on output bg",          "--pl-out-fg",       "--pl-out-bg",        TEXT],
  ["'output' tag",                      "--pl-out-fg",       "--pl-out-tag",       TEXT],
  ["inline code",                       "--pl-inline-fg",    "--pl-inline-bg",     TEXT],
  ["path chip",                         "--pl-path-chip-fg", "--pl-path-chip",     TEXT],
  ["flag inline",                       "--pl-flag-fg",      "--pl-cmd-bg",        TEXT],
  ["flag inline on surface",            "--pl-flag-fg",      "--surface",          TEXT],
  ["constant inline",                   "--pl-const-fg",     "--pl-cmd-bg",        TEXT],
  ["config box edge",                   "--pl-cfg-edge",     "--pl-cfg-bg",        LARGE],

  ["body text on surface",              "--text",            "--surface",          TEXT],
  ["body text on page",                 "--text",            "--bg",               TEXT],
  ["secondary text on surface",         "--text-dim",        "--surface",          TEXT],
  ["secondary text on page",            "--text-dim",        "--bg",               TEXT],
  ["faint text on surface",             "--text-faint",      "--surface",          TEXT],
  ["faint text on page",                "--text-faint",      "--bg",               TEXT],
  ["accent as link text on page",       "--accent",          "--bg",               TEXT],
  ["accent as link text on surface",    "--accent",          "--surface",          TEXT],
  ["accent on its own tint",            "--accent",          "--accent-dim",       TEXT],
  ["accent ink on accent fill",         "--accent-ink",      "--accent",           TEXT],
  ["ok text on its tint",               "--ok",              "--ok-dim",           TEXT],
  ["warn text on its tint",             "--warn",            "--warn-dim",         TEXT],
  ["danger text on its tint",           "--danger",          "--danger-dim",       TEXT],
  ["terminal text on terminal canvas",  "--code-fg",         "--code-bg",          TEXT],
  ["terminal muted text on canvas",     "--code-dim",        "--code-bg",          TEXT],
  ["terminal 'safe' tag on canvas",     "--code-ok",         "--code-bg",          TEXT],
  ["terminal 'caution' tag on canvas",  "--code-warn",       "--code-bg",          TEXT],
  ["terminal 'risk' tag on canvas",     "--code-danger",     "--code-bg",          TEXT],
  ["terminal prompt on canvas",         "--code-prompt",     "--code-bg",          TEXT],

  ["border on page",                    "--line",            "--bg",               EDGE],
  ["border on card",                    "--line",            "--surface",          EDGE],
  ["contents edge on its panel",        "--toc-edge",        "--bg-sunk",          EDGE],
];

/** Subject chip colours are text on the card in light and dark. */
const SUBJECTS = [
  "--tech-aplus", "--tech-cisco", "--tech-mikrotik", "--tech-win11",
  "--tech-winserver", "--tech-cross", "--tech-rhel",
];

/* ------------------------------------------------------------------- run */

let bad = 0;
let missing = 0;

function check(label, pal, fgK, bgK, min) {
  const fg = pal[fgK];
  const bg = pal[bgK];
  if (!fg || !bg || !hex(fg) || !hex(bg)) {
    const which = !fg || !bg ? `${fgK} or ${bgK} is not defined` : `${!hex(fg) ? fgK : bgK} is not a colour (${!hex(fg) ? fg : bg})`;
    console.log(`    FAIL   --   ${which}`);
    missing++;
    bad++;
    return;
  }
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) bad++;
  console.log(`    ${ok ? "ok  " : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (needs ${min})  ${label}  ${fg} on ${bg}`);
}

for (const [name, pal] of [["LIGHT", LIGHT], ["DARK", DARK]]) {
  console.log(`\n  ${name}`);
  if (!pal) {
    console.log(`    FAIL   could not find the ${name.toLowerCase()} token block in app.css`);
    bad++;
    continue;
  }
  for (const [label, fgK, bgK, min] of PAIRS) check(label, pal, fgK, bgK, min);
  for (const s of SUBJECTS) check(`subject chip ${s.replace("--tech-", "")}`, pal, s, "--surface", TEXT);
}

/* The system dark theme and the explicit dark theme are the same app. If they
   drift, a visitor who has never opened the toggle sees a different design
   from one who has, and neither is wrong enough to be noticed until it is. */
console.log("\n  prefers-color-scheme must match the explicit dark theme");
if (!PREFERS) {
  console.log("    FAIL   could not find the prefers-color-scheme block in app.css");
  bad++;
} else {
  for (const key of Object.keys(DARK || {})) {
    if (PREFERS[key] !== undefined && DARK[key] !== undefined && PREFERS[key] !== DARK[key]) {
      console.log(`    FAIL   ${key}: prefers says ${PREFERS[key]}, data-theme says ${DARK[key]}`);
      bad++;
    }
  }
}

/* A var() with a fallback is exempt: `var(--accent-s, var(--accent))` is a
   deliberate "use the per-subject colour if one was set, otherwise the accent"
   hook, and --accent-s is legitimately undefined for most subjects. Only a
   var() with nothing after the comma is an orphan. */
console.log("\n  every var() in app.css must resolve");
{
  const defined = new Set([
    ...Object.keys(LIGHT || {}), ...Object.keys(DARK || {}),
    ...Object.keys(PREFERS || {}),
  ]);

  /* Custom properties set at RUNTIME from JavaScript, so they cannot appear in
   * this file by definition. Each one is named here on purpose, with the line
   * that sets it, so that adding another is a decision rather than an accident.
   *
   *   --pct     views.js ring() - the progress percentage, 0-100, written with
   *             el.style.setProperty so the ring can animate without a re-render
   */
  const RUNTIME = new Set(["--pct"]);

  const orphans = new Set();
  for (const m of CSS_TEXT.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([^)]*)\)/gi)) {
    const [, name, rest] = m;
    if (rest.includes(",")) continue;          // has a fallback: fine
    if (defined.has(name) || RUNTIME.has(name)) continue;
    orphans.add(name);
  }
  const list = [...orphans].sort();
  if (list.length) {
    for (const o of list) {
      console.log(`    FAIL   ${o} is used with no fallback and never defined`);
      if (!RUNTIME.has(o)) {
        console.log(`            not a stylesheet token and not in the runtime list in this script`);
      }
    }
    bad += list.length;
  } else {
    console.log(`    ok        every var() either has a fallback, is defined, or is a listed runtime property`);
  }
}

console.log(
  bad
    ? `\n  ${bad} problem(s) - ${missing} of them a token that is not defined`
    : "\n  every pair meets its threshold in both themes, read from app.css"
);
process.exit(bad ? 1 : 0);