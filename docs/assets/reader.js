/**
 * reader.js — the ONE chapter reading experience.
 *
 * WHY THIS EXISTS
 * Before, each kind of long content built its own layout:
 *
 *   studyUnitView          flat div.study__body, no contents list, no way to
 *                          jump except scrolling or leaving
 *   knowledgeSessionView   a row of buttons, each opening one section, so a
 *                          topic with 20 sections became a wall of buttons and
 *                          could not be read as a document
 *   libraryChapterView     a pre block of raw book text
 *
 * Three layouts for the same job, none of them a textbook. This module is the
 * single replacement: one grid, one generated table of contents, one set of
 * learning components, used by every subject and every future chapter.
 *
 * DESIGN RULES
 *   - the contents list is GENERATED from the headings in the document. There
 *     is no hand-maintained list anywhere, so a new chapter gets a contents
 *     list the moment it has headings, and none at all if it has none.
 *   - nothing is hardcoded per chapter, per subject or per heading text. The
 *     only thing the caller supplies is a list of sections and a builder for
 *     each one's content.
 *   - the reading column never narrows below a comfortable measure, whatever
 *     the viewport. If the sidebar would squeeze it, the sidebar collapses.
 *   - deep links go in the query string (`?s=sec-12`), not a second `#`. The
 *     router already splits on `?`, so a second hash would be read as another
 *     path segment and break every route.
 *   - keyboard and screen-reader operable throughout. The mobile drawer is a
 *     real disclosure with aria-expanded, closes on Escape, and returns focus
 *     to the button that opened it.
 */
import { h } from "./ui.js";

/* --------------------------------------------------------------- helpers */

/** A stable, URL-safe id from a heading's text. Never returns empty. */
export function slugify(text, fallback) {
  const s = String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  return s || fallback || "section";
}

/** The offset a heading should land below, clearing the sticky header. */
const HEADER_OFFSET = () => {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--topbar-h");
  const n = parseInt(v, 10);
  return (Number.isFinite(n) ? n : 60) + 16;
};

/** Is the visitor asking for reduced motion? */
function reducedMotion() {
  try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (_) { return false; }
}

/* ============================================================ the reader */

/**
 * Build the chapter reader.
 *
 * @param {object}   opts
 * @param {string}   opts.routeBase  route for this chapter, e.g. "study/rh134-09".
 *                                    Used only to build shareable deep links.
 * @param {Array}    opts.sections   [{ id?, level?, title, kicker?, build }].
 *                                    `build` returns the section's content node.
 * @param {Node}     [opts.rail]     optional right-hand contextual panel.
 * @param {Node}     [opts.before]   optional node placed above the document.
 * @param {Node}     [opts.after]    optional node placed below the document.
 * @param {string}   [opts.fragment] a section id to scroll to on first render.
 * @param {string[]} [opts.tocTitle] accessible names for the contents controls.
 * @returns {Node}
 */
