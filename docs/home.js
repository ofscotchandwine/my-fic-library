
/* home.js - the landing page: Continue reading + a few shelves */
(function () {
  "use strict";
  var FICS = window.FICS || [];
  var C = window.Cards, S = window.State;
  function $(id) { return document.getElementById(id); }
  function readStatus(f) { return (S && S.status(f.slug)) || "unread"; }

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
    if (cur.r.status !== "finished") {
      var pr = C.progress(cur.f, cur.r), mt = C.el("div", "meter"), fill = C.el("i");
      fill.style.width = Math.round(pr.frac * 100) + "%";
      mt.appendChild(fill); text.appendChild(mt);
    }
    box.appendChild(text);
    var go = C.el("a", "c-go", cur.r.status === "finished" ? "Open \u2192" : "Continue \u2192");
    go.href = "fic/" + cur.f.slug + ".html";
    box.appendChild(go);
    box.hidden = false;
  }

  /* ---------- shelves (only when nothing is filtered) ---------- */
  var picks = null;
  function mini(f) {
    var rec = (S && S.get(f.slug)) || {};
    var a = C.el("a", "mini" + (rec.lr ? " opened" : ""));
    a.href = "fic/" + f.slug + ".html";
    a.appendChild(C.el("span", "m-title", f.title));
    a.appendChild(C.el("span", "m-by", "by " + f.author));
    var meta = C.el("span", "m-meta");
    if (f.status === "Complete" || f.status === "In progress") {
      meta.appendChild(C.el("span", f.status === "Complete" ? "complete" : "progress", f.status));
      meta.appendChild(document.createTextNode(" \u00b7 "));
    }
    meta.appendChild(document.createTextNode(C.fmtWords(f.words || 0)));
    if (rec.kudos) { meta.appendChild(document.createTextNode(" ")); meta.appendChild(C.el("span", "m-heart", "\u2665\uFE0E")); }
    a.appendChild(meta);
    return a;
  }
  function shelf(title, list) {
    var sec = C.el("section", "shelf");
    sec.appendChild(C.el("h2", null, title));
    var row = C.el("div", "shelf-row");
    list.forEach(function (f) { row.appendChild(mini(f)); });
    sec.appendChild(row);
    return sec;
  }

  function renderShelves() {
    var box = $("shelves");
    box.textContent = "";
    var map = C.bySlug();
    if (!picks) {   // a fresh handful each visit, kept steady while you use the page
      var unread = FICS.filter(function (f) { return readStatus(f) === "unread"; });
      for (var i = unread.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = unread[i]; unread[i] = unread[j]; unread[j] = t; }
      picks = unread.slice(0, 10).map(function (f) { return f.slug; });
    }
    var fresh = picks.map(function (sl) { return map[sl]; }).filter(function (f) { return f && readStatus(f) === "unread"; });
    var favs = FICS.filter(function (f) { return S && S.get(f.slug) && S.get(f.slug).kudos; })
      .sort(function (a, b) { return S.get(b.slug).kudos - S.get(a.slug).kudos; }).slice(0, 12);
    if (fresh.length >= 2) box.appendChild(shelf("Something new to read", fresh));
    if (favs.length) box.appendChild(shelf("Your favorites", favs));
    box.hidden = !box.firstChild;
  }

  function draw() {
    renderContinue();
    renderShelves();
    var any = !$("continue").hidden || !$("shelves").hidden;
    $("home-empty").hidden = any;
  }
  if (S) S.on(function (kind) { if (kind === "remote") draw(); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) draw(); });
  draw();
})();
