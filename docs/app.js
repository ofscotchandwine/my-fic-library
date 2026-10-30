
(function () {
  var FICS = window.FICS || [];
  var PAGE = 40;
  var DEFAULT_DIR = { updated: "desc", words: "desc", title: "asc", author: "asc" };
  var state = { q: "", rating: "", status: "", fandom: "", sort: "updated", dir: "desc", tags: [], shown: PAGE };

  FICS.forEach(function (f) {
    f._hay = [f.title, f.author, f.fandoms.join(" "), f.relationships.join(" "),
              f.characters.join(" "), f.tags.join(" "), f.summary].join(" ").toLowerCase();
  });

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function ratingClass(r) {
    return "r-" + (r || "").toLowerCase().replace(/[^a-z]/g, "").replace(/^teenandupaudiences$/, "teen").replace(/^generalaudiences$/, "general");
  }
  function fmtWords(n) {
    return (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n)) + " words";
  }

  // Fill the dropdowns
  function fillSelect(id, values, firstLabel) {
    var s = $(id);
    s.appendChild(new Option(firstLabel, ""));
    values.forEach(function (v) { s.appendChild(new Option(v, v)); });
  }
  function countBy(getter) {
    var c = {};
    FICS.forEach(function (f) { getter(f).forEach(function (v) { if (v) c[v] = (c[v] || 0) + 1; }); });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b); });
  }
  var allFandoms = countBy(function (f) { return f.fandoms; });
  var multiFandom = allFandoms.length > 1;
  fillSelect("rating", countBy(function (f) { return [f.rating]; }), "Any rating");
  fillSelect("status", ["Complete", "In progress"], "Any status");
  fillSelect("fandom", allFandoms, "Any fandom");
  $("fandom").hidden = !multiFandom;

  function matches(f) {
    if (state.rating && f.rating !== state.rating) return false;
    if (state.status && f.status !== state.status) return false;
    if (state.fandom && f.fandoms.indexOf(state.fandom) === -1) return false;
    for (var i = 0; i < state.tags.length; i++) {
      var t = state.tags[i];
      if (f.tags.indexOf(t) === -1 && f.relationships.indexOf(t) === -1 && f.characters.indexOf(t) === -1) return false;
    }
    if (state.q) {
      var words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      for (var j = 0; j < words.length; j++) if (f._hay.indexOf(words[j]) === -1) return false;
    }
    return true;
  }

  function sorted(list) {
    var out = list.slice();
    var s = state.sort;
    var cmp;
    if (s === "title") cmp = function (a, b) { return a.title.localeCompare(b.title); };
    else if (s === "author") cmp = function (a, b) { return a.author.localeCompare(b.author) || a.title.localeCompare(b.title); };
    else if (s === "words") cmp = function (a, b) { return a.words - b.words; };
    else cmp = function (a, b) { return (a.updated || "").localeCompare(b.updated || ""); };
    out.sort(function (a, b) { return (state.dir === "desc" ? -1 : 1) * cmp(a, b); });
    return out;
  }

  function tagButton(label, cls) {
    var b = el("button", "pill" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.title = "Filter by this tag";
    b.addEventListener("click", function () {
      if (state.tags.indexOf(label) === -1) state.tags.push(label);
      state.shown = PAGE;
      render();
      window.scrollTo(0, 0);
    });
    var li = el("li");
    li.appendChild(b);
    return li;
  }

  function card(f) {
    var li = el("li", "work");
    var h = el("h3");
    var a = el("a", null, f.title);
    a.href = "fic/" + f.slug + ".html";
    h.appendChild(a);
    li.appendChild(h);
    li.appendChild(el("div", "by", "by " + f.author));
    if (multiFandom && f.fandoms.length) li.appendChild(el("div", "fandom", f.fandoms.join(", ")));

    // Row 1: main relationship, rating, status, length
    var top = el("ul", "pills");
    if (f.relationships.length) top.appendChild(tagButton(f.relationships[0], "rel"));
    if (f.rating) { var r = el("li"); r.appendChild(el("span", "pill " + ratingClass(f.rating), f.rating)); top.appendChild(r); }
    if (f.status && f.status !== "Unknown") {
      var st = el("li");
      st.appendChild(el("span", "pill" + (f.status === "Complete" ? " complete" : ""), f.status));
      top.appendChild(st);
    }
    if (f.words) {
      var w = el("li");
      var wp = el("span", "pill", fmtWords(f.words));
      var tip = [];
      if (f.chapters) tip.push("Chapters: " + f.chapters);
      if (f.updated) tip.push("Updated: " + f.updated);
      wp.title = tip.join("  \u2022  ");
      w.appendChild(wp);
      top.appendChild(w);
    }
    li.appendChild(top);

    // Row 2: other relationships + tags
    var rest = f.relationships.slice(1, 3).concat(f.tags.slice(0, 8));
    var hidden = f.relationships.length - 1 + f.tags.length - rest.length;
    if (rest.length || hidden > 0) {
      var tags = el("ul", "pills");
      rest.forEach(function (t) { tags.appendChild(tagButton(t)); });
      if (hidden > 0) tags.appendChild(el("li", "more", "+" + hidden + " more tags on the fic page"));
      li.appendChild(tags);
    }

    if (f.summary) {
      var s = f.summary.length > 320 ? f.summary.slice(0, 320).replace(/\s+\S*$/, "") + "\u2026" : f.summary;
      li.appendChild(el("p", "summary", s));
    }
    return li;
  }

  var current = [];
  var sortButtons = Array.prototype.slice.call(document.querySelectorAll("#sortbar button[data-sort]"));

  function render() {
    current = sorted(FICS.filter(matches));
    var list = $("works");
    list.textContent = "";
    current.slice(0, state.shown).forEach(function (f) { list.appendChild(card(f)); });
    $("count").textContent = "Showing " + Math.min(state.shown, current.length) + " of " + current.length +
      (current.length === FICS.length ? " fics" : " matching fics (" + FICS.length + " in total)");
    $("more").hidden = current.length <= state.shown;
    $("empty").hidden = current.length > 0;

    sortButtons.forEach(function (b) {
      var on = b.dataset.sort === state.sort;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.textContent = b.dataset.label + (on ? (state.dir === "desc" ? " \u2193" : " \u2191") : "");
    });

    var box = $("active-tags");
    box.textContent = "";
    state.tags.forEach(function (t) {
      var b = el("button", "pill", t + "  \u00d7");
      b.type = "button";
      b.title = "Remove this filter";
      b.addEventListener("click", function () {
        state.tags.splice(state.tags.indexOf(t), 1);
        state.shown = PAGE;
        render();
      });
      box.appendChild(b);
    });
  }

  function bind(id, key, evt) {
    $(id).addEventListener(evt || "change", function (e) {
      state[key] = e.target.value;
      state.shown = PAGE;
      render();
    });
  }
  bind("q", "q", "input");
  bind("rating", "rating");
  bind("status", "status");
  bind("fandom", "fandom");

  sortButtons.forEach(function (b) {
    b.addEventListener("click", function () {
      var key = b.dataset.sort;
      if (state.sort === key) state.dir = state.dir === "desc" ? "asc" : "desc";
      else { state.sort = key; state.dir = DEFAULT_DIR[key]; }
      state.shown = PAGE;
      render();
    });
  });

  $("more").addEventListener("click", function () { state.shown += PAGE; render(); });
  $("clear").addEventListener("click", function () {
    state.q = ""; state.rating = ""; state.status = ""; state.fandom = ""; state.tags = []; state.shown = PAGE;
    $("q").value = ""; $("rating").value = ""; $("status").value = ""; $("fandom").value = "";
    render();
  });
  $("random").addEventListener("click", function () {
    if (!current.length) return;
    window.location.href = "fic/" + current[Math.floor(Math.random() * current.length)].slug + ".html";
  });

  render();
})();