export function chapterReader(opts) {
  const {
    routeBase = "", sections = [], rail = null,
    before = null, after = null, fragment = null,
  } = opts;

  const root = h("div.rd");
  if (rail) root.classList.add("rd--with-rail");

  /* ------------------------------------------------------- contents list */

  const tocList = h("ol.rd-toc__list");
  const tocAside = h("aside.rd-toc", { id: "rd-toc" },
    h("p.rd-toc__hd", "Contents"),
    tocList);
  const tocBody = h("div.rd-toc__body", tocAside);

  /* -------------------------------------------------------- the document */

  const main = h("article.rd-main");
  const sectionsWrap = h("div.rd-sects");

  /** Every navigable target, in document order. */
  const targets = [];

  sections.forEach((sec, si) => {
    const sid = sec.id || `s${si + 1}`;
    const node = h("section.rd-s", { id: sid, "data-rd": sid });
    const level = sec.level || 2;

    const head = h(level === 2 ? "h2.rd-h.rd-h--2" : "h3.rd-h.rd-h--3", { id: `${sid}-h` });
    if (sec.kicker) head.appendChild(h("span.rd-h__kicker", sec.kicker));
    head.appendChild(h("span.rd-h__text", sec.title));
    node.appendChild(head);

    const body = h("div.rd-s__body");
    let built = null;
    try {
      built = typeof sec.build === "function" ? sec.build() : sec.content;
    } catch (err) {
      // A single broken section must not take the whole chapter down.
      body.appendChild(h("div.note.note--risk",
        h("strong", "This section could not be rendered"),
        h("span", String((err && err.message) || err))));
      built = null;
    }
    if (built) body.appendChild(built);
    node.appendChild(body);
    sectionsWrap.appendChild(node);

    targets.push({ level, id: sid, text: sec.title, el: node, top: head });

    // Nested headings inside this section become second-level contents
    // entries. This is what makes a 57-section chapter navigable: the section
    // list is long, but each one can be opened straight to its sub-parts.
    for (const el of body.querySelectorAll(".rd-h")) {
      const lv = el.tagName === "H4" ? 4 : 3;
      if (!el.id) el.id = `${sid}-${slugify(el.textContent, `h${targets.length}`)}`;
      targets.push({ level: lv, id: el.id, text: el.textContent.trim(), el, top: el, parent: sid });
    }
  });

  main.appendChild(sectionsWrap);
  if (after) main.appendChild(after);

  /* ------------------------------------------------------ build the TOC */

  /**
   * The contents list, nested by heading level.
   *
   * Built from `targets`, which came from the rendered document. Nothing here
   * is authored by hand, so it cannot drift out of date.
   */
  function buildToc() {
    tocList.textContent = "";
    const byId = new Map();

    for (const t of targets) {
      const item = h("li.rd-toc__item", { "data-level": String(t.level) });
      const link = h("a.rd-toc__link", { href: deepHref(t.id) }, h("span", t.text));
      link.addEventListener("click", (ev) => onTocClick(ev, t));
      item.appendChild(link);
      item.__target = t;
      byId.set(t.id, item);

      if (!t.parent) {
        tocList.appendChild(item);
      } else {
        const host = byId.get(t.parent);
        if (host) {
          let sub = host.querySelector("ol.rd-toc__sub");
          if (!sub) {
            sub = h("ol.rd-toc__sub");
            host.appendChild(sub);
          }
          sub.appendChild(item);
        } else {
          tocList.appendChild(item);
        }
      }
    }
  }

  /* --------------------------------------------------------- deep links */

  const deepHref = (id) => (routeBase ? `#/${routeBase}?s=${encodeURIComponent(id)}` : `#s-${id}`);

  /**
   * A contents click scrolls rather than re-rendering.
   *
   * The href is still written into the address bar so the link can be copied,
   * bookmarked and shared, and so a refresh lands in the same place - but the
   * default navigation is suppressed because letting the router rebuild a
   * 6,000-word chapter on every jump would throw away the reading position and
   * flicker the whole page.
   */
  function onTocClick(ev, t) {
    ev.preventDefault();
    const url = deepHref(t.id);
    try { history.replaceState(null, "", url); } catch (_) { /* file:// */ }
    closeDrawer();
    scrollToTarget(t.id, true);
  }

  function scrollToTarget(id, focusHeading) {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET();
    jumpTo(top);
    if (focusHeading) {
      const hd = el.querySelector(".rd-h") || el;
      hd.setAttribute("tabindex", "-1");
      hd.focus({ preventScroll: true });
    }
    markActive(id);
  }

  /**
   * Scroll, then check that it happened.
   *
   * `behavior: "smooth"` is a request, not a guarantee. Where smooth scrolling
   * is unavailable or disabled, the browser accepts the call and does nothing -
   * measured here: `scrollTo({top:3000, behavior:"smooth"})` left scrollY at 0,
   * while the same call with "auto" landed exactly on 3000. That would leave a
   * learner clicking a contents entry and nothing happening, which is the worst
   * possible failure for the control this module exists to provide.
   *
   * So the smooth request is verified two frames later and replaced with an
   * instant jump if the page did not move. The nice animation is kept where it
   * works; it is never load-bearing.
   */
  function jumpTo(top) {
    const y = Math.max(0, Math.round(top));
    const smooth = !reducedMotion();
    window.scrollTo({ top: y, behavior: smooth ? "smooth" : "auto" });
    if (!smooth) return;
    // Verified with setTimeout rather than requestAnimationFrame on purpose.
    // rAF is suspended whenever the document is hidden, and a suspended rAF
    // means this safety net never runs - so a contents click does nothing at
    // all. setTimeout keeps running, so the fallback happens either way.
    setTimeout(() => {
      if (Math.abs(window.scrollY - y) > 4) window.scrollTo(0, y);
    }, 180);
  }

  /* ------------------------------------------------------- active marker */

  let activeId = null;

  function markActive(id) {
    if (id === activeId) return;
    activeId = id;
    for (const item of tocList.querySelectorAll(".rd-toc__item")) {
      const on = item.__target && item.__target.id === id;
      item.classList.toggle("is-active", !!on);
      const link = item.querySelector(":scope > .rd-toc__link");
      if (link) {
        if (on) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      }
    }
  }

  /**
   * Which section is being read?
   *
   * The last target whose top has passed the header line. Computed on scroll
   * rather than with IntersectionObserver, because IO reports crossings rather
   * than position and gets this particular question wrong near the end of a
   * document, where the final section is often too short to ever cross the
   * middle of the viewport.
   */
  function onScroll() {
    const line = HEADER_OFFSET() + 8;
    let found = targets.length ? targets[0].id : null;
    for (const t of targets) {
      const r = t.top.getBoundingClientRect();
      if (r.top <= line) found = t.id;
      else break;
    }
    // At the very bottom, trust the last target regardless of its height.
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
      found = targets.length ? targets[targets.length - 1].id : found;
    }
    markActive(found);

    const bar = root.querySelector(".rd-progress__bar");
    if (bar) {
      const rect = sectionsWrap.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight + HEADER_OFFSET());
      const done = Math.min(1, Math.max(0, (HEADER_OFFSET() - rect.top) / total));
      bar.style.transform = `scaleX(${done.toFixed(4)})`;
    }
  }

  /**
   * Throttled with setTimeout, not requestAnimationFrame.
   *
   * rAF is suspended in a hidden document, which would silently stop the
   * active-section marker the moment the reader switched tabs - and, worse,
   * would stop it permanently in any environment that reports the document as
   * hidden. A plain timeout costs one cheap pass every 80ms and keeps working.
   * The loop breaks on the first heading below the line, so it is short.
   */
  let scrollTimer = null;
  addEventListener("scroll", () => {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => { scrollTimer = null; onScroll(); }, 80);
  }, { passive: true });

  /* ------------------------------------------------------------ controls */

  const COLLAPSE_KEY = "field-manual:reader-toc";

  const toggle = h("button.rd-tocbtn", {
    type: "button",
    "aria-controls": "rd-toc",
    "aria-expanded": "false",
  }, h("span.rd-tocbtn__bars", h("span"), h("span"), h("span")),
     h("span.rd-tocbtn__t", "Contents"));

  function openDrawer() {
    tocBody.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    const l = tocList.querySelector(".rd-toc__link");
    if (l) l.focus();
  }
  function closeDrawer() {
    tocBody.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", () => {
    if (tocBody.classList.contains("is-open")) {
      closeDrawer();
      toggle.focus();
    } else openDrawer();
  });

  // Escape closes the drawer and returns focus to the control that opened it.
  addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && tocBody.classList.contains("is-open")) {
      closeDrawer();
      toggle.focus();
    }
  });

  const collapseBtn = h("button.rd-toc__collapse", {
    type: "button",
    "aria-label": "Collapse the contents list and widen the text",
  }, "‹");

  collapseBtn.addEventListener("click", () => {
    const on = root.classList.toggle("is-collapsed");
    collapseBtn.textContent = on ? "›" : "‹";
    collapseBtn.setAttribute("aria-label", on
      ? "Show the contents list"
      : "Collapse the contents list and widen the text");
    try { localStorage.setItem(COLLAPSE_KEY, on ? "1" : "0"); } catch (_) { /* private */ }
  });

  try {
    if (localStorage.getItem(COLLAPSE_KEY) === "1") {
      root.classList.add("is-collapsed");
      collapseBtn.textContent = "›";
    }
  } catch (_) { /* private mode */ }

  const drawerClose = h("button.rd-toc__backdrop", {
    type: "button", "aria-label": "Close the contents list",
  });
  drawerClose.addEventListener("click", closeDrawer);

  tocBody.appendChild(drawerClose);
  tocBody.appendChild(collapseBtn);

  /* -------------------------------------------------------------- layout */

  root.appendChild(h("div.rd-progress", { "aria-hidden": "true" },
    h("div.rd-progress__bar")));

  const head = h("div.rd-head", toggle);
  tocBody.prepend(head);

  root.appendChild(tocBody);
  root.appendChild(main);
  if (rail) root.appendChild(h("aside.rd-rail", rail));

  /* -------------------------------------------------------------- build */

  buildToc();

  // A deep link that arrives with the page, not from a click.
  if (fragment) {
    const t = targets.find((x) => x.id === fragment) ||
              targets.find((x) => x.el.contains(document.getElementById(fragment)));
    if (t) {
      // Let layout settle before measuring, so the offset is correct.
      setTimeout(() => scrollToTarget(t.id, false), 120);
    }
  }
  setTimeout(onScroll, 120);

  root.destroy = () => {
    if (scrollTimer) clearTimeout(scrollTimer);
  };
  return root;
}

/**
 * The accessible name for a reader's contents controls, for tests and for
 * assistive tech that would otherwise fall back to the bare word "Contents".
 */
export const READER_LABELS = {
  toc: "Chapter contents",
  open: "Open the chapter contents",
  close: "Close the chapter contents",
};
