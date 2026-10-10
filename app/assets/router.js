/**
 * router.js — hash router.
 *
 * Hash routing (not the History API) so the app works when opened directly from
 * a file:// path or served from any subdirectory, with no server rewrite rules.
 */

const routes = [];
let current = null;
let onNavigate = null;

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
  current = { path, query, raw };

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
    await r.handler({ params, query, path });
    if (onNavigate) onNavigate(current);
    return true;
  }
  return false;
}

/** Build an href for a route, preserving nothing else. */
export function href(to) {
  return "#/" + String(to).replace(/^\/+/, "");
}