/**
 * check-routes.mjs
 *
 * Every view case must have a route, and every route must have a case.
 *
 *   node scripts/check-routes.mjs
 *
 * WHY THIS EXISTS
 *
 * The router is a registered table, not the switch. `resolve()` walks the
 * registered patterns and calls `onNavigate` ONLY when one matches. A case
 * added to the switch with no matching route therefore renders nothing at all,
 * and it fails completely silently: no exception, no console message, no empty
 * state.
 *
 * Measured on the bug this gate was written for. Adding
 * `case "flashcards"` to the switch and linking it in the sidebar produced a
 * link that went to a page stuck on "Loading the reference library…" forever.
 * Three things had to be ruled out before the real cause was found, and each
 * ruled one out by hand:
 *
 *   - the view itself: calling flashcardsView() from the console returned 16
 *     cards in 2ms, so it was fine
 *   - the corpus: all 16 data files fetched 200 in under 12ms each
 *   - the service worker: unregistering it and clearing every cache changed
 *     nothing
 *
 * The cause was one missing line, `route("flashcards", ...)`, in a different
 * part of the file from the switch. Nothing about the failure pointed at it.
 *
 * So the two lists are compared here instead of by eye.
 */

import { readFileSync } from "node:fs";

const APP = new URL("../docs/assets/app.js", import.meta.url);
const src = readFileSync(APP, "utf8");

/* --- the switch: which view handles which first path segment ------------ */

const switchAt = src.indexOf("switch (head)");
if (switchAt < 0) {
  console.error("  could not find `switch (head)` in app.js - has it been renamed?");
  process.exit(1);
}
// Only the switch body, up to its closing brace at the switch's own indent.
const body = src.slice(switchAt);
const endAt = body.indexOf("\n  }");
const cases = [...body.slice(0, endAt).matchAll(/case "([^"]+)"/g)].map((m) => m[1]);

/* --- the registrations: which path segments the router knows ------------ */

const routes = [...src.matchAll(/route\("([^"]+)"/g)].map((m) => m[1]);

// The collection loop registers several segments from an array literal that is
// wrapped across six lines, so the read has to continue to the closing "])" -
// reading only the first line found three of the six and reported commands,
// lessons and scenarios as unroutable when they are not.
const loopAt = src.indexOf("for (const [seg, kind] of");
const loopSegs = [];
if (loopAt > 0) {
  const closeAt = src.indexOf("])", loopAt);
  const literal = src.slice(src.indexOf("[", loopAt), closeAt + 2);
  for (const m of literal.matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g)) {
    // "subjects" is also registered explicitly below; duplicates are harmless.
    loopSegs.push(m[1]);
  }
}

/** A route pattern's first segment, which is what the switch dispatches on. */
const heads = new Set();
for (const p of [...routes, ...loopSegs]) {
  const first = p.split("/").filter(Boolean)[0];
  if (first) heads.add(first);
}

/* --- compare ------------------------------------------------------------- */

const caseHeads = new Set(cases);
const noRoute = cases.filter((c) => !heads.has(c));
const noCase = [...heads].filter((h) => !caseHeads.has(h));

console.log(`  view cases in the switch : ${cases.length}`);
console.log(`  route segments reachable : ${heads.size}`);
console.log(`  routes registered        : ${routes.length}${loopSegs.length ? ` (+${loopSegs.length} from a loop)` : ""}`);

let bad = 0;
if (noRoute.length) {
  console.log(`\n  FAIL  ${noRoute.length} view(s) the router cannot reach:`);
  for (const c of noRoute) {
    console.log(`          case "${c}" has no route("...") - the page will never render`);
    bad++;
  }
}
if (noCase.length) {
  console.log(`\n  FAIL  ${noCase.length} route(s) with no view:`);
  for (const c of noCase) {
    console.log(`          route("${c}") falls through to the default home view`);
    bad++;
  }
}

console.log(bad
  ? `\n  ${bad} route problem(s)`
  : "\n  every view case is routable and every route has a view");
process.exit(bad ? 1 : 0);