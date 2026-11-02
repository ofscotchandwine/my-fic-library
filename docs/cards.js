
/* cards.js - the fic "box" used on every list page */
(function () {
  "use strict";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var RATING_CODES = {
    "General Audiences": "GA", "Teen And Up Audiences": "T", "Mature": "M", "Explicit": "E", "Not Rated": "NR"
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function ratingClass(r) {
    return "r-" + (r || "").toLowerCase().replace(/[^a-z]/g, "").replace(/^teenandupaudiences$/, "teen").replace(/^generalaudiences$/, "general");
  }
  function ratingCode(r) { return RATING_CODES[r] || "NR"; }
  function fmtWords(n) {
    return (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n)) + " words";
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    return MONTHS[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  }
  function bySlug() {
    var m = {};
    (window.FICS || []).forEach(function (f) { m[f.slug] = f; });
    return m;
  }
  // how many chapters are behind you (0 .. nch)
  function progress(f, rec) {
    rec = rec || {};
    var n = f.nch || 1;
    var done = (rec.done || []).length;
    var before = rec.ch || 0;
    var count = Math.min(n, Math.max(done, before));
    if (rec.status === "finished") count = n;
    return { count: count, total: n, frac: count / n };
  }

  function card(f, opts) {
    opts = opts || {};
    var rec = (window.State && window.State.get(f.slug)) || {};
    var hasHeart = !!rec.kudos, hasTick = rec.status === "finished";
    var li = el("li", "work" + (hasHeart || hasTick ? " has-mark" : ""));

    if (hasHeart || hasTick) {
      var mark = el("div", "mark");
      if (hasTick) { var t = el("span", "tick", "✓"); t.title = "Finished"; mark.appendChild(t); }
      if (hasHeart) { var h = el("span", "heart", "♥︎"); h.title = "Kudos given"; mark.appendChild(h); }
      li.appendChild(mark);
    }

    var h3 = el("h3");
    var a = el("a", null, f.title);
    a.href = "fic/" + f.slug + ".html";
    h3.appendChild(a);
    li.appendChild(h3);
    var by = el("div", "by", "by ");
    f.author.split(/,\s*/).forEach(function (name, i) {
      if (i) by.appendChild(document.createTextNode(", "));
      var al = el("a", "author", name);
      al.href = "index.html?author=" + encodeURIComponent(name);
      al.title = "All fics by " + name;
      by.appendChild(al);
    });
    li.appendChild(by);
    (f.series || []).forEach(function (s) {
      var sl = el("div", "by series", s.part ? "Part " + s.part + " of " : "Series: ");
      var sa = el("a", "author", s.name);
      sa.href = "index.html?series=" + encodeURIComponent(s.name);
      sa.title = "All fics in " + s.name;
      sl.appendChild(sa);
      li.appendChild(sl);
    });
    if (opts.showFandom && f.fandoms.length) li.appendChild(el("div", "fandom", f.fandoms.join(", ")));

    var top = el("ul", "pills");
    function add(list, node) { var i = el("li"); i.appendChild(node); list.appendChild(i); }
    if (f.relationships.length) add(top, el("span", "pill rel", f.relationships[0]));
    if (f.rating) add(top, el("span", "pill " + ratingClass(f.rating), f.rating));
    if (f.status && f.status !== "Unknown") add(top, el("span", "pill" + (f.status === "Complete" ? " complete" : ""), f.status));
    if (f.words) {
      var wp = el("span", "pill", fmtWords(f.words));
      var tip = [];
      if (f.chapters) tip.push("Chapters: " + f.chapters);
      if (f.updated) tip.push("Updated: " + f.updated);
      wp.title = tip.join("  •  ");
      add(top, wp);
    }
    li.appendChild(top);

    // only a few tags on the list; the rest are on the fic page
    var SHOW = 3;
    var tags = f.tags.slice(0, SHOW);
    var hidden = f.tags.length - tags.length + Math.max(0, f.relationships.length - 1);
    if (tags.length || hidden > 0) {
      var row = el("ul", "pills");
      tags.forEach(function (t2) { add(row, el("span", "pill", t2)); });
      if (hidden > 0) row.appendChild(el("li", "more", "+" + hidden + " more"));
      li.appendChild(row);
    }

    if (f.summary && !opts.noSummary) {
      var s = f.summary.length > 280 ? f.summary.slice(0, 280).replace(/\s+\S*$/, "") + "…" : f.summary;
      li.appendChild(el("p", "summary", s));
    }
    if (opts.extra) opts.extra(li, f, rec);
    return li;
  }

  // a favourite whose fic is no longer in the library
  function orphan(slug, rec, opts) {
    var li = el("li", "work has-mark");
    var mark = el("div", "mark");
    mark.appendChild(el("span", "heart", "♥︎"));
    li.appendChild(mark);
    var h3 = el("h3");
    if (rec.url) {
      var a = el("a", null, rec.ti || slug);
      a.href = rec.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      h3.appendChild(a);
    } else h3.textContent = rec.ti || slug;
    li.appendChild(h3);
    if (rec.au) li.appendChild(el("div", "by", "by " + rec.au));
    li.appendChild(el("div", "by", "Not in the library any more"));
    if (opts && opts.extra) opts.extra(li, null, rec);
    return li;
  }

  window.Cards = {
    el: el, card: card, orphan: orphan, ratingClass: ratingClass, ratingCode: ratingCode,
    fmtWords: fmtWords, fmtDate: fmtDate, bySlug: bySlug, progress: progress
  };
})();
