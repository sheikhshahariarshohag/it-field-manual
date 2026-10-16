/**
 * translate.js — optional Bangla translation, on top of Google's free
 * "Website Translator" widget.
 *
 * WHY THIS IS OPT-IN AND LAZY
 * The rest of the app is deliberately offline-first and claims "no account, no
 * tracking" (index.html footer, app.js build stamp). Google's widget is the
 * opposite: it needs a network connection and it loads Google scripts that see
 * the page text being translated. So the widget is NOT loaded on a normal
 * visit. Nothing is requested from Google until the reader actually picks
 * Bangla. An English-only reader never contacts Google at all.
 *
 * WHY THE COMBO HACK EXISTS
 * This is a hash-router SPA (router.js). Every navigation tears the page body
 * out and rebuilds it (app.js render() -> clear(main)), so text nodes added
 * after the widget initialises would stay in English. The classic widget has
 * no public "retranslate" API, but it does expose a hidden <select
 * class="goog-te-combo">; selecting a language and dispatching `change` makes
 * it re-scan and translate the current document. reapply() reruns that after
 * every render, debounced so typing in the search box does not thrash it.
 *
 * KNOWN LIMITATIONS (documented, not hidden)
 *   - Needs the network; it does nothing offline.
 *   - Machine translation mangles technical content. Command names, flags,
 *     paths and code blocks are exactly the strings a translator gets wrong,
 *     and Google translates whatever it finds in the DOM.
 *   - It is a legacy Google product. The endpoint below is the one that still
 *     answers, but Google could retire it. If it stops responding, the button
 *     fails soft: initTranslate/apply simply never enable translation and the
 *     app keeps working in English.
 */

const LANG_KEY = "field-manual:lang";
const ELEMENT_ID = "google_translate_element";
const SCRIPT_SRC = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

/** Current language: "en" (default) or "bn". */
let lang = "en";
let loading = false;
let ready = false;
let pending = false;
let reapplyTimer = null;

export function getLang() {
  return lang;
}

function readSaved() {
  try { return localStorage.getItem(LANG_KEY) === "bn" ? "bn" : "en"; }
  catch (_) { return "en"; }
}

function writeSaved(v) {
  try {
    if (v === "bn") localStorage.setItem(LANG_KEY, "bn");
    else localStorage.removeItem(LANG_KEY);
  } catch (_) { /* private mode */ }
}

/**
 * Drive Google's own cookie. The widget reads `googtrans` on load and
 * auto-translates to the code it finds there, which is what makes the choice
 * survive a full page reload (the reload setLang performs). Clearing it is
 * what makes a switch back to English actually stick.
 *
 * Written for both "/" and the current directory, because the widget and the
 * README disagree about the default path and a cookie set under one path does
 * not clear the other.
 */
function setCookie(v) {
  const value = v === "bn" ? "/en/bn" : "";
  const exp = v === "bn" ? "" : ";expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const dir = location.pathname.replace(/[^/]*$/, "") || "/";
  for (const path of new Set(["/", dir])) {
    document.cookie = `googtrans=${value};path=${path}${exp}`;
  }
}

/** Create the widget host and pull in Google's script, exactly once. */
function ensureScript() {
  if (ready || loading) return;
  loading = true;

  const host = document.createElement("div");
  host.id = ELEMENT_ID;
  host.className = "gtranslate";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);

  // The widget calls this global by name (see `cb=` above).
  window.googleTranslateElementInit = () => {
    try {
      new window.google.translate.TranslateElement({
        pageLanguage: "en",
        includedLanguages: "bn",
        autoDisplay: false,
      }, ELEMENT_ID);
      ready = true;
    } catch (err) {
      console.warn("[field-manual] translate init failed:", err);
    }
    if (pending) { pending = false; apply(); }
  };

  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  s.onerror = () => {
    loading = false;
    console.warn("[field-manual] translate script did not load (offline, blocked, or retired)");
  };
  document.head.appendChild(s);
}

/** Select Bangla in the widget and let it re-scan the current document. */
function apply() {
  if (lang !== "bn") return;
  if (!ready) { pending = true; ensureScript(); return; }

  const combo = document.querySelector(".goog-te-combo");
  if (!combo) {
    // The widget builds its UI asynchronously; try again shortly.
    pending = true;
    setTimeout(apply, 300);
    return;
  }
  combo.value = "bn";
  combo.dispatchEvent(new Event("change"));
}

/** Called once on boot. Restores a previously chosen language. */
export function initTranslate() {
  lang = readSaved();
  if (lang === "bn") {
    setCookie("bn");
    ensureScript();
    apply();
  }
}

/**
 * Called after every render. Reruns the widget so freshly rendered nodes are
 * translated too, debounced to survive the search box re-rendering per keypress.
 */
export function reapply() {
  if (lang !== "bn") return;
  clearTimeout(reapplyTimer);
  reapplyTimer = setTimeout(apply, 250);
}

/**
 * Change the language. Reloads so the widget applies to (or is dropped from) a
 * clean document — the widget has no clean way to un-translate in place.
 */
export function setLang(next) {
  if (next !== "bn" && next !== "en") return;
  lang = next;
  writeSaved(next);
  setCookie(next);
  location.reload();
}
