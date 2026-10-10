/**
 * db.js — private, on-device storage.
 *
 * Everything here is PERSONAL data (notes, bookmarks, quiz answers, progress).
 * It never leaves the browser and is never written into the repository.
 * Content shipped by the app is static JSON, not stored here.
 *
 * Falls back to an in-memory shim when IndexedDB is unavailable (private mode,
 * some embedded browsers) so the app degrades instead of crashing — the banner
 * tells the user their data will not survive a reload.
 */

const DB_NAME = "it-field-manual";
const DB_VERSION = 1;
const STORES = ["notes", "bookmarks", "progress", "quiz"];

let dbPromise = null;
let memoryFallback = null;

function memoryShim() {
  if (memoryFallback) return memoryFallback;
  memoryFallback = { __mem: new Map() };
  for (const s of STORES) memoryFallback.__mem.set(s, new Map());
  return memoryFallback;
}

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (!("indexedDB" in window)) return resolve(null);
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (_) {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

/**
 * Run one operation inside a transaction and return its value.
 *
 * Each helper issues exactly one request and resolves from that request's
 * success event, so the continuation runs as a microtask while the transaction
 * is still live. An earlier version resolved from `oncomplete` instead, which
 * silently returned `undefined` for every read — notes and bookmarks appeared
 * to save and then vanished on reload.
 */
async function tx(storeName, mode, fn) {
  const db = await open();
  if (!db) {
    const shim = memoryShim();
    const s = shim.__mem.get(storeName);
    return fn({
      get: async (k) => s.get(k),
      put: async (v) => { s.set(v.key, v); return v.key; },
      delete: async (k) => { s.delete(k); },
      all: async () => [...s.values()],
    });
  }
  const t = db.transaction(storeName, mode);
  const store = t.objectStore(storeName);
  const result = await fn({
    get: (k) => request(store.get(k)),
    put: (v) => request(store.put(v)).then(() => v.key),
    delete: (k) => request(store.delete(k)),
    all: () => request(store.getAll()),
  });
  return result;
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store, key, value) {
  return tx(store, "readwrite", (s) => s.put({ key, ...value, updated_at: Date.now() }));
}

export async function get(store, key) {
  const r = await tx(store, "readonly", (s) => s.get(key));
  return r || null;
}

export async function all(store) {
  const r = await tx(store, "readonly", (s) => s.all());
  return Array.isArray(r) ? r : [];
}

export async function remove(store, key) {
  return tx(store, "readwrite", (s) => s.delete(key));
}

export async function isDurable() {
  return (await open()) !== null;
}

/* ------------------------------------------------------------------ api */

export const store = {
  /** Notes keyed by content id. */
  async note(id, text) {
    if (text === undefined) {
      const r = await get("notes", id);
      return r ? r.text : "";
    }
    if (text === "") return remove("notes", id);
    return put("notes", id, { text });
  },
  async notes() {
    return all("notes");
  },

  /** Bookmarks: ids only, so the export stays tiny. */
  async isBookmarked(id) {
    return !!(await get("bookmarks", id));
  },
  /** Returns the new state as a boolean — callers set aria-pressed from this. */
  async toggleBookmark(id) {
    if (await get("bookmarks", id)) {
      await remove("bookmarks", id);
      return false;
    }
    await put("bookmarks", id, {});
    return true;
  },
  async bookmarks() {
    return (await all("bookmarks")).map((r) => r.key);
  },

  /** Progress: { id, status, score, updated_at } */
  async setProgress(id, patch) {
    const cur = (await get("progress", id)) || { id };
    return put("progress", id, { ...cur, ...patch });
  },
  async progress() {
    return all("progress");
  },

  /** Quiz answers: { id, answers, score, submitted_at } */
  async saveQuiz(id, patch) {
    const cur = (await get("quiz", id)) || { id };
    return put("quiz", id, { ...cur, ...patch });
  },
  async quizzes() {
    return all("quiz");
  },

  async wipe() {
    const db = await open();
    if (db) {
      for (const s of STORES) {
        await new Promise((res, rej) => {
          const t = db.transaction(s, "readwrite");
          const req = t.objectStore(s).clear();
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        });
      }
    }
    memoryFallback = null;
  },
};

/* ------------------------------------------------------------------ export */

export const EXPORT_FORMAT = "it-field-manual/personal";
export const EXPORT_VERSION = 1;

/**
 * Export everything personal to one portable JSON file.
 * Deliberately human-readable: if this format ever breaks, the file is still
 * a plain list of notes, bookmarks and scores you could read by hand.
 */
export async function exportPersonal() {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    durable: await isDurable(),
    notes: (await store.notes()).map((r) => ({ id: r.key, text: r.text, updated_at: r.updated_at })),
    bookmarks: await store.bookmarks(),
    progress: (await store.progress()).map(({ key, ...rest }) => rest),
    quiz: (await store.quizzes()).map(({ key, ...rest }) => rest),
  };
}

export class ImportError extends Error {}

/**
 * Import a personal-data file. Validates thoroughly and reports every problem
 * it found instead of importing a partial, half-broken state.
 */
export async function importPersonal(raw) {
  let data;
  try {
    data = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (_) {
    throw new ImportError("That file is not valid JSON.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ImportError("Expected a JSON object at the top level.");
  }
  if (data.format !== EXPORT_FORMAT) {
    throw new ImportError(
      `Unrecognised format "${String(data.format).slice(0, 40)}". This file was not produced by the IT Field Manual.`
    );
  }
  if (Number(data.version) > EXPORT_VERSION) {
    throw new ImportError(`File version ${data.version} is newer than this app supports (${EXPORT_VERSION}).`);
  }

  const problems = [];
  const arr = (v, name, max) => {
    if (v === undefined) return [];
    if (!Array.isArray(v)) { problems.push(`"${name}" must be a list`); return []; }
    if (v.length > max) { problems.push(`"${name}" has more than ${max} entries — refusing to import`); return []; }
    return v;
  };

  const notes = arr(data.notes, "notes", 100000).filter((n) => {
    if (!n || typeof n.id !== "string" || typeof n.text !== "string") {
      problems.push("A notes entry was missing an id or text and was skipped");
      return false;
    }
    if (n.text.length > 20000) { problems.push(`A note for "${n.id}" was too large and was skipped`); return false; }
    return true;
  });

  const bookmarks = arr(data.bookmarks, "bookmarks", 100000).filter((b) => {
    if (typeof b !== "string") { problems.push("A bookmark id was not a string and was skipped"); return false; }
    return true;
  });

  const progress = arr(data.progress, "progress", 100000).filter((p) => {
    if (!p || typeof p.id !== "string") { problems.push("A progress entry was missing an id and was skipped"); return false; }
    return true;
  });

  const quiz = arr(data.quiz, "quiz", 100000).filter((q) => {
    if (!q || typeof q.id !== "string") { problems.push("A quiz entry was missing an id and was skipped"); return false; }
    return true;
  });

  for (const n of notes) await store.note(n.id, n.text);
  for (const b of bookmarks) await store.toggleBookmark(b).catch(() => {});
  for (const p of progress) await store.setProgress(p.id, { status: p.status, score: p.score });
  for (const q of quiz) await store.saveQuiz(q.id, { answers: q.answers, score: q.score, submitted_at: q.submitted_at });

  return {
    notes: notes.length,
    bookmarks: bookmarks.length,
    progress: progress.length,
    quiz: quiz.length,
    problems,
  };
}