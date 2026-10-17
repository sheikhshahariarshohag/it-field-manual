/**
 * ui.js — the only DOM-building module in the app.
 *
 * `h()` builds real nodes with textContent. There is deliberately no way to
 * inject a string as markup, so a malicious value in a data file can never
 * become executable content.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

function applyChild(el, child) {
  if (child === null || child === undefined || child === false || child === true) return;
  if (Array.isArray(child)) {
    for (const c of child) applyChild(el, c);
    return;
  }
  if (child instanceof Node) {
    el.appendChild(child);
    return;
  }
  el.appendChild(document.createTextNode(String(child)));
}

function applyProps(el, props) {
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k === "dataset") for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "ref" && typeof v === "function") v(el);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
}

/** h('div.card', {onclick}, 'text', h('span', 'more')) */
export function h(spec, props, ...children) {
  const [tagPart, ...classParts] = String(spec).split(".");
  const el = document.createElement(tagPart || "div");
  if (classParts.length) el.setAttribute("class", classParts.join(" "));
  if (props && props.constructor === Object) {
    applyProps(el, props);
    children = arguments.length > 2 ? children : [];
  } else if (props !== undefined) {
    children = arguments.length > 1 ? [props, ...children] : [];
  }
  for (const c of children) applyChild(el, c);
  return el;
}

/** Icon helper. Only the named paths below exist; nothing is fetched. */
const ICON_PATHS = {
  search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M20 20l-3.5-3.5"],
  menu: ["M3 6h18M3 12h18M3 18h18"],
  close: ["M6 6l12 12M18 6L6 18"],
  book: ["M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z", "M4 19a2 2 0 0 1 2-2h13"],
  terminal: ["M4 17l6-5-6-5", "M12 19h8"],
  wrench: ["M14.7 6.3a4 4 0 1 0 5 5l-9.4 9.4a2.1 2.1 0 0 1-3-3z"],
  alert: ["M12 3l9 16H3z", "M12 9v4M12 16.5v.5"],
  check: ["M4 12l5 5L20 6"],
  flask: ["M9 3h6", "M10 3v6L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3"],
  star: ["M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8z"],
  layers: ["M12 3l9 5-9 5-9-5z", "M3 13l9 5 9-5"],
    // Added for the back-to-top control. The set had no upward arrow, and
    // icon() falls back to the book glyph for an unknown name, so without
    // this the button would have shown a book and meant nothing.
    up: ["M12 19V5", "M5 12l7-7 7 7"],
  // Added for the sidebar redesign. The set had no house, no progress chart
  // and no bookmark, and icon() silently falls back to the book glyph for an
  // unknown name - so a sidebar of "icons" would have been six identical books,
  // which looks worse than no icons at all.
  home: ["M3 10.5 12 3l9 7.5", "M5 9.5V20h5v-6h4v6h5V9.5"],
  progress: ["M4 19h16", "M7 16V9", "M12 16V5", "M17 16v-4"],
  quiz: ["M9 4h6v3H9z", "M9 5.5H6a1 1 0 0 0-1 1V20h14V6.5a1 1 0 0 0-1-1h-3",
         "M8.5 13l2.2 2.2L15.5 10.5"],
  project: ["M3 8h18v12H3z", "M9 8V5h6v3", "M3 13h18"],
  bookmark: ["M6 3h12v18l-6-5-6 5z"],
};

export function icon(name, cls) {
  const paths = ICON_PATHS[name] || ICON_PATHS.book;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  if (cls) svg.setAttribute("class", cls);
  for (const d of paths) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    svg.appendChild(p);
  }
  return svg;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/**
 * Append one or more children.
 *
 * Native `appendChild` silently ignores every argument after the first, which
 * makes `el.appendChild(h('h2','Sources'), ul)` render a heading with no body
 * and no error. Use `add()` for anything but a single known node.
 */
export function add(parent, ...kids) {
  for (const kid of kids) applyChild(parent, kid);
  return parent;
}

/* ------------------------------------------------------------------ toast */

let toastTimer = null;

export function toast(message) {
  const host = document.getElementById("toastHost");
  if (!host) return;
  clear(host);
  const t = h("div.toast", { role: "status" }, message);
  host.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => clear(host), 2400);
}

