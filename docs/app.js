
(function () {
  var FICS = window.FICS || [];
  var PAGE = 40;
  var state = { q: "", rating: "", status: "", fandom: "", sort: "updated", tags: [], shown: PAGE };
  var shuffled = null;

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
  fillSelect("rating", countBy(function (f) { return [f.rating]; }), "Any rating");
  fillSelect("status", ["Complete", "In progress"], "Any status");
  fillSelect("fandom", countBy(function (f) { return f.fandoms; }), "Any fandom");

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
    if (s === "title") out.sort(function (a, b) { return a.title.localeCompare(b.title); });
    else if (s === "author") out.sort(function (a, b) { return a.author.localeCompare(b.author) || a.title.localeCompare(b.title); });
    else if (s === "words") out.sort(function (a, b) { return b.words - a.words; });
    else if (s === "words-asc") out.sort(function (a, b) { return a.words - b.words; });
    else if (s === "random") {
      if (!shuffled) {
        shuffled = {};
        FICS.forEach(function (f) { shuffled[f.slug] = Math.random(); });
      }
      out.sort(function (a, b) { return shuffled[a.slug] - shuffled[b.slug]; });
    } else out.sort(function (a, b) { return (b.updated || "").localeCompare(a.updated || ""); });
    return out;
  }

  function tagButton(label) {
    var b = el("button", null, label);
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
    var li = el("li", "work " + ratingClass(f.rating));
    var h = el("h3");
    var a = el("a", null, f.title);
    a.href = "fic/" + f.slug + ".html";
    h.appendChild(a);
    h.appendChild(el("span", "by", " by " + f.author));
    li.appendChild(h);
    if (f.fandoms.length) li.appendChild(el("div", "fandom", f.fandoms.join(", ")));
    li.appendChild(el("div", "badges", [f.rating, f.status].filter(Boolean).join(" \u2022 ")));

    var tags = el("ul", "tags");
    var all = f.relationships.slice(0, 3).concat(f.tags.slice(0, 8));
    all.forEach(function (t) { tags.appendChild(tagButton(t)); });
    var hidden = f.relationships.length + f.tags.length - all.length;
    if (hidden > 0) tags.appendChild(el("li", "more", "+" + hidden + " more tags on the fic page"));
    li.appendChild(tags);

    if (f.summary) {
      var s = f.summary.length > 320 ? f.summary.slice(0, 320).replace(/\s+\S*$/, "") + "\u2026" : f.summary;
      li.appendChild(el("p", "summary", s));
    }
    var parts = [];
    if (f.words) parts.push("Words: " + f.words.toLocaleString());
    if (f.chapters) parts.push("Chapters: " + f.chapters);
    if (f.updated) parts.push("Updated: " + f.updated);
    li.appendChild(el("p", "stats", parts.join("  \u2022  ")));
    return li;
  }

  var current = [];

  function render() {
    current = sorted(FICS.filter(matches));
    var list = $("works");
    list.textContent = "";
    current.slice(0, state.shown).forEach(function (f) { list.appendChild(card(f)); });
    $("count").textContent = "Showing " + Math.min(state.shown, current.length) + " of " + current.length +
      (current.length === FICS.length ? " fics" : " matching fics (" + FICS.length + " in total)");
    $("more").hidden = current.length <= state.shown;
    $("empty").hidden = current.length > 0;

    var box = $("active-tags");
    box.textContent = "";
    state.tags.forEach(function (t) {
      var b = el("button", null, t + "  \u00d7");
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
  bind("sort", "sort");

  $("more").addEventListener("click", function () { state.shown += PAGE; render(); });
  $("clear").addEventListener("click", function () {
    state = { q: "", rating: "", status: "", fandom: "", sort: state.sort, tags: [], shown: PAGE };
    $("q").value = ""; $("rating").value = ""; $("status").value = ""; $("fandom").value = "";
    render();
  });
  $("random").addEventListener("click", function () {
    if (!current.length) return;
    window.location.href = "fic/" + current[Math.floor(Math.random() * current.length)].slug + ".html";
  });

  render();
})();
