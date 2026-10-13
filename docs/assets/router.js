/**
 * router.js — hash router.
 *
 * Hash routing (not the History API) so the app works when opened directly from
 * a file:// path or served from any subdirectory, with no server rewrite rules.
 */

const routes = [];
let current = null;
let onNavigate = null;

/**
 * Scroll position for the history entry that is currently on screen.
 *
 * The app resets scroll to the top on every navigation, which is right when
 * you move somewhere new and wrong when you press Back. Without this, backing
 * out of a chapter dropped you at its first line instead of the paragraph you
 * had actually read - on a library chapter that is 36,000 characters of text
 * and several screens from where you were.
 *
 * The browser's own history.scrollRestoration cannot help: it only works with
 * the History API, and this is a hash router so the app can still be opened
 * from a file:// path or any subdirectory.
 *
 * Keyed by the full location href, so each visited route keeps its own place.
 */
const scrollMemory = new Map();

/** Remember where we are, against the route we are leaving. */
export function rememberScroll(href = location.href) {
  if (!current) return;
  scrollMemory.set(href, window.scrollY || 0);
}

/** The remembered position for a route, or null if it has never been visited. */
export function recalledScroll(href = location.href) {
  const y = scrollMemory.get(href);
  return typeof y === "number" ? y : null;
}

/**
 * Was this navigation caused by Back or Forward rather than a fresh jump?
 *
 * A hash router cannot tell from the event alone, so this is inferred: a
 * popstate immediately followed by a hashchange with the same destination is a
 * history move. Flagged here and consumed once by the render.
 */
let popPending = false;
addEventListener("popstate", () => { popPending = true; });

export function consumePop() {
  const was = popPending;
  popPending = false;
  return was;
}

function parse(hash) {
  const raw = (hash || "").replace(/^#\/?/, "");
  const [pathPart, queryPart] = raw.split("?");
  // Decode once, here, so every consumer sees the same plain segments.
  // (A malformed escape must not throw during routing.)
  const path = pathPart.split("/").filter(Boolean).map((seg) => {
    try { return decodeURIComponent(seg); } catch (_) { return seg; }
  });
  const query = Object.fromEntries(new URLSearchParams(queryPart || ""));
  return { path, query, raw };
}

export function route(pattern, handler) {
  // '/cmd/:id' -> match 2 segments
  const parts = pattern.split("/").filter(Boolean);
  routes.push({ pattern, parts, handler });
}

export function navigate(to, { replace = false } = {}) {
  const target = to.startsWith("#") ? to : "#/" + to.replace(/^\/+/, "");
  if (replace) history.replaceState(null, "", target);
  else location.hash = target;
  if (replace) resolve();
}

export function currentRoute() { return current; }

export function start(cb) {
  onNavigate = cb;
  addEventListener("hashchange", resolve);
  resolve();
}

export async function resolve() {
  const { path, query, raw } = parse(location.hash);
  const leaving = current ? current.href : null;
  const destHref = location.href;
  const wasSameRoute = current && current.raw === raw;
  current = { path, query, raw, href: destHref };

  // Leaving a route that is not the one being rendered: remember where we were,
  // keyed by the URL we are LEAVING, so coming back lands in the right place.
  if (leaving && leaving !== destHref) rememberScroll(leaving);

  // Back or Forward puts the reader back where they were. Otherwise the page
  // they return to starts at its first line - on a library chapter that is
  // 36,000 characters and several screens from where they actually were.
  const isPop = consumePop();
  const recalled = isPop && !wasSameRoute ? recalledScroll(destHref) : null;

  for (const r of routes) {
    if (r.parts.length !== path.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < r.parts.length; i++) {
      const p = r.parts[i];
      if (p.startsWith(":")) params[p.slice(1)] = path[i];
      else if (p !== path[i]) { ok = false; break; }
    }
    if (!ok) continue;
    await r.handler({ params, query, path, recalled });
    if (onNavigate) onNavigate(current);
    return true;
  }
  return false;
}

/** Build an href for a route, preserving nothing else. */
export function href(to) {
  return "#/" + String(to).replace(/^\/+/, "");
}