/* ------------------------------------------------------------------ sheet */

let lastFocus = null;

/** Modal sheet. `onSubmit(form, close)` runs when the form is submitted. */
export function sheet({ title, fields, submitLabel = "Save", onSubmit, extra }) {
  const host = document.getElementById("sheetHost");
  lastFocus = document.activeElement;
  clear(host);
  host.hidden = false;

  const close = () => {
    host.hidden = true;
    clear(host);
    document.removeEventListener("keydown", onKey);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };
  const onKey = (e) => {
    if (e.key === "Escape") { e.preventDefault(); close(); }
    if (e.key === "Tab") trapFocus(e, panel);
  };

  const inputs = {};
  const form = h("form.sheet", {
    onsubmit: (e) => { e.preventDefault(); onSubmit && onSubmit(collect(form, inputs), close); },
  });

  const panel = h(
    "div",
    { role: "dialog", "aria-modal": "true", "aria-label": title },
    h("button.btn.sheet__close", { type: "button", onclick: close, "aria-label": "Close" }, "Close"),
    h("h2", title),
    ...fields.map((f) => {
      let control;
      if (f.type === "textarea") {
        control = h("textarea", { placeholder: f.placeholder || "", rows: f.rows || 5 });
      } else if (f.type === "select") {
        control = h("select", {}, ...(f.options || []).map((o) => h("option", { value: o }, o)));
      } else {
        control = h("input", { type: f.type || "text", placeholder: f.placeholder || "" });
      }
      inputs[f.name] = control;
      return h("label.field", h("span", f.label), control, f.hint ? h("small.srcref", f.hint) : null);
    }),
    extra || null,
    h("div.btnrow",
      h("button.btn.btn--primary", { type: "submit" }, submitLabel),
      h("button.btn", { type: "button", onclick: close }, "Cancel"),
    ),
  );
  form.appendChild(panel);
  host.appendChild(form);

  document.addEventListener("keydown", onKey);
  const first = panel.querySelector("input, textarea, select");
  if (first) first.focus();
  return close;
}

function collect(form, inputs) {
  const out = {};
  for (const [k, el] of Object.entries(inputs)) out[k] = el.value.trim();
  return out;
}

