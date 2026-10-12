/**
 * search-diagnostic.js
 *
 * Paste the whole block into the browser console on the page where the search
 * placeholder looks wrong, then paste the output back.
 *
 * WHY THIS EXISTS
 * A reported fault showed the search placeholder glyphs appearing to overlap.
 * It has never been reproduced from the code side, and the only evidence
 * supplied was a magnified crop of a screenshot — which shows upscaling
 * artefacts whether or not the page is at fault. Guessing at CSS fixes for an
 * unreproduced bug is how a real cause gets papered over, so instead this
 * measures the live element in the browser that actually exhibits the fault.
 *
 * It answers the questions that matter:
 *   - is the text genuinely overlapping, or is the box just narrow?
 *   - is the page zoomed, or the screen merely high-DPI?
 *   - does TYPED text break too, or only the placeholder?
 *   - is a font falling back, and is that fallback the culprit?
 *
 * Nothing is modified. It only reads.
 */
(() => {
  const out = [];
  const say = (s) => out.push(s);
  const r = (n, d) => Math.round(n * 100) / 100;

  const el = document.getElementById("q");
  if (!el) {
    console.error("search input #q not found on this page");
    return;
  }

  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  say("=== SEARCH INPUT DIAGNOSTIC ===");
  say(`  user agent        : ${navigator.userAgent}`);
  say("");
  say("--- viewport / magnification ---");
  say(`  devicePixelRatio  : ${window.devicePixelRatio}`);
  say(`  visualViewport.scale : ${window.visualViewport ? r(window.visualViewport.scale) : "n/a"}`);
  say(`  screen width/height  : ${screen.width} x ${screen.height}`);
  say(`  outer/inner width    : ${window.outerWidth} / ${window.innerWidth}`);
  if (window.outerWidth && window.innerWidth && window.outerWidth - window.innerWidth > 20) {
    say(`  NOTE: a ${window.outerWidth - window.innerWidth}px difference suggests a sidebar or`);
    say(`        devtools is docked, which will shrink the viewport.`);
  }
  say("");
  say("--- element box ---");
  say(`  css width         : ${cs.width}  (content box)`);
  say(`  rendered width    : ${r(rect.width)} px`);
  say(`  height            : ${r(rect.height)} px`);
  say(`  padding           : ${cs.paddingLeft} / ${cs.paddingRight}`);
  say(`  usable text width : ${r(rect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))} px`);
  say("");
  say("--- typography ---");
  say(`  font-family       : ${cs.fontFamily}`);
  say(`  font-size         : ${cs.fontSize}`);
  say(`  letter-spacing    : ${cs.letterSpacing}`);
  say(`  word-spacing      : ${cs.wordSpacing}`);
  say(`  font-stretch      : ${cs.fontStretch}`);
  say(`  font-synthesis    : ${cs.fontSynthesis}`);
  say(`  text-rendering    : ${cs.textRendering || "(default)"}`);
  say(`  font-variant-lig  : ${cs.fontVariantLigatures}`);
  say(`  -webkit-font-smoothing : ${cs.webkitFontSmoothing || "(default)"}`);
  say("");

  // The decisive measurement: does the real font render the text wider than
  // the space available? Canvas measureText uses the same font engine the
  // input does, so a correct ratio means the text genuinely fits.
  const probe = (text, font) => {
    const c = document.createElement("canvas").getContext("2d");
    c.font = font || `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = c.measureText(text);
    return { w: m.width, advance: text ? m.width / text.length : 0 };
  };

  const avail = rect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const fontShorthand = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

  say("--- does the text actually fit? ---");
  for (const [label, text] of [
    ["placeholder", el.placeholder || ""],
    ["typed value  ", el.value || ""],
  ]) {
    if (!text) { say(`  ${label} : (empty)`); continue; }
    const p = probe(text);
    const pct = (p.w / avail) * 100;
    say(`  ${label} : ${text.length} chars, ${r(p.w)}px wide, ${r(pct)}% of ${r(avail)}px available`);
    say(`               per-glyph advance ${r(p.advance)}px  (ratio to font-size: ${r(p.advance / parseFloat(cs.fontSize))})`);
    if (p.w > avail) {
      say(`               ** OVERFLOWS by ${r(p.w - avail)}px - the text is wider than the box **`);
    } else if (pct > 92) {
      say(`               ** very tight - only ${r(avail - p.w)}px spare. Clipping or */
               a visible caret is expected here. **`);
    } else {
      say(`               comfortable: ${r(avail - p.w)}px spare`);
    }
  }
  say("");

  say("--- font availability ---");
  if (document.fonts && document.fonts.check) {
    const families = cs.fontFamily.split(",").map((f) => f.trim().replace(/^["']|["']$/g, ""));
    for (const f of families) {
      say(`  ${document.fonts.check(`16px ${f}`) ? "available" : "MISSING  "}  ${f}`);
    }
    say(`  fonts.status     : ${document.fonts.status}`);
  } else {
    say("  (Font Loading API unavailable in this browser)");
  }
  say("");

  say("--- zoom test ---");
  say("  Now set the browser zoom to 100%, 125%, 150% and 200%, and watch whether");
  say("  the glyphs change. If they only change when the PAGE is zoomed and not at");
  say("  100%, this is a rendering/zoom interaction, not a layout bug.");
  say("");
  say("--- typed text ---");
  say("  Type something into the box. If TYPED text renders correctly but only the");
  say("  placeholder is wrong, the cause is ::placeholder rendering specifically.");
  say("  If both break, it is the input's own font metrics.");
  say("");
  say("=== end - paste everything above back ===");

  const text = out.join("\n");
  console.log(text);
  // Also surface it somewhere it can be selected and copied easily.
  const pre = document.createElement("pre");
  pre.textContent = text;
  pre.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;overflow:auto;background:#111;color:#0f0;" +
    "font:12px/1.45 ui-monospace,monospace;padding:16px;margin:0;white-space:pre-wrap";
  pre.id = "search-diagnostic-output";
  document.body.appendChild(pre);
})();