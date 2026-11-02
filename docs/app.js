
/* app.js - The Library page */
(function () {
  "use strict";
  var FICS = window.FICS || [];
  var PAGE = 40;
  var SKEY = "archive.library.v1";
  var C = window.Cards, S = window.State;
  // "Default" is: date added, newest first
  var DEFAULT_DIR = { "default": "desc", added: "desc", updated: "desc", words: "desc", title: "asc", author: "asc" };
  var st = { q: "", ratings: [], statuses: [], reads: [], fandom: "", tag: "", author: "", series: "", sort: "default", dir: "desc", shown: PAGE };

  function $(id) { return document.getElementById(id); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  // remember filters/sort while you move between the list and a fic
  try {
    var saved = JSON.parse(ss(SKEY) || "null");
    if (saved) Object.keys(st).forEach(function (k) { if (k !== "shown" && saved[k] !== undefined) st[k] = saved[k]; });
  } catch (e) {}
  var param = /[?&]tag=([^&]*)/.exec(location.search);
  var aparam = /[?&]author=([^&]*)/.exec(location.search);
  var sparam = /[?&]series=([^&]*)/.exec(location.search);
  if (param || aparam || sparam) {
    st.tag = ""; st.author = ""; st.series = "";
    try {
      if (param) st.tag = decodeURIComponent(param[1].replace(/\+/g, " "));
      if (aparam) st.author = decodeURIComponent(aparam[1].replace(/\+/g, " "));
      if (sparam) st.series = decodeURIComponent(sparam[1].replace(/\+/g, " "));
    } catch (e) {}
    st.ratings = []; st.statuses = []; st.reads = []; st.fandom = ""; st.q = "";
    try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }

  FICS.forEach(function (f) {
    f._hay = [f.title, f.author, f.fandoms.join(" "), f.relationships.join(" "),
              f.characters.join(" "), f.tags.join(" "), f.summary, (f.series || []).map(function (s) { return s.name; }).join(" ")].join(" ").toLowerCase();
  });

  /* ---------- filter panel ---------- */
  var RATINGS = [["GA", "General Audiences"], ["T", "Teen And Up"], ["M", "Mature"], ["E", "Explicit"], ["NR", "Not Rated"]];
  var STATUSES = [["Complete", "Complete"], ["In progress", "In Progress"]];
  var READS = [["unread", "Unread"], ["reading", "Reading"], ["finished", "Finished"]];

  function fillPills(boxId, items, key) {
    var box = $(boxId);
    items.forEach(function (it) {
      var b = C.el("button", "pill", it[0] === it[1] || key !== "ratings" ? it[1] : it[0]);
      b.type = "button";
      b.dataset.value = it[0];
      if (key === "ratings") b.title = it[1];
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        var arr = st[key], i = arr.indexOf(it[0]);
        if (i === -1) arr.push(it[0]); else arr.splice(i, 1);
        st.shown = PAGE;
        render();
      });
      box.appendChild(b);
    });
  }
  fillPills("f-rating", RATINGS, "ratings");
  fillPills("f-status", STATUSES, "statuses");
  fillPills("f-read", READS, "reads");

  var fandomCount = {};
  FICS.forEach(function (f) { f.fandoms.forEach(function (v) { if (v) fandomCount[v] = (fandomCount[v] || 0) + 1; }); });
  var allFandoms = Object.keys(fandomCount).sort(function (a, b) { return fandomCount[b] - fandomCount[a] || a.localeCompare(b); });
  var multiFandom = allFandoms.length > 1;
  $("f-fandom-row").hidden = !multiFandom;
  $("fandom").appendChild(new Option("Any fandom", ""));
  allFandoms.forEach(function (v) { $("fandom").appendChild(new Option(v, v)); });

  $("filter-toggle").addEventListener("click", function () {
    var open = $("fpanel").hidden;
    $("fpanel").hidden = !open;
    this.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* ---------- matching + sorting ---------- */
  function readStatus(f) { return (S && S.status(f.slug)) || "unread"; }
  function matches(f) {
    if (st.ratings.length && st.ratings.indexOf(C.ratingCode(f.rating)) === -1) return false;
    if (st.statuses.length && st.statuses.indexOf(f.status) === -1) return false;
    if (st.reads.length && st.reads.indexOf(readStatus(f)) === -1) return false;
    if (st.fandom && f.fandoms.indexOf(st.fandom) === -1) return false;
    if (st.author && f.author.split(/,\s*/).indexOf(st.author) === -1) return false;
    if (st.series && !(f.series || []).some(function (s) { return s.name === st.series; })) return false;
    if (st.tag) {
      var t = st.tag;
      if (f.tags.indexOf(t) === -1 && f.relationships.indexOf(t) === -1 && f.characters.indexOf(t) === -1 && f.fandoms.indexOf(t) === -1) return false;
    }
    if (st.q) {
      var words = st.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var j = 0; j < words.length; j++) if (f._hay.indexOf(words[j]) === -1) return false;
    }
    return true;
  }
  function sorted(list) {
    var out = list.slice(), s = st.sort, cmp;
    if (s === "title") cmp = function (a, b) { return a.title.localeCompare(b.title); };
    else if (s === "author") cmp = function (a, b) { return a.author.localeCompare(b.author) || a.title.localeCompare(b.title); };
    else if (s === "words") cmp = function (a, b) { return a.words - b.words; };
    else if (s === "updated") cmp = function (a, b) { return (a.updated || "").localeCompare(b.updated || ""); };
    else cmp = function (a, b) { return (a.added || "").localeCompare(b.added || "") || a.title.localeCompare(b.title); };
    var dir = s === "default" ? "desc" : st.dir;
    if (st.series && s === "default") {   // inside a series: in reading order (Part 1, 2, 3...)
      var part = function (f) { var m = (f.series || []).filter(function (x) { return x.name === st.series; })[0]; return m ? m.part : 0; };
      out.sort(function (a, b) { return part(a) - part(b) || a.title.localeCompare(b.title); });
      return out;
    }
    out.sort(function (a, b) { return (dir === "desc" ? -1 : 1) * cmp(a, b); });
    return out;
  }

  /* ---------- continue reading ---------- */
  function renderContinue() {
    var box = $("continue");
    box.textContent = "";
    var recs = S ? S.all() : {}, map = C.bySlug(), list = [];
    Object.keys(recs).forEach(function (slug) {
      var r = recs[slug];
      if (map[slug] && r.lr && r.status !== "unread") list.push({ f: map[slug], r: r });
    });
    list.sort(function (a, b) { return b.r.lr - a.r.lr; });
    if (!list.length) { box.hidden = true; return; }
    var cur = list[0];   // the fic you opened last
    var text = C.el("div", "c-text");
    text.appendChild(C.el("div", "c-label", "Continue reading"));
    text.appendChild(C.el("div", "c-title", cur.f.title));
    var where = cur.r.status === "finished"
      ? "Finished \u00b7 last read " + C.fmtDate(cur.r.lr)
      : "Chapter " + (Math.min((cur.r.ch || 0) + 1, cur.f.nch)) + " of " + cur.f.nch + " \u00b7 last read " + C.fmtDate(cur.r.lr);
    text.appendChild(C.el("div", "c-where", where));
    box.appendChild(text);
    var go = C.el("a", "c-go", cur.r.status === "finished" ? "Open \u2192" : "Continue \u2192");
    go.href = "fic/" + cur.f.slug + ".html";
    box.appendChild(go);
    box.hidden = false;
  }

  /* ---------- drawing ---------- */
  var current = [];
  var sortButtons = Array.prototype.slice.call(document.querySelectorAll("#sortbar button[data-sort]"));

  function render() {
    current = sorted(FICS.filter(matches));
    var list = $("works");
    list.textContent = "";
    current.slice(0, st.shown).forEach(function (f) { list.appendChild(C.card(f, { showFandom: multiFandom })); });
    var shown = Math.min(st.shown, current.length);
    $("count").textContent = "Showing " + shown + " of " + current.length + " fics" +
      (current.length === FICS.length ? "" : " (" + FICS.length + " in the archive)");
    $("more").hidden = current.length <= st.shown;
    $("empty").hidden = current.length > 0;

    sortButtons.forEach(function (b) {
      var on = b.dataset.sort === st.sort;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      var arrow = on && b.dataset.sort !== "default" ? (st.dir === "desc" ? " ↓" : " ↑") : "";
      b.textContent = b.dataset.label + arrow;
    });
    ["f-rating", "f-status", "f-read"].forEach(function (id) {
      var key = id === "f-rating" ? "ratings" : id === "f-status" ? "statuses" : "reads";
      Array.prototype.forEach.call($(id).querySelectorAll("button"), function (b) {
        b.setAttribute("aria-pressed", st[key].indexOf(b.dataset.value) !== -1 ? "true" : "false");
      });
    });
    $("fandom").value = st.fandom;
    $("q").value = st.q;
    var n = st.ratings.length + st.statuses.length + st.reads.length + (st.fandom ? 1 : 0);
    $("filter-toggle").textContent = "Filter" + (n ? " (" + n + ")" : "");

    var box = $("active-tags");
    box.textContent = "";
    if (st.series) {
      var sb = C.el("button", "pill", "Series: " + st.series + "  \u00d7");
      sb.type = "button";
      sb.title = "Remove this series filter";
      sb.addEventListener("click", function () { st.series = ""; st.shown = PAGE; render(); });
      box.appendChild(sb);
    }
    if (st.author) {
      var ab = C.el("button", "pill", "by " + st.author + "  \u00d7");
      ab.type = "button";
      ab.title = "Remove this author filter";
      ab.addEventListener("click", function () { st.author = ""; st.shown = PAGE; render(); });
      box.appendChild(ab);
    }
    if (st.tag) {
      var b = C.el("button", "pill", st.tag + "  ×");
      b.type = "button";
      b.title = "Remove this tag filter";
      b.addEventListener("click", function () { st.tag = ""; st.shown = PAGE; render(); });
      box.appendChild(b);
    }
    ss(SKEY, JSON.stringify(st));
  }

  $("q").addEventListener("input", function (e) { st.q = e.target.value; st.shown = PAGE; render(); });
  $("fandom").addEventListener("change", function (e) { st.fandom = e.target.value; st.shown = PAGE; render(); });
  sortButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      var key = b.dataset.sort;
      if (key === "default") { st.sort = "default"; st.dir = "desc"; }
      else if (st.sort === key) st.dir = st.dir === "desc" ? "asc" : "desc";
      else { st.sort = key; st.dir = DEFAULT_DIR[key]; }
      st.shown = PAGE;
      render();
    });
  });
  $("more").addEventListener("click", function () { st.shown += PAGE; render(); });
  $("clear").addEventListener("click", function () {
    st.q = ""; st.ratings = []; st.statuses = []; st.reads = []; st.fandom = ""; st.tag = ""; st.author = ""; st.series = ""; st.shown = PAGE;
    render();
  });
  $("random").addEventListener("click", function () {
    if (!current.length) return;
    window.location.href = "fic/" + current[Math.floor(Math.random() * current.length)].slug + ".html";
  });

  if (S) S.on(function (kind) { if (kind === "remote") { renderContinue(); render(); } });
  // coming back with the browser's Back button: redraw with fresh marks
  window.addEventListener("pageshow", function (e) { if (e.persisted) { renderContinue(); render(); } });

  renderContinue();
  render();
})();
