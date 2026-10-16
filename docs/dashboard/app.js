/* DevStudy Hub — three-panel study dashboard prototype.
   Vanilla JS, no build step, no innerHTML (markup is never injected as a
   string). All state lives in localStorage. */

(function () {
  "use strict";

  /* ---------------------------------------------------------------- data */

  const BOOK = { title: "Network Fundamentals", initials: "NF", page: 58, total: 420 };

  const MODULES = [
    {
      id: "m1", title: "Network Fundamentals", chapters: [
        { id: "intro", title: "Introduction", page: 12 },
        { id: "osi", title: "OSI Model", page: 58 },
        { id: "tcpip", title: "TCP/IP", page: 96 },
      ],
    },
    {
      id: "m2", title: "Advanced Protocols", chapters: [
        { id: "routing", title: "Routing", page: 150 },
        { id: "ipv8", title: "IPv8", page: 182 },
        { id: "bgp", title: "BGP", page: 214 },
      ],
    },
    {
      id: "m3", title: "Security & Admin", chapters: [
        { id: "firewalls", title: "Firewalls", page: 262 },
        { id: "monitoring", title: "Monitoring", page: 304 },
      ],
    },
  ];

  const ECHO_PY = `import socket

HOST = "0.0.0.0"   # listen on every interface
PORT = 9009        # port to bind

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server:
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((HOST, PORT))
    server.listen(5)
    print("listening on", PORT)

    conn, addr = server.accept()
    with conn:
        print("connected from", addr)
        while True:
            data = conn.recv(1024)
            if not data:
                break
            conn.sendall(data)   # echo it straight back`;

  const ECHO_SH = `# Inspect the TCP handshake on the loopback interface
sudo tcpdump -i lo -nn port 9009 -c 10

# Confirm the listener and the ESTABLISHED connection
ss -tanp | grep 9009

# Talk to the echo server by hand
printf 'hello\\n' | nc 127.0.0.1 9009`;

  const BLOCKS = {
    osi: [
      { t: "lede", text: "The OSI model splits network communication into seven layers, each responsible for one job. Understanding the boundary between layers is what lets you debug a network without guessing." },
      { t: "p", text: "The model is a teaching and troubleshooting tool, not a protocol you can install. When people say \u201cthe problem is at layer 3\u201d they mean routing and addressing, not a physical device." },
      { t: "h3", text: "Protocols:" },
      { t: "p", text: "Each layer speaks to its peer on the other machine using a protocol. TCP is the transport-layer protocol that turns an unreliable packet stream into an ordered, acknowledged byte stream. The socket API is the boundary the application sees." },
      { t: "p", parts: [
        "A TCP echo server is the smallest complete example: it accepts one connection and sends every byte back. Run it, then connect to it with ",
        { c: "nc" },
        " and watch the three-way handshake happen in ",
        { c: "tcpdump" },
        ".",
      ] },
      { t: "code", lang: "python", title: "echo_server.py", code: ECHO_PY },
      { t: "h3", text: "Flow control:" },
      { t: "p", text: "Flow control stops a fast sender from overwhelming a slow receiver. TCP uses a sliding window: the receiver advertises how many bytes it can still accept, and the sender will not have more than that many bytes in flight. When the window reaches zero the sender pauses; a later window update resumes it." },
      { t: "ul", items: [
        "Sliding window \u2014 the receiver's advertised buffer space, in bytes.",
        "Acknowledgements \u2014 cumulative ACKs confirm everything up to a sequence number arrived.",
        "Retransmission \u2014 a lost segment is resent after a timeout or duplicate ACK.",
      ] },
      { t: "p", text: "Congestion control is the network-wide sibling of flow control: it estimates how much the path itself can carry and backs off when loss suggests it is overloaded. Same idea, different signal." },
      { t: "h3", text: "Watching it on the wire" },
      { t: "p", text: "Nothing about the model is convincing until you see it. The commands below inspect the handshake, confirm the socket states, and exercise the server you just wrote." },
      { t: "code", lang: "shell", title: "terminal", code: ECHO_SH },
    ],
    intro: [
      { t: "lede", text: "This module builds the vocabulary the rest of the book assumes: frames, packets, ports and the layered mental model that ties them together." },
      { t: "p", text: "Read this chapter first. Later chapters assume you can tell a MAC address from an IP address without pausing." },
    ],
    tcpip: [
      { t: "lede", text: "The TCP/IP model is the four-layer model the internet actually runs on, mapping onto OSI as a practical subset." },
      { t: "p", text: "Where OSI separates session and presentation, TCP/IP folds them into the application layer. The trade is fewer layers to reason about." },
      { t: "h3", text: "Protocols:" },
      { t: "p", text: "IP, TCP, UDP and the application protocols on top of them are the whole stack. The commands below show the routing table that decides where a packet goes." },
      { t: "code", lang: "shell", title: "terminal", code: "# Show the kernel routing table\nip route show\n\n# Trace the path to a destination\nsudo traceroute 1.1.1.1" },
    ],
    routing: [
      { t: "lede", text: "Routing is the process of choosing a path across multiple networks. This chapter covers how a router decides and how to read that decision." },
      { t: "p", text: "The longest-prefix match rule explains most surprising route behaviour. When two routes match, the more specific one wins." },
    ],
    ipv8: [
      { t: "lede", text: "A look at the proposed next-generation addressing scheme and how it changes subnetting assumptions." },
      { t: "p", text: "Treat this as forward-looking context rather than exam-critical material." },
    ],
    bgp: [
      { t: "lede", text: "BGP is the protocol that glues autonomous systems together into the internet." },
      { t: "p", text: "We cover the concepts and the observable state: peers, announced prefixes and path selection." },
    ],
    firewalls: [
      { t: "lede", text: "Firewalls enforce the boundary between networks you trust and networks you do not." },
      { t: "p", text: "This chapter moves from stateless packet filters to stateful inspection and the rule-ordering mistakes that quietly open holes." },
    ],
    monitoring: [
      { t: "lede", text: "You cannot fix what you cannot see. Monitoring is how you see it." },
      { t: "p", text: "Metrics, logs and traces answer different questions; knowing which one to reach for is most of the skill." },
    ],
  };

  const TITLES = {
    intro: "Introduction", osi: "The OSI Model", tcpip: "TCP/IP", routing: "Routing",
    ipv8: "IPv8", bgp: "BGP", firewalls: "Firewalls", monitoring: "Monitoring",
  };

  const QUIZZES = {
    osi: {
      topic: "OSI Model \u2014 Transport",
      questions: [
        { q: "Which OSI layer is responsible for end-to-end flow control and reliability?",
          options: ["Physical", "Data Link", "Transport", "Session"], answer: 2 },
        { q: "A TCP receiver advertising a window of 0 means:",
          options: ["The connection is closed", "The sender must pause", "A packet was lost", "The MSS changed"], answer: 1 },
        { q: "Which mechanism stops a fast sender overwhelming a slow receiver?",
          options: ["Congestion control", "Flow control", "Fragmentation", "ARP"], answer: 1 },
        { q: "A cumulative acknowledgement confirms:",
          options: ["Only the last segment", "Every byte up to a sequence number", "The next window", "The route"], answer: 1 },
        { q: "The socket API is the boundary seen by which layer?",
          options: ["Application", "Transport", "Network", "Link"], answer: 0 },
      ],
    },
    default: {
      topic: "General",
      questions: [
        { q: "How many layers does the OSI model define?",
          options: ["4", "5", "6", "7"], answer: 3 },
        { q: "Which address delivers a frame on the local segment?",
          options: ["IP address", "MAC address", "Port number", "Hostname"], answer: 1 },
      ],
    },
  };

  const LABS = {
    osi: [
      { id: "l1", text: "Implement TCP echo server", done: true },
      { id: "l2", text: "Run Wireshark capture" },
      { id: "l3", text: "Simulate UDP packet loss" },
    ],
    default: [
      { id: "l1", text: "Read the chapter" },
      { id: "l2", text: "Complete the practice quiz" },
    ],
  };

  const COMMANDS = [
    { name: "ss", desc: "Socket statistics", chapter: "osi" },
    { name: "tcpdump", desc: "Capture packets", chapter: "osi" },
    { name: "nc", desc: "Netcat — connect or listen", chapter: "osi" },
    { name: "ip route", desc: "Show the routing table", chapter: "tcpip" },
    { name: "traceroute", desc: "Trace a path", chapter: "tcpip" },
    { name: "dig", desc: "Query DNS", chapter: "tcpip" },
    { name: "iptables", desc: "Packet filtering rules", chapter: "firewalls" },
  ];

  /* ---------------------------------------------------------------- state */

  const KEY = { theme: "theme", chapter: "chapter", open: "openModules", lab: "lab", quiz: "quiz" };
  const store = {
    get(k, d) { try { const v = localStorage.getItem("dsd:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("dsd:" + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };

  const state = {
    theme: store.get(KEY.theme, "dark"),
    chapter: store.get(KEY.chapter, "osi"),
    open: store.get(KEY.open, { m1: true, m2: true, m3: true }),
    lab: store.get(KEY.lab, {}),
    quiz: store.get(KEY.quiz, {}),
  };

  const flat = () => MODULES.reduce((a, m) => a.concat(m.chapters), []);
  const chapterById = (id) => flat().find((c) => c.id === id) || flat()[0];
  const quizFor = (id) => QUIZZES[id] || QUIZZES.default;
  const labFor = (id) => LABS[id] || LABS.default;

  /* ---------------------------------------------------------------- dom helpers */

  const $ = (sel) => document.querySelector(sel);

  function append(parent, kid) {
    if (kid === null || kid === undefined || kid === false || kid === true) return;
    if (Array.isArray(kid)) { kid.forEach((k) => append(parent, k)); return; }
    if (kid instanceof Node) { parent.appendChild(kid); return; }
    parent.appendChild(document.createTextNode(String(kid)));
  }

  /** h('div.card', { onclick }, 'text', h('span', 'x')) — textContent only. */
  function h(spec, props, ...kids) {
    const [tag, ...classes] = String(spec).split(".");
    const el = document.createElement(tag || "div");
    if (classes.length) el.className = classes.join(" ");
    if (props && props.constructor === Object) {
      for (const [k, v] of Object.entries(props)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
        else if (k === "dataset") for (const [dk, dv] of Object.entries(v)) el.dataset[dk] = dv;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, "");
        else el.setAttribute(k, String(v));
      }
    } else {
      if (props !== undefined) kids = [props, ...kids];
    }
    for (const kid of kids) append(el, kid);
    return el;
  }

  function mount(host, ...kids) {
    while (host.firstChild) host.removeChild(host.firstChild);
    append(host, kids);
    return host;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  /** createElement("svg") makes an HTML element; SVG needs the SVG namespace. */
  function chevron() {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "module__chev");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", "M8 9l4 4 4-4");
    svg.appendChild(path);
    return svg;
  }

  /* ---------------------------------------------------------------- syntax */

  const rules = {
    python: [
      ["com", /#.*/g],
      ["str", /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g],
      ["kw", /\b(?:def|class|import|from|as|return|if|elif|else|for|while|in|not|and|or|with|try|except|finally|self|True|False|None|print|pass|break|continue)\b/g],
      ["fn", /\b[A-Za-z_]\w*(?=\()/g],
      ["num", /\b\d+(?:\.\d+)?\b/g],
    ],
    shell: [
      ["com", /#.*/g],
      ["str", /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g],
      ["prompt", /^\$ /g],
      ["cmd", /\b(?:sudo|ip|ss|netstat|tcpdump|nc|printf|grep|echo|curl|dig|traceroute|ping|iptables|python3)\b/g],
      ["flag", /(?:^|\s)--?[A-Za-z][\w-]*/g],
      ["num", /\b\d+(?:\.\d+)?\b/g],
    ],
  };

  function tokenize(line, lang) {
    const set = rules[lang] || rules.shell;
    const nodes = [];
    let i = 0;
    outer: while (i < line.length) {
      for (const [cls, re] of set) {
        re.lastIndex = i;
        const m = re.exec(line);
        if (m && m.index === i && m[0].length) {
          nodes.push(h("span.tok-" + cls, m[0]));
          i += m[0].length;
          continue outer;
        }
      }
      nodes.push(document.createTextNode(line[i]));
      i += 1;
    }
    return nodes;
  }

  function codeBlock(b) {
    const lines = String(b.code).split("\n");
    const body = h("pre.code__body", h("code",
      lines.map((ln, n) => h("div.code__line",
        h("span.code__ln", String(n + 1)),
        h("span.code__src", n < lines.length ? tokenize(ln, b.lang) : "\u00a0"),
      )),
    ));
    const copy = h("button.code__copy", { type: "button", onclick: () => {
      const text = Array.from(body.querySelectorAll(".code__src")).map((s) => s.textContent).join("\n");
      if (navigator.clipboard) navigator.clipboard.writeText(text);
      copy.textContent = "Copied";
      setTimeout(() => { copy.textContent = "Copy"; }, 1400);
    } }, "Copy");
    return h("figure.code",
      h("figcaption.code__head",
        h("span.code__dots", h("i"), h("i"), h("i")),
        h("span.code__title", b.title || b.lang),
        copy,
      ),
      body,
    );
  }

  function buildBlock(b) {
    switch (b.t) {
      case "lede": return h("p.lede", b.text);
      case "p":
        if (b.parts) {
          const p = h("p");
          for (const part of b.parts) append(p, typeof part === "string" ? part : h("code", part.c));
          return p;
        }
        return h("p", b.text);
      case "h2": return h("h2", b.text);
      case "h3": return h("h3", b.text);
      case "ul": return h("ul", b.items.map((x) => h("li", x)));
      case "code": return codeBlock(b);
      default: return null;
    }
  }

  /* ---------------------------------------------------------------- render: left */

  function renderTree() {
    mount($("#treeNav"), MODULES.map((m) => {
      const open = state.open[m.id] !== false;
      return h("div.module", { dataset: { module: m.id }, "data-open": String(open) },
        h("button.module__head", { dataset: { toggle: m.id }, "aria-expanded": String(open) },
          chevron(),
          h("span", m.title),
          h("span.n", String(m.chapters.length)),
        ),
        h("ul.module__list", m.chapters.map((c) => {
          const active = c.id === state.chapter;
          return h("li", h("button.chapterbtn", {
            dataset: { chapter: c.id },
            "aria-current": active ? "page" : null,
          },
            h("span.dot"),
            h("span.t", c.title),
            h("span.pg", "p." + c.page),
          ));
        })),
      );
    }));
  }

  function quickItem(c) {
    return h("button.quick__item", { dataset: { chapter: c.id } },
      h("span.ic", TITLES[c.id].slice(0, 1)),
      h("span.t", h("strong", TITLES[c.id]), h("small", "p." + c.page)),
    );
  }

  function renderQuick() {
    const cur = chapterById(state.chapter);
    const all = flat();
    const idx = all.findIndex((c) => c.id === cur.id);
    const next = all.slice(idx + 1, idx + 3);
    mount($("#quickSwitch"),
      h("div.quick__label", "Current Reading"),
      quickItem(cur),
      h("div.quick__label", "Next Reads"),
      next.length ? next.map(quickItem) : h("p.bookcard__sub", "You are at the end of the book."),
    );
  }

  function renderBook() {
    const cur = chapterById(state.chapter);
    const pct = Math.round((cur.page / BOOK.total) * 100);
    $("#bookCover").textContent = BOOK.initials;
    $("#bookTitle").textContent = BOOK.title;
    $("#bookProgressText").textContent = "Page " + cur.page + " of " + BOOK.total;
    $("#bookProgressBar").style.width = pct + "%";
    $("#ringLabel").textContent = pct + "%";
    $("#ringValue").style.strokeDashoffset = (97.4 * (1 - pct / 100)).toFixed(1);
  }

  /* ---------------------------------------------------------------- render: center */

  function renderDoc() {
    const cur = chapterById(state.chapter);
    const n = flat().findIndex((c) => c.id === cur.id) + 1;
    mount($("#crumb"), "Chapter " + n + ": ", h("b", TITLES[cur.id]));
    $("#pager").textContent = "Page " + cur.page + " / " + BOOK.total;
    mount($("#doc"), h("h1", TITLES[cur.id]), (BLOCKS[cur.id] || []).map(buildBlock));
  }

  /* ---------------------------------------------------------------- render: right */

  const answersFor = () => state.quiz[state.chapter] || {};

  function renderQuiz() {
    const quiz = quizFor(state.chapter);
    const answers = answersFor();
    const total = quiz.questions.length;
    const correct = quiz.questions.reduce((a, q, i) => a + (answers[i] === q.answer ? 1 : 0), 0);

    $("#quizTopic").textContent = "Topic: " + quiz.topic;
    $("#quizScorePill").textContent = correct + " / " + total;
    $("#quizBar").style.width = (total ? (correct / total) * 100 : 0) + "%";

    mount($("#quizList"), quiz.questions.map((q, i) => {
      const chosen = answers[i];
      const locked = chosen !== undefined;
      return h("li.q",
        h("p.q__text", (i + 1) + ". " + q.q),
        h("div.q__opts", q.options.map((o, oi) => {
          let cls = "opt";
          let mk = "";
          if (locked) {
            cls += " is-locked";
            if (oi === q.answer) { cls += " is-correct"; mk = "\u2713"; }
            else if (oi === chosen) { cls += " is-wrong"; mk = "\u2715"; }
          }
          return h("label." + cls,
            h("input", {
              type: "radio", name: "q" + i,
              dataset: { q: String(i), o: String(oi) },
              checked: chosen === oi, disabled: locked,
            }),
            h("span", o),
            h("span.mk", mk),
          );
        })),
      );
    }));

    const answered = Object.keys(answers).length;
    $("#quizReset").hidden = answered === 0 && $("#quizResult").hidden;
  }

  function renderLab() {
    const labs = labFor(state.chapter);
    const saved = state.lab[state.chapter] || {};
    let done = 0;
    mount($("#labList"), labs.map((t, i) => {
      const on = saved[t.id] !== undefined ? !!saved[t.id] : !!t.done;
      if (on) done += 1;
      return h("li", h("label.lab__item" + (on ? " is-done" : ""),
        h("input", { type: "checkbox", dataset: { lab: t.id }, checked: on }),
        h("span.lab__txt", (i + 1) + ". " + t.text),
      ));
    }));
    $("#labCount").textContent = done + " / " + labs.length;
  }

  /* ---------------------------------------------------------------- actions */

  function selectChapter(id) {
    if (!flat().some((c) => c.id === id)) return;
    state.chapter = id;
    store.set(KEY.chapter, id);
    renderTree();
    renderBook();
    renderDoc();
    renderQuiz();
    renderLab();
    renderQuick();
    closeDrawers();
    $("#readerMain").scrollTo({ top: 0 });
  }

  function toggleModule(id) {
    state.open[id] = state.open[id] === false;
    store.set(KEY.open, state.open);
    renderTree();
  }

  function setTheme(t) {
    state.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    store.set(KEY.theme, t);
  }

  function answer(qi, oi) {
    const map = state.quiz[state.chapter] || (state.quiz[state.chapter] = {});
    map[qi] = oi;
    store.set(KEY.quiz, state.quiz);
    $("#quizResult").hidden = true;
    renderQuiz();
  }

  function submitQuiz() {
    const quiz = quizFor(state.chapter);
    const answers = answersFor();
    const total = quiz.questions.length;
    const answered = Object.keys(answers).length;
    const correct = quiz.questions.reduce((a, q, i) => a + (answers[i] === q.answer ? 1 : 0), 0);
    const box = $("#quizResult");
    const pass = correct / total >= 0.6;
    box.hidden = false;
    box.className = "quizresult " + (pass ? "quizresult--good" : "quizresult--ok");
    box.textContent = answered === total
      ? "You scored " + correct + " / " + total + (pass ? " \u2014 passed." : " \u2014 review the missed questions and retake.")
      : "You answered " + answered + " of " + total + " (" + correct + " correct). Finish the rest, then submit.";
    $("#quizReset").hidden = false;
  }

  function resetQuiz() {
    delete state.quiz[state.chapter];
    store.set(KEY.quiz, state.quiz);
    $("#quizResult").hidden = true;
    renderQuiz();
  }

  function toggleLab(id) {
    const map = state.lab[state.chapter] || (state.lab[state.chapter] = {});
    const def = labFor(state.chapter).find((t) => t.id === id);
    const current = map[id] !== undefined ? !!map[id] : !!(def && def.done);
    map[id] = !current;
    store.set(KEY.lab, state.lab);
    renderLab();
  }

  /* ---------------------------------------------------------------- drawers */

  function openDrawer(side) {
    document.body.classList.toggle(side + "-open");
    syncScrim();
  }
  function closeDrawers() {
    document.body.classList.remove("left-open", "right-open");
    syncScrim();
  }
  function syncScrim() {
    const any = document.body.classList.contains("left-open") || document.body.classList.contains("right-open");
    $("#scrim").hidden = !any;
  }

  /* ---------------------------------------------------------------- search */

  function index() {
    const rows = [];
    flat().forEach((c) => rows.push({ kind: "Chapter", label: TITLES[c.id], sub: "p." + c.page, chapter: c.id }));
    COMMANDS.forEach((c) => rows.push({ kind: "Command", label: c.name, sub: c.desc, chapter: c.chapter }));
    return rows;
  }

  function runSearch(q) {
    const box = $("#searchResults");
    const query = q.trim().toLowerCase();
    if (!query) { mount(box); box.hidden = true; return; }
    const hits = index().filter((r) =>
      r.label.toLowerCase().includes(query) || (r.sub || "").toLowerCase().includes(query)
    ).slice(0, 8);
    if (!hits.length) {
      mount(box, h("div.searchres__empty", "No matches for \u201c" + q + "\u201d"));
      box.hidden = false;
      return;
    }
    mount(box, hits.map((r) => h("button.searchres__item", { dataset: { chapter: r.chapter } },
      h("span.tag", r.kind),
      h("span.lbl", r.label),
      h("span.pg", r.sub),
    )));
    box.hidden = false;
  }

  function hideSearch() { const b = $("#searchResults"); mount(b); b.hidden = true; }

  /* ---------------------------------------------------------------- events */

  function wire() {
    document.addEventListener("click", (e) => {
      const chap = e.target.closest("[data-chapter]");
      if (chap) { selectChapter(chap.getAttribute("data-chapter")); hideSearch(); return; }

      const tog = e.target.closest("[data-toggle]");
      if (tog) { toggleModule(tog.getAttribute("data-toggle")); return; }

      if (e.target.closest("#themeToggle")) { setTheme(state.theme === "dark" ? "light" : "dark"); return; }
      if (e.target.closest("#openLeft")) { openDrawer("left"); return; }
      if (e.target.closest("#openRight")) { openDrawer("right"); return; }
      if (e.target.closest("#scrim")) { closeDrawers(); return; }
      if (e.target.closest("#quizSubmit")) { submitQuiz(); return; }
      if (e.target.closest("#quizReset")) { resetQuiz(); return; }
      if (!e.target.closest(".globalsearch") && !e.target.closest("#searchResults")) hideSearch();
    });

    document.addEventListener("change", (e) => {
      const q = e.target.closest("input[data-q]");
      if (q) { answer(Number(q.dataset.q), Number(q.dataset.o)); return; }
      const lab = e.target.closest("input[data-lab]");
      if (lab) { toggleLab(lab.dataset.lab); return; }
    });

    const input = $("#globalSearch");
    input.addEventListener("input", () => runSearch(input.value));
    input.addEventListener("focus", () => { if (input.value.trim()) runSearch(input.value); });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault(); input.focus(); input.select();
      }
      if (e.key === "Escape") { hideSearch(); closeDrawers(); if (document.activeElement === input) input.blur(); }
    });
  }

  /* ---------------------------------------------------------------- boot */

  function init() {
    setTheme(state.theme);
    if (!BLOCKS[state.chapter]) state.chapter = "osi";
    renderTree();
    renderBook();
    renderDoc();
    renderQuiz();
    renderLab();
    renderQuick();
    wire();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
