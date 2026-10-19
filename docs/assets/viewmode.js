/**
 * viewmode.js — one global choice between Grid and Compact, remembered.
 *
 * WHY A GLOBAL PREFERENCE
 * The brief asks for a toggle between "spacious cards" and "a compact table for
 * fast exam revision". It is a single setting on one device, not a per-subject
 * one, because per-subject would mean the control has to exist on every subject
 * page and in every card list, and a reader who is revising CCNA wants compact
 * everywhere while they are in it, not only on the list they happened to open.
 *
 * It is applied by a single class on <html>, so the toggle is instant across the
 * whole app and needs no re-render.
 *
 * WHAT IT IS NOT
 * It does not change what is loaded. Both modes show the same records in the
 * same order; only their presentation differs. A view switch that silently
 * filtered or re-sorted the list would make two screens look like two claims
 * about the same data.
 */

import { h } from "./ui.js";

const KEY = "field-manual:viewmode";

let mode = "grid";
const listeners = new Set();

function read() {
  try {
    const v = localStorage.getItem(KEY);
    return v === "compact" ? "compact" : "grid";
  } catch (_) {
    // Private mode. Grid is the default, so this is not a failure - it just
    // cannot be remembered.
    return "grid";
  }
}

export function getViewMode() {
  return mode;
}

/** Put the class on the document. The one place that touches the DOM. */
function paint() {
  const root = document.documentElement;
  root.classList.toggle("is-compact", mode === "compact");
  for (const fn of listeners) {
    try { fn(mode); } catch (_) { /* one bad listener must not break the rest */ }
  }
}

export function initViewMode() {
  mode = read();
  paint();
}

export function setViewMode(next) {
  const v = next === "compact" ? "compact" : "grid";
  if (v === mode) return mode;
  mode = v;
  try { localStorage.setItem(KEY, v); } catch (_) { /* not remembered */ }
  paint();
  return mode;
}

export function toggleViewMode() {
  return setViewMode(mode === "grid" ? "compact" : "grid");
}

export function onViewMode(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * The Grid / Compact control.
 *
 * Two real buttons in a group, not one button that toggles - a toggle has to
 * be pressed twice to see what the two states are, and on a page full of cards
 * that is two wasted steps. `aria-pressed` marks which one is current, and the
 * group is labelled so a screen reader says "View mode" rather than "Grid".
 */
export function viewModeToggle({ compactLabel = "Table", gridLabel = "Cards" } = {}) {
  const mk = (key, label) => h("button.vmt__btn", {
    type: "button",
    "aria-pressed": String(mode === key),
    onclick: () => setViewMode(key),
  }, label);

  const grid = mk("grid", gridLabel);
  const table = mk("compact", compactLabel);

  const group = h("div.vmt", { role: "group", "aria-label": "View mode" },
    h("span.vmt__label", "View"),
    grid, table);

  onViewMode((m) => {
    grid.setAttribute("aria-pressed", String(m === "grid"));
    table.setAttribute("aria-pressed", String(m === "compact"));
  });

  return group;
}