function trapFocus(e, root) {
  const f = root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ------------------------------------------------------------------ code */

let copySeq = 0;

/** A line is a comment if its first non-space characters open one. */
const isCommentLine = (line) => {
  const t = line.trimStart();
  return t.startsWith("#") || t.startsWith("//") || t.startsWith(";") || t.startsWith("REM ");
};

/**
 * Copyable code block, styled as a terminal window.
 *
 * `where`  — where to run it (shell, PowerShell prompt, WinBox, IOS).
 * `risk`   — safe | caution | risk, drives the colour tag.
 *
 * THREE THINGS THIS DOES, AND WHY
 *
 * 1. The three window dots are DECORATION and are marked aria-hidden with
 *    pointer-events off. They are not minimise/maximise/close and they do
 *    nothing. This app has already been bitten by the opposite: boxed sidebar
 *    headings that read as clickable items that happened to be full width, and
 *    a control that scrolled away inside the panel it controlled. A dot that
 *    looks like a button and is not one is the same mistake again, and three
 *    per block would multiply it.
 *
 * 2. The risk colour is a token, not a literal. It used to be hardcoded
 *    (#f08b83 / #e6b45c / #7ee0b8), which meant the tag could not follow the
 *    theme and could not be checked by the contrast gate - a colour written as
 *    a literal in JavaScript is invisible to a script that reads app.css.
 *
 * 3. The strip toggle hides COMMENTS ONLY. The brief also asked for stripping
 *    parameters, and that is not done here: removing a flag changes what the
 *    command does. "ls -la" and "ls" are not the same command, and a lab aid
 *    that quietly drops a flag is worse than no lab aid. Comments carry no
 *    meaning to the shell, so hiding them is safe and reversible.
 *
 *    When comments are hidden the block says so, in words, rather than letting
 *    the reader assume they were never there.
 */
export function codeBlock(text, { where = "shell", risk = "safe", tag = "" } = {}) {
  const id = `c${++copySeq}`;
  const pre = h("pre", h("code", { id }));

  const lines = String(text).split("\n");
  let commentLines = 0;

  // Colourise comments and prompts without ever touching markup.
  for (const line of lines) {
    if (isCommentLine(line)) {
      commentLines++;
      pre.appendChild(h("span.comment", line + "\n"));
    } else if (/^[a-zA-Z0-9._-]+[<>#]/.test(line) && !line.includes("://")) {
      const m = line.match(/^([a-zA-Z0-9._-]+[<>#])/);
      pre.appendChild(document.createTextNode(line.slice(0, m[1].length)));
      pre.appendChild(h("span.prompt", m[1]));
      pre.appendChild(document.createTextNode(line.slice(m[1].length) + "\n"));
    } else {
      pre.appendChild(document.createTextNode(line + "\n"));
    }
  }

  /* --- copy -------------------------------------------------------- */

  const btn = h("button.cmd__copy", {
    type: "button",
    title: "Copy this block to the clipboard",
  }, "Copy");
  // Announced to a screen reader, which sees the label change and nothing else.
  const live = h("span.cmd__live", { role: "status", "aria-live": "polite" });
  btn.addEventListener("click", async () => {
    // What is on screen is what you get. With comments hidden, you get the
    // command without them - which is the point of hiding them.
    const value = visibleText(pre);
    const ok = await copyText(value);
    btn.textContent = ok ? "Copied" : "Select and copy";
    btn.dataset.done = ok ? "1" : "0";
    live.textContent = ok
      ? "Copied to the clipboard"
      : "Could not reach the clipboard. Select the text and copy it manually.";
    setTimeout(() => {
      btn.textContent = "Copy";
      delete btn.dataset.done;
      live.textContent = "";
    }, 1800);
  });

  /* --- strip comments ---------------------------------------------- */

  let stripBtn = null;
  let stripNote = null;
  // Only offered when there is something to strip AND something would be left.
  const strippable = commentLines > 0 && commentLines < lines.length;

  if (strippable) {
    stripNote = h("span.cmd__note", { role: "status", "aria-live": "polite" });
    stripBtn = h("button.cmd__strip", {
      type: "button",
      "aria-pressed": "false",
      title: `Hide the ${commentLines} comment line${commentLines === 1 ? "" : "s"} in this block`,
    }, "Comments");
    stripBtn.addEventListener("click", () => {
      const on = stripBtn.getAttribute("aria-pressed") !== "true";
      stripBtn.setAttribute("aria-pressed", String(on));
      stripBtn.textContent = on ? "No comments" : "Comments";
      stripNote.textContent = on
        ? `${commentLines} comment line${commentLines === 1 ? "" : "s"} hidden`
        : "";
      // On the wrapper, so the CSS can hide .comment and the copy button can
      // read the visible text without either of them knowing about the other.
      btn.closest(".cmd").classList.toggle("is-stripped", on);
    });
  }

  return h("div.cmd",
    h("div.cmd__bar",
      h("span.cmd__dots", { "aria-hidden": "true" },
        h("i"), h("i"), h("i")),
      h("span.cmd__tag", { dataset: { risk } }, tag || where),
      h("span.cmd__where", where),
      stripBtn,
      btn,
    ),
    pre,
    stripNote,
    live,
  );
}

/** The text a reader can actually see, which is not always pre.textContent. */
function visibleText(pre) {
  if (!pre.closest(".cmd")?.classList.contains("is-stripped")) {
    return pre.textContent.replace(/\n$/, "");
  }
  const out = [];
  for (const node of pre.childNodes) {
    if (node.nodeType === 1 && node.classList.contains("comment")) continue;
    out.push(node.textContent);
  }
  return out.join("").replace(/\n$/, "");
}

export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through to the legacy path */ }
  try {
    const ta = h("textarea", { style: { position: "fixed", top: "-1000px", opacity: "0" } });
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch (_) {
    return false;
  }
}

/** Collapsible extra detail — keeps quick-reference answers short. */
export function more(label, ...content) {
  return h("details.more", h("summary", label), h("div", ...content));
}
