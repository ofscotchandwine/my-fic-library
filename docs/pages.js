
/* pages.js - Currently Reading, My Favorites, Reading History, Statistics, Sync */
(function () {
  "use strict";
  var C = window.Cards, S = window.State, FICS = window.FICS || [];
  var page = document.body.dataset.page;
  function $(id) { return document.getElementById(id); }

  function records(filter) {
    var map = C.bySlug(), all = S.all(), out = [];
    Object.keys(all).forEach(function (slug) {
      var r = all[slug];
      if (filter(r)) out.push({ slug: slug, f: map[slug] || null, r: r });
    });
    return out;
  }
  function fill(listId, emptyId, items, make) {
    var list = $(listId);
    list.textContent = "";
    items.forEach(function (it) { list.appendChild(make(it)); });
    $(emptyId).hidden = items.length > 0;
  }
  function where(f, r) {
    return "Chapter " + Math.min((r.ch || 0) + 1, f.nch) + " of " + f.nch;
  }

  /* ---------- Currently Reading ---------- */
  function readingPage() {
    function draw() {
      var items = records(function (r) { return r.status === "reading"; })
        .filter(function (i) { return i.f; })
        .sort(function (a, b) { return (b.r.lr || 0) - (a.r.lr || 0); });
      fill("list", "empty", items, function (it) {
        return C.card(it.f, {
          noSummary: true,
          extra: function (li, f, r) {
            var ex = C.el("div", "extra");
            var g = C.el("div", "grow");
            g.appendChild(C.el("div", null, where(f, r) + (r.lr ? " · last read " + C.fmtDate(r.lr) : "")));
            var m = C.el("div", "meter"); var bar = C.el("i");
            bar.style.width = Math.round(C.progress(f, r).frac * 100) + "%";
            m.appendChild(bar); g.appendChild(m);
            ex.appendChild(g);
            var rm = C.el("button", "rm");
            rm.type = "button";
            rm.title = "Remove from Currently Reading";
            rm.setAttribute("aria-label", "Remove from Currently Reading");
            rm.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"></path></svg>';
            rm.addEventListener("click", function () { S.set(f.slug, { status: "unread" }); draw(); });
            ex.appendChild(rm);
            li.appendChild(ex);
          }
        });
      });
    }
    draw();
    S.on(function (k) { if (k === "remote") draw(); });
  }

  /* ---------- My Favorites (the kudos page) ---------- */
  function favoritesPage() {
    function draw() {
      var items = records(function (r) { return !!r.kudos; })
        .sort(function (a, b) { return b.r.kudos - a.r.kudos; });
      var remove = function (slug) {
        return function (li) {
          var ex = C.el("div", "extra");
          var b = C.el("button", null, "Remove from favorites");
          b.type = "button";
          b.addEventListener("click", function () { S.set(slug, { kudos: 0 }); draw(); });
          ex.appendChild(b);
          li.appendChild(ex);
        };
      };
      fill("list", "empty", items, function (it) {
        if (it.f) return C.card(it.f, { noSummary: false });
        return C.orphan(it.slug, it.r, { extra: remove(it.slug) });
      });
    }
    draw();
    S.on(function (k) { if (k === "remote" || k === "local") draw(); });
  }

  /* ---------- Reading History ---------- */
  function historyPage() {
    function draw() {
      var items = records(function (r) { return !!r.lr; })
        .filter(function (i) { return i.f; })
        .sort(function (a, b) { return b.r.lr - a.r.lr; });
      fill("list", "empty", items, function (it) {
        return C.card(it.f, {
          noSummary: true,
          extra: function (li, f, r) {
            var label = r.status === "finished" ? "Finished" : r.status === "reading" ? where(f, r) : "Opened";
            var ex = C.el("div", "extra", label + " · last read " + C.fmtDate(r.lr));
            li.appendChild(ex);
          }
        });
      });
    }
    draw();
    S.on(function (k) { if (k === "remote") draw(); });
  }

  /* ---------- Statistics ---------- */
  function statsPage() {
    function fmt(n) { return n.toLocaleString("en-US"); }
    function tile(n, l) {
      var d = C.el("div", "tile");
      d.appendChild(C.el("div", "n", n));
      d.appendChild(C.el("div", "l", l));
      return d;
    }
    function bars(listId, rows, max) {
      var ul = $(listId); ul.textContent = "";
      rows.forEach(function (row) {
        var li = C.el("li");
        li.appendChild(C.el("span", "bl", row[0]));
        var t = C.el("span", "bt"), i = C.el("i");
        i.style.width = (max ? Math.round(row[1] / max * 100) : 0) + "%";
        t.appendChild(i); li.appendChild(t);
        li.appendChild(C.el("span", "bv", fmt(row[1])));
        ul.appendChild(li);
      });
    }
    function ships(list) {
      var c = {};
      list.forEach(function (f) { if (f.relationships.length) c[f.relationships[0]] = (c[f.relationships[0]] || 0) + 1; });
      return Object.keys(c).map(function (k) { return [k, c[k]]; })
        .sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); }).slice(0, 8);
    }
    function draw() {
      var totalWords = 0, finished = [], reading = [], unread = 0;
      FICS.forEach(function (f) {
        totalWords += f.words || 0;
        var s = S.status(f.slug);
        if (s === "finished") finished.push(f); else if (s === "reading") reading.push(f); else unread++;
      });
      var wordsRead = finished.reduce(function (n, f) { return n + (f.words || 0); }, 0);
      var tiles = $("tiles"); tiles.textContent = "";
      tiles.appendChild(tile(fmt(FICS.length), "fics in the archive"));
      tiles.appendChild(tile(fmt(totalWords), "words in total"));
      tiles.appendChild(tile(fmt(finished.length), "finished"));
      tiles.appendChild(tile(fmt(wordsRead), "words read"));
      tiles.appendChild(tile(fmt(S.kudosCount()), "favorites"));

      var names = { GA: "General Audiences", T: "Teen And Up", M: "Mature", E: "Explicit", NR: "Not Rated" };
      var rc = { GA: 0, T: 0, M: 0, E: 0, NR: 0 };
      FICS.forEach(function (f) { rc[C.ratingCode(f.rating)]++; });
      var max = Math.max.apply(null, Object.keys(rc).map(function (k) { return rc[k]; }).concat([1]));
      bars("b-ratings", Object.keys(names).map(function (k) { return [names[k], rc[k]]; }), max);

      var mine = ships(finished.concat(reading));
      $("read-ships-empty").hidden = mine.length > 0;
      bars("b-ships-read", mine, mine.length ? mine[0][1] : 1);
      var lib = ships(FICS);
      bars("b-ships-lib", lib, lib.length ? lib[0][1] : 1);

      bars("b-status", [["Unread", unread], ["Reading", reading.length], ["Finished", finished.length]], Math.max(unread, reading.length, finished.length, 1));
    }
    draw();
    S.on(function (k) { if (k === "remote") draw(); });
  }

  /* ---------- Sync ---------- */
  function syncPage() {
    function msg(id, text, kind) { var m = $(id); m.textContent = text || ""; m.className = "msg" + (kind ? " " + kind : ""); }
    function status() {
      var i = S.syncInfo(), line;
      if (!i.configured) line = "Not connected. Your favorites and progress are only saved on this device.";
      else if (i.busy) line = "Syncing…";
      else if (i.error) line = i.error;
      else line = "Connected. Last synced " + (i.last ? C.fmtDate(i.last) + ", " + new Date(i.last).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "just now") + ".";
      msg("sync-status", line, i.error ? "err" : i.configured ? "ok" : "");
      $("connect-box").hidden = i.configured;
      $("connected-box").hidden = !i.configured;
    }
    status();
    S.on(function (k) { if (k === "sync") status(); });

    $("connect").addEventListener("click", function () {
      var btn = this; btn.disabled = true; msg("connect-msg", "Connecting…");
      S.connect($("token").value).then(function () {
        $("token").value = ""; msg("connect-msg", ""); status();
      }, function (e) { msg("connect-msg", e.message, "err"); }).then(function () { btn.disabled = false; });
    });
    $("sync-now").addEventListener("click", function () { S.syncNow(); });
    $("disconnect").addEventListener("click", function () { S.disconnect(); status(); });

    $("make-code").addEventListener("click", function () {
      var t = $("code-out"); t.value = S.exportCode(); t.hidden = false; t.select();
      var done = function (ok) { msg("code-msg", ok ? "Code copied. Paste it on your other device." : "Copy the code above and paste it on your other device.", "ok"); };
      try { navigator.clipboard.writeText(t.value).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
    });
    $("use-code").addEventListener("click", function () {
      try {
        S.importCode($("code-in").value);
        $("code-in").value = ""; msg("code-msg", "Done. This device now has the combined list.", "ok");
      } catch (e) { msg("code-msg", e.message, "err"); }
    });
  }

  if (!S) return;
  if (page === "reading") readingPage();
  else if (page === "favorites") favoritesPage();
  else if (page === "history") historyPage();
  else if (page === "stats") statsPage();
  else if (page === "sync") syncPage();
})();
