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
 *
 * WHERE THINGS SIT
 *   Reading column on the left, ONE floating panel on the right holding the
 *   contents list and the contextual material together. Two side panels - one
 *   for the contents, one for everything else - meant the visible Contents
 *   control belonged to the panel on the opposite side from the list it opened.
 *
 *   On a narrow screen that right panel becomes the drawer: it is off-screen
 *   until asked for, so the single-column reading order is unchanged.
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

/**
 * The label a contents entry shows, with artificial section numbering removed.
 *
 * THE NUMBERING IS A SOURCE ARTEFACT, NOT THE HEADING
 * The RH134/RH294 chapter files carry their headings as "1.1 Creating and
 * executing Bash shell scripts", "2.10 Using if/then/elif/then/else" - a decimal
 * outline number baked into the heading text by the document they were built
 * from. In a flat contents list it is noise: every line starts with a number
 * that means nothing on its own, and the reader is scanning for the words.
 *
 * So the number is stripped FROM THE CONTENTS ENTRY ONLY. The heading rendered
 * in the document keeps its full original text, because that is the source and
 * a deep link should land on a heading that reads exactly as written. This
 * function is only ever applied to `t.text` when building the list.
 *
 *   "1.1 Creating and executing Bash shell scripts" -> "Creating and executing Bash shell scripts"
 *   "2.10 Using if/then/elif/then/else"             -> "Using if/then/elif/then/else"
 *   "Overview"                                     -> "Overview"   (left alone)
 *   "200-301 exam topics"                          -> "200-301 exam topics" (left alone)
 *
 * The pattern is deliberately narrow: one or more dot-joined numbers followed by
 * whitespace. A bare "200-301" is hyphenated, not dotted, and is not touched; a
 * leading year such as "2026 roadmap" has no dot and is not touched.
 */
