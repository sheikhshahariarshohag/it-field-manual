/**
 * docview.js — render a document the way the document looks.
 *
 * The blocks in docs/data/docs/<id>.json carry the source's own formatting:
 * every run has the colour and weight Word gave it, and every shaded paragraph
 * keeps its fill. This renders them as-is rather than mapping them onto the
 * app's palette, because "the same colour as it is in the doc" means the
 * document's colour, not a theme token that resembles it.
 *
 * WHY THE COLOURS ARE INLINE AND NOT TOKENS
 * scripts/check-prose-contrast.mjs checks declared token pairs in app.css.
 * These colours are not tokens: there are 16 run colours and 18 fills across
 * 40 documents, they vary per document, and five of the fills are dark enough
 * to carry white text. A token per colour would be 34 tokens that are really
 * data. So the colours travel with the data, and check-doc-contrast.mjs walks
 * the data and checks each (text colour, fill) pair it actually finds.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * It does not restyle, re-wrap, re-order or summarise. A heading is a heading
 * because Word marked it Heading1, a box is a box because Word shaded it, and
 * a table keeps the rows it had. The only judgement made here is turning
 * consecutive list paragraphs into a <ul>, which is how Word draws them.
 */

import { h } from "./ui.js";

/** One run: its own colour, weight and character shading, as authored. */
function run(r) {
  /*
   * The colour goes in `style`, never as a bare prop.
   *
   * It used to be `h("span", r.c ? { color: r.c } : null, r.t)`, which sets an
   * HTML ATTRIBUTE called color, not CSS. The attribute does nothing to the
   * rendering, so every coloured run that had no character chip behind it came
   * out in the inherited ink instead of the document's. In RHEL chapter 1 that
   * silently turned 37 shaded notes' worth of "Main idea:" labels from the
   * document's #1F4E79 into plain black, which is the one thing "the same
   * colour as it is in the doc" is about.
   *
   * Runs WITH a chip were unaffected, because that branch built a style object.
   * So the bug showed up on exactly the labels that carry the meaning.
   */
  const style = {};
  if (r.c) style.color = r.c;
  if (r.sh) style.background = r.sh;
  if (!Object.keys(style).length && !r.b && !r.i) return r.t;

  let node = h("span", r.sh ? { class: "doc-chip", style } : { style }, r.t);
  if (r.b) node = h("strong", null, node);
  if (r.i) node = h("em", null, node);
  return node;
}

const runsOf = (b) => (b.runs || []).map(run);

/** A table, with the header row only where the document marked one. */
function table(b) {
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  b.rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    const isHead = b.headRow && i === 0;
    const cellTag = isHead ? "th" : "td";
    for (const cell of row) {
      const td = h(cellTag, null, runsOf(cell));
      if (cell.fill) {
        td.setAttribute("style",
          `background:${cell.fill};color:${dominant(cell.runs) || "inherit"}`);
      }
      tr.appendChild(td);
    }
    if (isHead) thead.appendChild(tr); else tbody.appendChild(tr);
  });
  const t = h("table.doc-tbl", null);
  if (thead.childNodes.length) t.appendChild(thead);
  if (tbody.childNodes.length) t.appendChild(tbody);
  return t;
}

/**
 * The colour a table cell's own text should be, when the cell is shaded.
 *
 * A cell can hold runs of different colours - a bold coloured label followed
 * by black body text. The longest run wins, because that is the one carrying
 * the reading, and the label is by construction short.
 */
function dominant(runs) {
  let best = null;
  for (const r of runs || []) {
    if (!r.c) continue;
    if (!best || r.t.length > best.t.length) best = r;
  }
  return best ? best.c : null;
}

/**
 * Render one document's blocks.
 *
 * @param {Array} blocks  from a docs/data/docs/<id>.json file
 * @param {(text: string) => void} [hookHeading]  called per heading, for a TOC
 */
export function renderDocBlocks(blocks, hookHeading) {
  const out = document.createDocumentFragment();
  let list = null;

  const closeList = () => { if (list) { out.appendChild(list); list = null; } };
  const openList = () => { if (!list) { list = document.createElement("ul"); list.className = "doc-list"; } };

  for (const b of blocks || []) {
    if (b.k === "tbl") { closeList(); out.appendChild(table(b)); continue; }

    if (b.k === "box") {
      closeList();
      // A box is consecutive paragraphs the author shaded alike - the note's
      // "Main idea:", "Simple explanation:", "Example:" lines. Word draws a
      // border on each paragraph; the note is one box to the reader, so the
      // group is one box here.
      const box = h("div.doc-box", { style: { background: b.fill } });
      for (const p of b.paras) {
        if (p.k === "li") {
          openListIn(box);
          box.lastChild.appendChild(h("li", null, runsOf(p)));
          continue;
        }
        closeListIn(box);
        const tag = p.k === "h" ? headingTag(p.lvl) : "p";
        box.appendChild(h(`${tag}.doc-p`, null, runsOf(p)));
      }
      closeListIn(box);
      out.appendChild(box);
      continue;
    }

    if (b.k === "li") { openList(); list.appendChild(h("li", null, runsOf(b))); continue; }
    closeList();

    if (b.k === "h") {
      const tag = headingTag(b.lvl);
      const el = h(`${tag}.doc-h`, null, runsOf(b));
      if (hookHeading) {
        const t = (b.runs || []).map((r) => r.t).join("");
        hookHeading(b.lvl, t, el);
      }
      out.appendChild(el);
      continue;
    }

    out.appendChild(h("p.doc-p", null, runsOf(b)));
  }
  closeList();
  return out;
}

/* List helpers for inside a box, where the list belongs to the box, not the body. */
function openListIn(box) {
  let ul = box.lastElementChild;
  if (!ul || !ul.classList.contains("doc-list")) {
    ul = document.createElement("ul");
    ul.className = "doc-list";
    box.appendChild(ul);
  }
  return ul;
}
function closeListIn() { /* the list simply stays as the box's last child */ }

const headingTag = (lvl) => (lvl <= 1 ? "h2" : lvl === 2 ? "h3" : lvl === 3 ? "h4" : "h5");

/**
 * A plain-text version of a document, for search indexing and for the
 * contents list. Formatting carries no words, so this is the same text the
 * earlier plain parser produced - which is why word counts are comparable.
 */
export function docText(blocks) {
  const out = [];
  const push = (runs) => { for (const r of runs || []) out.push(r.t); };
  for (const b of blocks || []) {
    if (b.k === "box") { for (const p of b.paras) push(p.runs); continue; }
    if (b.k === "tbl") { for (const row of b.rows) for (const c of row) push(c.runs); continue; }
    push(b.runs);
  }
  return out.join(" ");
}