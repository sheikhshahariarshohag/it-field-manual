#!/usr/bin/env node
/**
 * measure-sections.mjs — how big is each section type?
 *
 * The section chips are inert because only the HEADINGS were extracted, not
 * the bodies. This measures what it would actually cost to ship the bodies,
 * per section kind, so the decision is made on numbers rather than a guess.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const raw = readFileSync(join(ROOT, "private", "extract",
  "Enterprise_Infrastructure_Knowledge_Map_Unified.txt"), "utf8");
const lines = raw.split(/\r?\n/);

const BULLET_RE = /^[\uF0B7\u2022?]\s*/;
const clean = (s) => ({ text: s.replace(BULLET_RE, "").replace(/\s+$/, "").trim(), bullet: BULLET_RE.test(s) });
const noise = (t) => !t || /^Page \d+ of \d+$/.test(t) || /^Layer \d+/.test(t) ||
  /^Enterprise Infrastructure Knowledge Map/.test(t) || /^SESSION \d+/.test(t) || /^=====+/.test(t) || /^\d+$/.test(t);

const KIND = {
  "business problem": "problem", "concept": "concept",
  "deep tech": "deep", "deep technical explanation": "deep", "deep dive": "deep",
  "internal workflow": "workflow", "how it works": "workflow", "architecture": "architecture",
  "diagrams": "diagram", "ascii diagrams": "diagram", "visual diagram": "diagram",
  "lab": "lab", "lab exercise": "lab", "practical lab": "lab",
  "troubleshooting": "troubleshooting", "real enterprise example": "example",
  "enterprise placement": "enterprise", "dependencies": "dependencies",
  "dependents": "dependents", "connections": "connections", "connections to prior sessions": "connections",
  "security": "security", "security considerations": "security", "security perspective": "security",
  "misconceptions": "misconceptions", "common misconceptions": "misconceptions",
  "cloud perspective": "cloud", "automation perspective": "automation",
  "career perspective": "career", "memory anchors": "anchors",
  "interview questions": "interview", "personal notes": "notes",
  "personal notes section": "notes",
};

const byKind = new Map();
let current = null;
for (let i = 0; i < lines.length; i++) {
  const c = clean(lines[i]);
  if (!c.bullet) {
    const m = c.text.match(/^(\d{1,2})\.\s+(.+?)\s*$/);
    if (m && KIND[m[2].trim().toLowerCase()]) { current = KIND[m[2].trim().toLowerCase()]; continue; }
  }
  if (!current || noise(c.text)) continue;
  const k = byKind.get(current) || { chars: 0, lines: 0 };
  k.chars += c.text.length;
  k.lines += 1;
  byKind.set(current, k);
}

const rows = [...byKind.entries()].sort((a, b) => b[1].chars - a[1].chars);
let total = 0;
console.log("section kind        sessions   chars      KB(raw)   share");
for (const [k, v] of rows) {
  total += v.chars;
  console.log(
    `  ${k.padEnd(16)} ${String(v.lines).padStart(8)} ${String(v.chars).padStart(10)} ` +
    `${(v.chars / 1024).toFixed(0).padStart(8)}KB   ${(v.chars / 2600000 * 100).toFixed(1)}%`
  );
}
console.log(`\nTOTAL body text: ${(total / 1024 / 1024).toFixed(2)} MB across ${rows.length} section kinds`);

// What the app currently ships, for comparison.
const cur = (await import("node:fs")).statSync(join(ROOT, "docs", "data", "knowledge-map.json")).size;
console.log(`Current knowledge-map.json: ${(cur / 1024).toFixed(0)} KB`);

// A realistic "study pack": the compact, high-value sections.
const pack = ["problem", "concept", "misconceptions", "troubleshooting", "example", "anchors", "interview", "security", "career", "cloud", "automation", "enterprise"];
const packChars = pack.reduce((a, k) => a + ((byKind.get(k) || {}).chars || 0), 0);
console.log(`\nExcluding 'deep'+'workflow'+'diagram'+'lab' (the bulk prose):`);
console.log(`  study pack would add ~${(packChars / 1024 / 1024).toFixed(2)} MB  -> total ~${((packChars + cur) / 1024 / 1024).toFixed(2)} MB`);

const core = ["deep"];
const coreChars = core.reduce((a, k) => a + ((byKind.get(k) || {}).chars || 0), 0);
console.log(`\nThe 'deep technical explanation' section alone: ~${(coreChars / 1024 / 1024).toFixed(2)} MB`);