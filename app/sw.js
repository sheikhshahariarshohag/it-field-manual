/**
 * sw.js — offline cache.
 *
 * Strategy, stated plainly:
 *   - The app shell (HTML/CSS/JS/manifest/icons) is precached on install.
 *   - The reference library (data/*.json) is precached too, so search works
 *     with no network. This is the whole point of the app.
 *   - Navigations: network first, fall back to the cached shell. A stale copy
 *     beats a blank page when you are in a server room with no signal.
 *   - Everything else: cache first, then network, and refresh the cache in the
 *     background so an update lands on the next launch.
 *
 * There are no runtime API calls to a server and nothing is ever uploaded, so
 * there is no private data in this cache to worry about. Personal notes and
 * progress live in IndexedDB, which the service worker never touches.
 */

const VERSION = "v2";
const SHELL_CACHE = `field-manual-shell-${VERSION}`;
const DATA_CACHE = `field-manual-data-${VERSION}`;

const SHELL = [
  "index.html",
  "manifest.webmanifest",
  "assets/app.css",
  "assets/app.js",
  "assets/ui.js",
  "assets/db.js",
  "assets/search.js",
  "assets/router.js",
  "assets/views.js",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
];

const DATA = [
  "data/commands/index.json",
  "data/lessons/index.json",
  "data/lessons/services.json",
  "data/scenarios/index.json",
  "data/quizzes/index.json",
  "data/projects/index.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => caches.open(DATA_CACHE))
      .then((c) => c.addAll(DATA))
      // Do NOT skipWaiting here. A new worker waits so the page can tell the
      // user an update is ready rather than swapping files underneath a page
      // they might be mid-way through filling in.
      .catch((err) => {
        // One missing asset must not leave the app with no offline cache.
        console.error("[field-manual] precache incomplete:", err);
        return Promise.all([
          caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)),
          caches.open(DATA_CACHE).then((c) => c.addAll(DATA)),
        ]);
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith("field-manual-") && k !== SHELL_CACHE && k !== DATA_CACHE)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim())
      // Repair pass. Found during testing: if the caches are cleared or evicted
      // (storage pressure, "clear site data", a partial install) while this
      // worker stays registered and byte-identical, install never runs again and
      // offline support is silently gone. Verify and top up on every activate.
      .then(repairCaches),
  );
});

async function repairCaches() {
  try {
    for (const [cacheName, list] of [[SHELL_CACHE, SHELL], [DATA_CACHE, DATA]]) {
      const cache = await caches.open(cacheName);
      const have = new Map();
      for (const req of await cache.keys()) have.set(new URL(req.url).pathname, req);

      const missing = [];
      for (const p of list) {
        const key = new URL(p, self.location.origin).pathname;
        const req = have.get(key);
        // Re-fetch anything missing AND anything that was cached while the
        // origin was returning errors (an empty or truncated body is poison).
        if (!req) { missing.push(p); continue; }
        try {
          const res = await cache.match(req);
          const buf = res ? await res.clone().arrayBuffer() : null;
          if (!buf || buf.byteLength < 32) missing.push(p);
        } catch (_) {
          missing.push(p);
        }
      }
      if (!missing.length) continue;

      await Promise.all(missing.map(async (p) => {
        try {
          const res = await fetch(new Request(p, { cache: "reload" }));
          if (res.ok && res.type === "basic") await cache.put(p, res);
        } catch (_) { /* offline during repair; the next activate will retry */ }
      }));
    }
  } catch (err) {
    console.error("[field-manual] cache repair failed:", err);
  }
}

/** Ask the waiting worker to take over, then reload onto the new version. */
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Navigations: try the network so updates land, fall back to the cached shell.
  //
  // A dead origin does not always produce a network error — a proxy or load
  // balancer commonly answers 502 instead. That is still a failure, so any
  // non-OK response is treated as one. Caching it would overwrite a perfectly
  // good copy of the shell with an error page and destroy offline support,
  // which is exactly what happened during testing.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (!res || !res.ok || res.type !== "basic") {
            throw new Error("navigation failed: " + (res ? res.status : "no response"));
          }
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("index.html", copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match("index.html").then((r) => r || new Response(
            "<!doctype html><meta charset=utf-8><title>Offline</title>" +
            "<p>This page is not available offline yet. Open it once while connected.",
            { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
          )),
        ),
    );
    return;
  }

  // Everything else: cache first, refresh in the background.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            const cacheName = url.pathname.includes("/data/") ? DATA_CACHE : SHELL_CACHE;
            caches.open(cacheName).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});