export function tocLabel(text) {
  const s = String(text || "").trim();
  const stripped = s.replace(/^\d+(?:\.\d+)+\s+/, "").trim();
  return stripped || s;
}

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

  // The collapse control lives inside the panel header, not floating on the
  // panel's outer edge. It used to be absolutely positioned against the panel
  // from inside the scrollable list, which put it in two places at once: it
  // scrolled away with the contents and it was clipped by the scroll box.
  const tocAside = h("aside.rd-toc", { id: "rd-toc" },
    h("div.rd-toc__top",
      h("p.rd-toc__hd", "Contents")),
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

    const headRow = h("div.rd-s__headrow");
    const head = h(level === 2 ? "h2.rd-h.rd-h--2" : "h3.rd-h.rd-h--3", { id: `${sid}-h` });
    if (sec.kicker) head.appendChild(h("span.rd-h__kicker", sec.kicker));
    head.appendChild(h("span.rd-h__text", sec.title));

    // Fold control. aria-expanded on the heading's sibling control is what a
    // screen reader announces, and aria-controls points at the thing it hides.
    const fold = h("button.rd-s__fold", {
      type: "button",
      "aria-expanded": "true",
      "aria-controls": `${sid}-body`,
      title: "Hide this section",
    });
    fold.appendChild(h("span.rd-s__chev", { "aria-hidden": "true" }, "▾"));

    const body = h("div.rd-s__body", { id: `${sid}-body` });

    const setFolded = (on) => {
      node.classList.toggle("is-folded", on);
      body.hidden = on;
      fold.setAttribute("aria-expanded", on ? "false" : "true");
      fold.title = on ? "Show this section" : "Hide this section";
      fold.setAttribute("aria-label", `${on ? "Show" : "Hide"} section: ${sec.title}`);
      if (on) folded.add(sid); else folded.delete(sid);
      saveFold();
      // A folded section still needs to be reachable from the contents list,
      // which means the list entry has to open it before jumping.
      const item = tocList.querySelector(`.rd-toc__item[data-sid="${CSS.escape(sid)}"]`);
      if (item) item.classList.toggle("is-folded", on);
    };

    fold.setAttribute("aria-label", `Hide section: ${sec.title}`);
    fold.addEventListener("click", () => setFolded(!node.classList.contains("is-folded")));

    headRow.appendChild(head);
    headRow.appendChild(fold);
    node.appendChild(headRow);

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

    // `fold` must take the new state. It was written as `() => setFolded`,
    // which merely RETURNS the function and ignores its argument - so
    // reopening a folded section from the contents list did nothing at all,
    // and restoring remembered folds on load did nothing at all.
    targets.push({ level, id: sid, text: sec.title, el: node, top: head,
                   fold: (on) => setFolded(on) });

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
      const item = h("li.rd-toc__item", { "data-level": String(t.level), "data-sid": t.id });
      // The list shows the heading without its source numbering; the heading in
      // the document still carries it. See tocLabel().
      const link = h("a.rd-toc__link", { href: deepHref(t.id) }, h("span", tocLabel(t.text)));
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

  /**
   * The whole row is the target, not just the words inside it.
   *
   * One listener on the list rather than one per entry, so a click anywhere in
   * the card works: the text, the padding around it, the marker square in the
   * gutter. Measured before the change: the entry box was 299px wide and the
   * anchor inside it 297px, and nested entries sat on a transparent row with
   * only their own text live - so aiming at the row and getting nothing was
   * the normal result.
   *
   * The anchor is still there, with its real href. It stays the keyboard target
   * and the thing a screen reader announces, and Enter on it produces a click
   * that bubbles up to this same handler, so there is one code path rather than
   * two that can drift apart.
   */
  tocList.addEventListener("click", (ev) => {
    const item = ev.target instanceof Element && ev.target.closest(".rd-toc__item");
    if (!item || !item.__target || !tocList.contains(item)) return;
    onTocClick(ev, item.__target);
  });

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
    // Jumping to a folded section would land on a heading with nothing under
    // it, so open it first.
    const item = tocList.querySelector(`.rd-toc__item[data-sid="${CSS.escape(t.id)}"]`);
    if (item && item.classList.contains("is-folded")) {
      const owner = targets.find((x) => x.id === t.id);
      if (owner && owner.fold) owner.fold(false);
    }
    scrollToTarget(t.id, true);
  }

  function scrollToTarget(id, focusHeading) {
    const el = document.getElementById(id);
    if (!el) return;
    jumpTo(el, focusHeading);
    if (focusHeading) {
      const hd = el.querySelector(".rd-h") || el;
      hd.setAttribute("tabindex", "-1");
      hd.focus({ preventScroll: true });
    }
    markActive(id);
  }

  /**
   * Scroll, then check that it happened - twice.
   *
   * `behavior: "smooth"` is a request, not a guarantee. Where smooth scrolling
   * is unavailable or disabled the browser accepts the call and does nothing -
   * measured here: `scrollTo({top:3000, behavior:"smooth"})` left scrollY at 0,
   * while the same call with "auto" landed exactly on 3000. That would leave a
   * learner clicking a contents entry and nothing happening, which is the worst
   * possible failure for the control this module exists to provide.
   *
   * The second check is for late layout shift. The first measurement is taken
   * while the document is still settling - a web font landing, a section
   * expanding above the target, a code block reflowing - and the offset can be
   * hundreds of pixels out by the time the page has finished arranging itself.
   * Measured: a folded section reopened from the contents list landed 883px
   * above where it should have been.
   *
   * So the position is re-measured once the page has settled and corrected if
   * it drifted. Nice animation is kept where it works; it is never load-bearing,
   * and neither is the first measurement.
   */
  function jumpTo(el, focusHeading) {
    const y = () => Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET()));
    const smooth = !reducedMotion();
    const first = y();
    window.scrollTo({ top: first, behavior: smooth ? "smooth" : "auto" });

    setTimeout(() => {
      let now = y();
      if (Math.abs(window.scrollY - first) > 4) {
        window.scrollTo(0, first);            // smooth did not move the page
        return;
      }
      if (Math.abs(now - first) > 8) {
        window.scrollTo(0, now);              // layout shifted underneath us
        markActive(el.id);
      }
    }, 200);
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

  /*
   * THE COMPACT FLOATING CONTROL
   *
   * One small button, fixed near the bottom-right corner, opens and closes the
   * contents list. It replaced a sticky bar along the top of the reading column
   * that carried both a pill "Contents" button and a separate "Hide contents"
   * control - two controls for one job, and the bar sat in the reading flow where
   * it pushed the first heading down on every chapter.
   *
   * The button is always on screen (position: fixed) and never scrolls away, so
   * the contents list is one tap from anywhere in a 57-section chapter. Its
   * aria-expanded reflects the real state, and the panel it controls is named by
   * aria-controls.
   */
  const toggle = h("button.rd-tocbtn", {
    type: "button",
    "aria-controls": "rd-toc",
    "aria-expanded": "false",
    "aria-label": "Contents",
  }, h("span.rd-tocbtn__bars", null, h("span"), h("span"), h("span")),
     h("span.rd-tocbtn__t", "Contents"));

  function openDrawer() {
    tocBody.classList.add("is-open");
    root.classList.add("is-toc-open");
    toggle.setAttribute("aria-expanded", "true");
  }
  function closeDrawer() {
    tocBody.classList.remove("is-open");
    root.classList.remove("is-toc-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  toggle.addEventListener("click", () => {
    if (tocBody.classList.contains("is-open")) {
      closeDrawer();
      toggle.focus();
    } else {
      openDrawer();
      const l = tocList.querySelector(".rd-toc__link");
      if (l) l.focus();
    }
  });

  // Escape closes the panel and returns focus to the control that opened it.
  addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && tocBody.classList.contains("is-open")) {
      closeDrawer();
      toggle.focus();
    }
  });

  const drawerClose = h("button.rd-toc__backdrop", {
    type: "button", "aria-label": "Close the contents list", tabindex: "-1",
  });
  drawerClose.addEventListener("click", closeDrawer);

  /* -------------------------------------------------------------- layout */

  root.appendChild(h("div.rd-progress", { "aria-hidden": "true" },
    h("div.rd-progress__bar")));
  // The backdrop is a direct child of the reader root, NOT of the panel: it has
  // to sit behind the panel but above the page, and nesting it inside the panel
  // would put it in the panel's stacking context.
  root.appendChild(drawerClose);

  /*
   * `before` was accepted, documented in the JSDoc above, and then never
   * appended to anything. Everything a caller put in it was silently dropped on
   * the floor.
   *
   * Measured on study/rh124-01 before this fix: `document.querySelector
   * (".rd-before")` was null, `.study__status` was null, and the chapter
   * carried zero `.note--risk` blocks - while the unit data does build all
   * three. So every RHEL study chapter was opening without its progress
   * control and without the "the guide says / current practice / what to do"
   * warning that the brief requires outdated content to be flagged rather than
   * quietly corrected.
   */
  if (before) main.appendChild(before);
  if (after) main.appendChild(after);

  /*
   * One floating panel on the RIGHT, holding the contents list and the
   * contextual material together.
   *
   * The panel is opened and closed by the compact floating button below. It is
   * hidden by default so the reading column takes the full width until the
   * reader asks for the contents - the brief's "compact floating button that
   * opens and closes" rather than a panel permanently taking a third of the
   * screen.
   *
   * `.rd-toc__body` scrolls inside the panel, so a 57-entry contents list stays
   * reachable without running off the bottom of the viewport.
   */
  const side = h("div.rd-side");
  side.appendChild(tocBody);
  if (rail) side.appendChild(h("aside.rd-rail", rail));

  root.appendChild(main);
  root.appendChild(side);
  root.appendChild(toggle);

  /* ------------------------------------------------- section collapsing */

  /*
   * Every section can be folded away, and the choice is remembered.
   *
   * A 57-section chapter is a lot to scroll when you are looking for one part
   * of it. Folding the parts you have read keeps the remaining ones findable.
   * The heading stays visible while folded, so the contents list still works
   * and the section can be reopened from either place.
   *
   * State lives in one key per chapter, so nothing collides between chapters
   * and clearing the key restores the default.
   */
  const FOLD_KEY = `field-manual:reader-fold:${routeBase || "page"}`;

  let folded = new Set();
  try {
    const raw = JSON.parse(localStorage.getItem(FOLD_KEY) || "[]");
    if (Array.isArray(raw)) folded = new Set(raw);
  } catch (_) { /* private mode, or corrupt: start unfolded */ }

  const saveFold = () => {
    try { localStorage.setItem(FOLD_KEY, JSON.stringify([...folded])); } catch (_) { /* private */ }
  };

  /* -------------------------------------------------------------- build */

  buildToc();

  // Apply any remembered folding now that both the sections and the contents
  // list exist, so a chapter you folded yesterday is still folded today.
  for (const t of targets) {
    if (!t.fold || !folded.has(t.id)) continue;
    const item = tocList.querySelector(`.rd-toc__item[data-sid="${CSS.escape(t.id)}"]`);
    if (item) item.classList.add("is-folded");
    t.fold(true);
  }

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
