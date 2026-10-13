/**
 * check-prose-contrast.mjs
 *
 * Verifies the prose visual language against WCAG AA in both themes.
 *
 * The CSS comment quotes specific contrast ratios. Those were written before
 * the values were checked, so this computes them rather than trusting them.
 *
 *   node scripts/check-prose-contrast.mjs
 */

const hex = (h) => {
  const s = h.replace("#", "");
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
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
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const LIGHT = {
  surface: "#fffdfa", bg: "#faf8f4",
  cmdBg: "#e6f0ed", cmdFg: "#10312f", cmdTagFg: "#0f6b66", cmdTagBg: "#e0efed",
  cfgBg: "#fbf1e0", cfgFg: "#6b3a06", cfgTagFg: "#6b3a06", cfgTagBg: "#f8e8d2",
  pathBg: "#f1ede6", pathFg: "#45403a", pathTagFg: "#45403a", pathTagBg: "#ebe6dd",
  outBg: "#f2eee7", outFg: "#4a443d", outTagFg: "#4a443d", outTagBg: "#e7e1d7",
  inlineBg: "#f1ece4", inlineFg: "#2c2825",
  chipBg: "#ece7df", chipFg: "#4a443d",
  flagFg: "#8a3d08", constFg: "#6d3f7d",
  text: "#1f1d1a",
};

const DARK = {
  surface: "#1a1917", bg: "#171614",
  cmdBg: "#10221f", cmdFg: "#cfeae6", cmdTagFg: "#6fbdb4", cmdTagBg: "#16332f",
  cfgBg: "#241a10", cfgFg: "#f2d9b4", cfgTagFg: "#e0b478", cfgTagBg: "#33240f",
  pathBg: "#1e1c19", pathFg: "#cfc8bd", pathTagFg: "#a79f94", pathTagBg: "#26241f",
  outBg: "#191816", outFg: "#b5aea4", outTagFg: "#9c948a", outTagBg: "#232120",
  inlineBg: "#242220", inlineFg: "#e6e0d6",
  chipBg: "#23211e", chipFg: "#cfc8bd",
  flagFg: "#e8a75e", constFg: "#c9a3da",
  text: "#e8e2d8",
};

// AA: 4.5:1 for body text, 3:1 for large text and non-text indicators.
const PAIRS = [
  ["command text on command bg", "cmdFg", "cmdBg", 4.5],
  ["'command' tag on tag strip", "cmdTagFg", "cmdTagBg", 4.5],
  ["config text on config bg", "cfgFg", "cfgBg", 4.5],
  ["'config' tag", "cfgTagFg", "cfgTagBg", 4.5],
  ["path text on path bg", "pathFg", "pathBg", 4.5],
  ["'path' tag", "pathTagFg", "pathTagBg", 4.5],
  ["output text on output bg", "outFg", "outBg", 4.5],
  ["'output' tag", "outTagFg", "outTagBg", 4.5],
  ["inline code", "inlineFg", "inlineBg", 4.5],
  ["path chip", "chipFg", "chipBg", 4.5],
  ["flag inline", "flagFg", "cmdBg", 4.5],
  ["flag inline on surface", "flagFg", "surface", 4.5],
  ["constant inline", "constFg", "cmdBg", 4.5],
  ["body text on surface", "text", "surface", 4.5],
  // Surface tint, not a WCAG criterion - no AA rule covers decorative fill
  // against the page. Checked only so the box is visibly a box.
  ["command box vs page", "cmdBg", "bg", 1.03],
];

let bad = 0;
for (const [name, pal] of [["LIGHT", LIGHT], ["DARK", DARK]]) {
  console.log(`\n  ${name}`);
  for (const [label, fgK, bgK, min] of PAIRS) {
    const r = ratio(pal[fgK], pal[bgK]);
    const ok = r >= min;
    if (!ok) bad++;
    console.log(`    ${ok ? "ok  " : "FAIL"}  ${r.toFixed(2).padStart(5)}:1  (needs ${min})  ${label}`);
  }
}
console.log(bad ? `\n  ${bad} pair(s) below AA` : "\n  every pair meets AA in both themes");
process.exit(bad ? 1 : 0);