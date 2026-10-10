#!/usr/bin/env node
/**
 * serve.mjs — local static server for development and testing.
 *
 * There is no build step and no dependency. This exists only because service
 * workers and ES modules need an http(s) origin, not a file:// path.
 *
 *   node scripts/serve.mjs [port]      # default 8080
 *
 * The deployed site on GitHub Pages is static; this is not part of it.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve, normalize } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The static site lives in `docs/` because GitHub Pages (branch-based
 * publishing) only accepts `/` or `/docs` as a source path. Everything inside
 * uses relative URLs, so the same files run unchanged from a local server and
 * from https://<user>.github.io/<repo>/
 */
const ROOT = resolve(fileURLToPath(new URL("../docs", import.meta.url)));
const PORT = Number(process.argv[2] || process.env.PORT || 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";

    // Contain everything under app/. Normalize first, then verify the prefix.
    const target = normalize(join(ROOT, pathname));
    if (!target.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    let info;
    try {
      info = await stat(target);
    } catch {
      res.writeHead(404, { "content-type": "text/plain" }).end("Not found: " + pathname);
      return;
    }
    if (info.isDirectory()) {
      res.writeHead(301, { location: pathname + "/" }).end();
      return;
    }

    const body = await readFile(target);
    const rel = pathname.replace(/^\/+/, "");

    // The service worker script must never be served from cache. The browser
    // reuses a byte-identical registration without re-running `install`, so a
    // cached sw.js makes code changes appear not to take effect — which during
    // development cost real time chasing a bug that was only a stale worker.
    const isServiceWorker = rel === "sw.js";

    res.writeHead(200, {
      "content-type": TYPES[extname(target).toLowerCase()] || "application/octet-stream",
      "cache-control": isServiceWorker ? "no-store, max-age=0" : "no-cache",
      // Let the worker control the whole origin regardless of the page path.
      ...(isServiceWorker ? { "service-worker-allowed": "/" } : {}),
      "content-length": body.length,
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" }).end("Server error: " + err.message);
  }
});

server.listen(PORT, () => {
  console.log(`IT Field Manual — http://localhost:${PORT}/`);
  console.log(`serving ${ROOT}`);
});